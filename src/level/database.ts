import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { AbstractLevelDOWN } from 'abstract-leveldown';
import encodeLevel from 'encoding-down';
import * as sub from 'subleveldown';
import { createQuery } from '../common/util';
import { expr } from '../common/static-datum';
import { createTable } from './table';
import levelup, { LevelUp } from 'levelup';
import { processStream, subdb } from './util';

/*
Level tables work like so:

db.get({table}.__index_list__) => field[] -- first is primary
db.get({table}._index_.{index}) => key[]
db.get({table}._primary_.{key}) => value

db.put({table}._primary_.{key}, object)
indexes = db.get({table}.__index_list__);
for(i of indexes) {
  let old = db.get({table}._index_.{index}.{value})
  db.put({table}._index_.{index}.{value}, [...old, key])
}

db.del({table}._primary_.{key})
indexes = db.get({table}.__index_list__);
for(i of indexes) {
  let old = db.get({table}._index_.{index}.{value})
  db.put({table}._index_.{index}.{value}, old.filter(a => a !== key))
}
*/

export class LevelDatabase implements Database {

  private db: LevelUp;

  async init<DB extends AbstractLevelDOWN = AbstractLevelDOWN>(options?: {  logger?: string; store: DB; options?: any }) {
    options = Object.assign({ logger: 'level' }, options);
    this.db = levelup(encodeLevel(options.store, { keyEncoding: 'string', valueEncoding: 'json' }),
      options.options, err => { if(err) throw err; });

    const list = await this.db.get('__reql_table_list__').catch((e: any) => { if(e.notFound) return null; else throw e; });
    if(!list)
      await this.db.put('__reql_table_list__', []);
  }

  async dump() {
    console.log(await processStream(this.db.createReadStream()));
  }

  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult> {

    if(!schema.length)
      throw new Error('Must have a schema of at least one entry!');

    let indexes: string[] = schema.reduce((acc, c) => { if(c.index) acc.push(c.name); return acc; }, [] as string[]);
    if(!indexes.length)
      indexes = [schema[0].name];

    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
        tableName = await tableName.run();

      const tableList: string[] = await this.db.get('__reql_table_list__').catch((e: any) => { if(e.notFound) return null; else throw e; });
      if(tableList.includes(tableName))
        return { tables_created: 0 } as TableChangeResult;

      const table = subdb(this.db, tableName);

      await Promise.all([
        table.put('__index_list__', indexes),
        this.db.put('__reql_table_list__', [...tableList, tableName])
      ]);

      return { tables_created: 1 } as TableChangeResult;
    }));
  }

  tableDrop(tableName: Value<string>): Datum<TableChangeResult> {
    return expr(createQuery(async () => {
      if(typeof tableName !== 'string')
        tableName = await tableName.run();

      const tableList: string[] = await this.db.get('__reql_table_list__').catch((e: any) => { if(e.notFound) return null; else throw e; });
      if(!tableList.includes(tableName))
        return { tables_dropped: 0 } as TableChangeResult;

      await Promise.all([
        this.db.put('__reql_table_list__', tableList.filter(a => a !== tableName)),
        subdb(this.db, tableName).clear()
      ]);

      return { tables_dropped: 1 } as TableChangeResult;
    }));
  }

  tableList(): Datum<string[]> {
    return expr(createQuery(() => this.db.get('__reql_table_list__').catch((e: any) => { if(e.notFound) return null; else throw e; }) ));
  }

  table<T = any>(tableName: Value<string>): Table<T> {
    return createTable<T>(this.db, tableName);
  }

  async close() {
    return this.db.close();
  }
}

export async function create<DB extends AbstractLevelDOWN = AbstractLevelDOWN>(
  options: { logger?: string; store: DB; options?: any }): Promise<Database> {

  const db = new LevelDatabase();
  await db.init(options);
  return db;
}
export default create;
