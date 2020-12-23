import { EventEmitter, Readable } from 'stream';
import { LevelUp } from 'levelup';
import sub from 'subleveldown';

import { Selection, SelectionPartial, Value, Datum, WriteResult, DeepPartial, Stream } from '../types';
import { resolveValue, createQuery } from '../common/util';
import { expr } from '../common/static-datum';

import { LevelStream } from './stream';
import { createPromiseArrayIteratable, processStream, subdb } from './util';

export class LevelSelectionPartial<T = any> extends LevelStream<T> implements SelectionPartial<T> {

  private async getTable(): Promise<LevelUp> {
    return subdb(this.db, await resolveValue(this.tableName));
  }

  protected async getStream(): Promise<EventEmitter> {
    const tbl = await this.getTable();

    if(!this.keys)
      return subdb(tbl, 'primary').createReadStream();

    let keys = await resolveValue(this.keys);

    if(this.index != null) {
      keys = await Promise.all(keys.map<Promise<string[]>>(k => tbl.get('!index!!' + this.index + '!' + k)
        .catch((e: any) => { if(e.notFound) return []; else throw e; }))).then(res => [].concat(...res));
    }

    const pTable = subdb(tbl, 'primary');
    const data = keys.map(k => pTable.get(k).then(
      v => ({ key: k, value: v }),
      e => { if(e.notFound) return { key: k, value: null }; else throw e; }));
    return Readable.from(createPromiseArrayIteratable(data), { objectMode: true });
  }

  constructor(protected db: LevelUp, protected tableName: Value<string>,
    private keys?: Value<any[]>, private index?: Value<string>) {
    super();
  }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  delete(): Datum<WriteResult<T>> {
    const clone = this.fork() as LevelSelection<T>;

    return expr(createQuery<WriteResult<T>>(async() => {
      const keys = await clone.compile().then(data => data.map(e => e.key));
      const table = await clone.getTable();

      const ops: { type: 'del'; key: any }[] = keys.map(k => ({ type: 'del', key: k }));
      return table.batch(ops).then(
        () => ({ deleted: keys.length, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  fork(): Selection<T> {
    const clone = createSelection<T>(this.db, this.tableName, this.keys, this.index);
    (clone as any).__proto__.query = this.query.slice();
    (clone as any).__proto__.sel = this.sel;
    return clone as any;
  }
}

export interface LevelSelection<T = any> extends LevelSelectionPartial<T>, Selection<T> { }

export function createSelection<T = any>(db: LevelUp, tableName: Value<string>,
  keys?: Value<any[]>, index?: Value<string>): LevelSelection<T> {
  const instance = new LevelSelectionPartial<T>(db, tableName, keys, index);
  const o: Selection<T> = Object.assign(
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

      // QUERY/etc

      delete(): Datum<WriteResult<T>> { return instance.delete(); },

      fork(): Selection<T> { return instance.fork(); },
      run() { return instance.run(); }
    } as SelectionPartial<T>) as any;
  (o as any).__proto__ = instance;
  return o as any;
}
