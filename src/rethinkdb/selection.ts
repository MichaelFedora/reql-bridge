import { Selection, SelectionPartial, Value, Datum, WriteResult, DeepPartial, Stream } from '../types';
import { RSelection } from 'rethinkdb-ts';;
import { RethinkStream } from './stream';
import { createDatum } from './datum';

export class RethinkSelectionPartial<T = any> extends RethinkStream<T> implements SelectionPartial<T> {

  private async getSelection(): Promise<RSelection<T>> {
    return await this.selection;
  }

  protected getStream() { return this.getSelection(); }

  constructor(protected selection: RSelection<T> | PromiseLike<RSelection<T>>) { super(); }

  fork(): Selection<T> {
    const clone = createSelection<T>(this.selection);
    (clone as any).__proto__.query = this.query.slice();
    return clone;
  }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  delete(): Datum<WriteResult<T>> {
    return createDatum((this.compile() as Promise<RSelection<any>>).then(sel => sel.delete()));
  }
}

export interface RethinkSelection<T = any> extends RethinkSelectionPartial<T>, Selection<T> { }

export function createSelection<T = any>(selection: RSelection<T> | PromiseLike<RSelection<T>>): RethinkSelection<T> {
  const instance = new RethinkSelectionPartial<T>(selection);
  const o: Selection<T> = Object.assign(
    (attribute: Value<string | number>) => { instance._sel(attribute); return o; /* override return */ },
    instance,
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
