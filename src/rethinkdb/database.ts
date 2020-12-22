import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { r, MasterPool, RDatabase, RPoolConnectionOptions } from 'rethinkdb-ts';
import { createQuery, resolveValue } from '../common/util';
import { expr } from '../common/static-datum';
import { createTable } from './table';
import { createDatum } from './datum';

export class RethinkDatabase implements Database {

  private pool: MasterPool;
  private db: RDatabase;

  async init(options: {  logger?: string; db: string } & RPoolConnectionOptions) {
    options = Object.assign({ logger: 'rethinkdb' }, options);
    this.pool = await r.connectPool(options);
    if(await r.dbList().contains(options.db).not().run())
      await r.dbCreate(options.db).run();

    this.db = r.db(options.db);
  }

  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult> {

    const indexes: string[] = [];

    for(const key of schema)
      if(key.index)
        indexes.push(key.name);

    if(schema.length === 0)
      throw new Error('Must have a schema of at least one entry!');

    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
        tableName = await tableName.run();
      await this.db.tableCreate(tableName, { primaryKey: indexes.length ? indexes[0] : schema[0].name }).run();
      for(const index of indexes.slice(1))
        await this.db.table(tableName).indexCreate(index).run();

      return { tables_created: 1 } as TableChangeResult;
    }));
  }

  tableDrop(tableName: Value<string>): Datum<TableChangeResult> {
    const res = resolveValue(tableName).then(tbl => this.db.tableDrop(tbl));
    return createDatum(res as any);
  }

  tableList(): Datum<string[]> {
    return createDatum(this.db.tableList());
  }

  table<T = any>(tableName: Value<string>): Table<T> {
    return createTable<T>(this.db, tableName);
  }

  async close() {
    return this.pool.drain();
  }
}

export async function create(options: { logger?: string; db: string } & RPoolConnectionOptions): Promise<Database> {
  const db = new RethinkDatabase();
  await db.init(options);
  return db;
}
export default create;
