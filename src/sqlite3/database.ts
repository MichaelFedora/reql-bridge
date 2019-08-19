import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { WrappedSQLite3Database, create as createSQLite3DB } from '../internal/sqlite3-wrapper';
import { createQuery } from '../internal/util';
import { expr } from '../common/static-datum';
import { createTable } from './table';

export class SQLite3ReQLDatabase implements Database {

  private db: WrappedSQLite3Database;

  private readonly typemapsType: readonly SchemaEntry[] = Object.freeze([
    { name: 'table', type: 'string' },
    { name: 'types', type: 'string' },
  ]);

  private readonly typemapsTableName = '__reql_typemap__';

  async init(options?: { filename?: string, logger?: string }) {
    options = Object.assign({ logger: 'sqlite3' }, options);
    this.db = await createSQLite3DB(Object.assign(options, { logger: options.logger + '.raw' }));

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
    bool: 'numeric', // yep
    number: 'numeric',
    object: 'text', // yeeep
  };

  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult> {

    const indexes: string[] = [];

    let keys = '';
    for(const key of schema) {
      if(!keys) { // primary key
        keys = `[${key.name}] ${this.valueTypeMap[key.type] || 'text'} primary key`;
      } else {
        keys += `, [${key.name}] ${this.valueTypeMap[key.type] || 'text'}`;
      }

      if(key.index)
        indexes.push(key.name);
    }

    if(keys.length === 0)
      throw new Error('Must have a schema of at least one entry!');

    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`CREATE TABLE IF NOT EXISTS [${tableName}] (${keys})`);
      await this.typemaps.insert({ table: tableName, types: JSON.stringify(schema) }, { conflict: 'replace' }).run();
      for(const index of indexes)
        await this.db.exec(`CREATE INDEX [${tableName}_${index}] ON [${tableName}]([${index}])`);

      return { tables_created: 1 } as TableChangeResult;
    }));
  }

  tableDrop(tableName: Value<string>): Datum<TableChangeResult> {
    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`DROP TABLE IF EXISTS [${tableName}]`);
      return { tables_dropped: 1 } as TableChangeResult;
    }));
  }

  tableList(): Datum<string[]> {
    return expr(createQuery(async () => {
      const result = await this.db.all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table'`);
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

export async function create(options?: { filename?: string, logger?: string }): Promise<Database> {
  const db = new SQLite3ReQLDatabase();
  await db.init(options);
  return db;
}
export default create;
