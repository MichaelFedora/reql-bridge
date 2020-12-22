import {
  Table, TablePartial, IndexChangeResult,
  Value, Datum, SchemaEntry, DeepPartial, WriteResult,
  SingleSelection, Selection, Query, Stream
} from '../types';
import { createQuery, resolveValue, coerceCorrectReturn } from '../common/util';
import { RDatabase, RStream, RTable } from 'rethinkdb-ts';
import { RethinkStream } from './stream';
import { expr, exprQuery } from '../common/static-datum';
import { createSingleSelection } from './single-selection';
import { createSelection } from './selection';
import { createDatum } from './datum';

export class RethinkTablePartial<T = any> extends RethinkStream<T> implements TablePartial<T> {

  private async getTable(): Promise<RTable<T>> {
    return this.db.table(await resolveValue(this.tableName));
  }

  protected getStream() { return this.getTable(); }

  constructor(protected db: RDatabase, protected tableName: Value<string>) { super(); }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  fork(): never;
  fork() { // for fake Selection<T>
    const clone = createSelection(this.getTable());
    (clone as any).__proto__.query = this.query.slice();
    return clone;
  }

  delete(): Datum<WriteResult<T>> {
    return createDatum(this.getTable().then(tbl => tbl.delete()));
  }

  get(key: any): SingleSelection<T> {
    return createSingleSelection(this.getTable().then(tbl => tbl.get(key)));
  }

  getAll(key: any, options?: { index: string }): Selection<T>; // not editable
  getAll(key: any, key2: any, options?: { index: string }): Selection<T>;
  getAll(...key: (number | string | { index: string })[]): Selection<T>;
  getAll(...values: (string | { index: string })[]): Selection<T> {
    return createSelection(this.getTable().then(tbl => tbl.getAll(...values)));
  }

  insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
    return createDatum(this.getTable().then(tbl => options ? tbl.insert(obj, options) : tbl.insert(obj)));
  }

  indexCreate<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult>;
  // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult> {
    return createDatum(this.getTable().then(tbl => tbl.indexCreate(key)));
  }

  indexDrop<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  // indexDrop(name: Value<string>): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult> {
    return createDatum(this.getTable().then(tbl => tbl.indexDrop(key)));
  }

  indexList(): Datum<string[]> {
    return createDatum(this.getTable().then(tbl => tbl.indexList()));
  }
}

interface RethinkTable<T = any> extends RethinkTablePartial<T>, Table<T> { }

export function createTable<T = any>(db: RDatabase, tableName: Value<string>): RethinkTable<T> {
  const instance = new RethinkTablePartial<T>(db, tableName);
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
