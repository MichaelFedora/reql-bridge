import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { Client, PoolConfig } from 'pg';
import { createQuery } from '../common/util';
import { expr } from '../common/static-datum';
import { createTable } from './table';
import { WrappedPostgresDatabase, create as createWrappedPostgresDB } from './wrapper';
import { safen } from './util';

export class PostgresDatabase implements Database {

  private db: WrappedPostgresDatabase;

  private readonly typemapsType: readonly SchemaEntry[] = Object.freeze([
    { name: 'table', type: 'string' },
    { name: 'types', type: 'string' },
  ]);

  private readonly typemapsTableName = '__reql_typemap__';

  async init(options?: {  logger?: string, client?: Client } & PoolConfig) {
    options = Object.assign({ logger: 'pg' }, options);
    this.db = await createWrappedPostgresDB(Object.assign(options, { logger: options.logger + '.raw' }));

    const tableList = await this.tableList().run();
    if(!tableList.find(a => a === this.typemapsTableName)) {
      await this.tableCreate(this.typemapsTableName, this.typemapsType).run();
    }
  }

  private get typemaps() {
    return this.table<{ table: string, types: string }>(this.typemapsTableName);
  }

  readonly valueTypeMap = {
    string: 'text',
    bool: 'boolean',
    number: 'numeric',
    object: 'text', // yeeep
  };

  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult> {

    const indexes: string[] = [];

    let keys = '';
    for(const key of schema) {
      if(!keys) { // primary key
        keys = `${JSON.stringify(key.name)} ${this.valueTypeMap[key.type] || 'text'} primary key`;
      } else {
        keys += `, ${JSON.stringify(key.name)} ${this.valueTypeMap[key.type] || 'text'}`;
      }

      if(key.index)
        indexes.push(key.name);
    }

    if(keys.length === 0)
      throw new Error('Must have a schema of at least one entry!');

    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`CREATE TABLE IF NOT EXISTS ${JSON.stringify(tableName)} (${keys})`);
      await this.typemaps.insert({ table: tableName, types: JSON.stringify(schema) }, { conflict: 'replace' }).run();
      for(const index of indexes)
        await this.db.exec
          (`CREATE INDEX ${JSON.stringify(tableName + '_' + index)} ON ${JSON.stringify(tableName)}(${JSON.stringify(index)})`);

      return { tables_created: 1 } as TableChangeResult;
    }));
  }

  tableDrop(tableName: Value<string>): Datum<TableChangeResult> {
    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`DROP TABLE IF EXISTS ${JSON.stringify(tableName)}`);
      return { tables_dropped: 1 } as TableChangeResult;
    }));
  }

  tableList(): Datum<string[]> {
    return expr(createQuery(async () => {
      const result = await this.db.all<{
        name: string
      }>(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'`);
      return result.map(a => a.name);
    }));
  }

  table<T = any>(tableName: Value<string>): Table<T> {
    return createTable<T>(this.db, tableName, createQuery(async () =>
        tableName !== this.typemapsTableName
          ? await this.typemaps.get(tableName)('types').run().then(a => JSON.parse(a))
          : this.typemapsType));
  }

  async close() {
    return this.db.close();
  }
}

export async function create(options?: { logger?: string, client?: Client } & PoolConfig): Promise<Database> {
  const db = new PostgresDatabase();
  await db.init(options);
  return db;
}
export default create;
