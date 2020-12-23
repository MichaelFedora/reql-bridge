import { EventEmitter } from 'stream';

import { LevelUp } from 'levelup';
import { v4 as uuidV4 } from 'uuid';

import {
  Table, TablePartial, IndexChangeResult,
  Value, Datum, DeepPartial, WriteResult,
  SingleSelection, Selection, Stream
} from '../types';

import { createQuery, resolveValue } from '../common/util';
import { expr } from '../common/static-datum';

import { processStream, subdb } from './util';
import { createSingleSelection } from './single-selection';
import { LevelStream } from './stream';
import { createSelection } from './selection';

export class LevelTablePartial<T = any> extends LevelStream<T> implements TablePartial<T> {

  constructor(protected db: LevelUp, protected tableName: Value<string>) { super(); }

  getStream(): Promise<EventEmitter> { return this.getTable().then(tbl => subdb(tbl, 'primary').createReadStream()); }

  async getTable(): Promise<LevelUp> {
    return subdb(this.db, await resolveValue(this.tableName));
  }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  fork(): never;
  fork() { // for fake Selection<T>
    const child = createSelection<T>(this.db, this.tableName);
    (child as any).__proto__.query = this.query.slice();
    (child as any).__proto__.sel = this.sel;
    return child;
  }

  delete(): Datum<WriteResult<T>> {
    return expr(createQuery<WriteResult<T>>(() => {
      return this.getTable().then(tbl => tbl.clear()).then(
        () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  get(key: any): SingleSelection<T> {
    return createSingleSelection(this.db, this.tableName, key);
  }

  getAll(key: any, options?: { index: string }): Selection<T>; // not editable
  getAll(key: any, key2: any, options?: { index: string }): Selection<T>;
  getAll(...key: (number | string | { index: string })[]): Selection<T>;
  getAll(...values: (number | string | { index: string })[]): Selection<T> {
    let index: Value<string>;
    if(values.length && typeof values[values.length - 1] === 'object')
      index = (values.pop() as { index: string }).index;

    return createSelection(this.db, this.tableName, values, index);
  }

  insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
    options = Object.assign({ conflict: 'replace' }, options);

    return expr(createQuery(async () => {
      const table = await this.getTable();
      const indexes: string[] = await table.get('__index_list__');
      const primaryKey = indexes.shift();
      let objKey = obj[primaryKey];
      const primaryTable = subdb(table, 'primary');

      if(!objKey) {
        do {
          objKey = uuidV4();
        } while(await primaryTable.get(objKey).catch((e: any) => { if(e.notFound) return null; else throw e; }));

      } else if(options.conflict !== 'replace') {
        const curr = await primaryTable.get(objKey).catch((e: any) => { if(e.notFound) return null; else throw e; });

        if(curr) {
          if(options.conflict === 'error')
            throw new Error('Object with primary key ' + objKey + ' already exists!');
          else
            obj = Object.assign({ }, curr, obj);
        }
      }

      const indexValues: string[][] = (await Promise.all(
        indexes.map(i => table.get(`!index!!${i}!${obj[i]}`).catch(e => { if(e.notFound) return []; else throw e; }))
      )).filter(ivs => !ivs.includes(objKey));

      const ops: { type: 'put'; key: string; value: any }[] = [
        { type: 'put', key: '!primary!' + objKey, value: obj },
        ...(indexValues.map((iv, i) => ({
          type: 'put',
          key: `!index!!${indexes[i]}!${obj[indexes[i]]}`,
          value: [...iv, objKey]
        } as { type: 'put'; key: any; value: string[] })))
      ];

      const ret: WriteResult<T> = await table.batch(ops).then(
        () => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      return ret;
    }));
  }

  indexCreate<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult>;
  // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult> {
    return expr(createQuery(async () => {
      const table = await this.getTable();
      const indexList: string[] = await table.get('__index_list__');
      if(indexList.includes(key))
        return { created: 0 } as IndexChangeResult;

      const indexValues: { key: string; value: any }[] = await processStream(subdb(table, 'primary').createReadStream(),
        { type: 'transform', exec: (entry) => ({ key: entry.key, value: entry.value[key] }) });

      const indexMap = new Map<any, string[]>();
      for(const iv of indexValues) {
        if(!indexMap.get(iv.value))
          indexMap.set(iv.value, [iv.key]);
        else
          indexMap.get(iv.value).push(iv.key);
      }

      const ops = [] as { type: 'put'; key: any; value: string[] }[];
      indexMap.forEach((v, k) => ops.push({ type: 'put', key: k, value: v }));

      await Promise.all([
        table.put('__index_list__', [...indexList, key]),
        subdb(table, 'index!!' + key).batch(ops)
      ]);
      return { dropped: 1 } as IndexChangeResult;
    }));
  }

  indexDrop<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  // indexDrop(name: Value<string>): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult> {
    return expr(createQuery(async () => {
      const table = await this.getTable();
      const indexList: string[] = await table.get('__index_list__');
      if(!indexList.includes(key))
        return { dropped: 0 } as IndexChangeResult;

      await Promise.all([
        table.put('__index_list__', indexList.filter(a => a !== key)),
        subdb(table, 'index!!' + key).clear()
      ]);
      return { dropped: 1 } as IndexChangeResult;
    }));
  }

  indexList(): Datum<string[]> {
    return expr(createQuery(() => this.getTable().then(tbl => tbl.get('__index_list__'))));
  }
}

interface LevelTable<T = any> extends LevelTablePartial<T>, Table<T> { }

export function createTable<T = any>(db: LevelUp, tableName: Value<string>): LevelTable<T> {
  const instance = new LevelTablePartial<T>(db, tableName);
  const o: Table<T> = Object.assign(
    (attribute: Value<string | number>) => { instance._sel(attribute); return o; /* override return */ },
    {
      // AGGREGATION

      distinct(): Stream<T> { instance.distinct(); return o as any; },
      limit(n: Value<number>): Stream<T> { instance.limit(n); return o as any; },

      // TRANSFORMS

      count(): Datum<number> { return instance.count(); },
      map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U> { instance.map(predicate); return o as any; },
      pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never { instance.pluck(...fields); return o as any; },
      filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
        instance.filter(predicate);
        return o as any;
      },

      delete(): Datum<WriteResult<T>> { return instance.delete(); },

      fork(): never { return instance.fork(); },
      run() { return instance.run(); },

      // TABLE

      get(key: any): SingleSelection<T> { return instance.get(key); },
      getAll(...key: (number | string | { index: string })[]): Selection<T> { return instance.getAll(...key); },

      // OPERATIONS

      insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
        return instance.insert(obj, options);
      }
    } as TablePartial<T>) as any;
  (o as any).__proto__ = instance;
  return o as any;
}
