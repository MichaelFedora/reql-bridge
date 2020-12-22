import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { RDatum, RStream } from 'rethinkdb-ts';
import { resolveValue, deepPartialToPredicate } from '../common/util';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';
import { createDatum } from './datum';
import { createQueryDatum, RethinkQueryDatum } from './query-datum';

export abstract class RethinkStream<T = any> implements StreamPartial<T>, SelectableStream<T> {

  protected query: QueryEntry[] = [];
  protected sel: Value<string | number>;

  protected abstract getStream(): Promise<RStream<T>>;

  constructor() { }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableStream<T[U]>
    : SelectableStream<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });

    return this as any;
  }

  count(): Datum<number> {
    return createDatum(this.compile().then(str => str.count()));
  };
  abstract fork(): Stream<T>;
  async run(): Promise<T[]> {
    const str = await this.compile();
    this.query = [];
    this.sel = '';
    return str.run();
  }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T> {
    this.query.push({ cmd: 'filter', params: [predicate] });
    return this as any;
  }

  map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U> {
    this.query.push({ cmd: 'map', params: [predicate] });
    return this as any;
  }

  distinct(): Stream<T> {
    if(!this.query.find(q => q.cmd === 'distinct'))
      this.query.push({ cmd: 'distinct' });
    return this as any;
  }

  limit(n: Value<number>): Stream<T> {
    let q = this.query.find(a => a.cmd === 'limit');

    if(!q) {
      q = { cmd: 'limit', params: [n] };
      this.query.push(q);

    } else {
      q.params[0] = n;
    }

    return this as any;
  }

  pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never {
    const q = this.query.find(a => a.cmd === 'pluck');
    if(q) {
      // override readonly
      (q as any).params = q.params.concat(fields.filter(a => !q.params.includes(a)));
    } else {
      this.query.push({ cmd: 'pluck', params: fields });
    }
    return this as any;
  }

  protected async compile(): Promise<RStream<any>> {
    let stream: RStream<any> | RDatum<any> = await this.getStream();
    const sel = await resolveValue(this.sel);
    if(!this.query.length && !this.sel)
      return stream;
    if(!this.query.length)
      return stream(sel as any);

    for(const q of this.query) {
      const params = [];
      for(const p of q.params)
        params.push(await resolveValue(p));

      console.log('query', q.cmd);

      switch(q.cmd) {
        case 'sel':
          stream = stream(params[0]);
          break;

        case 'filter':
          const pred: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>) = params[0];

          let predfoo: ((doc: Datum<T>) => Value<boolean>);
          if(typeof pred === 'function')
            predfoo = pred as ((doc: Datum<T>) => Value<boolean>);
          else if(typeof pred === 'object')
            predfoo = deepPartialToPredicate(pred);
          else
            predfoo = () => Boolean(pred);

          const filterQuery = predfoo(createQueryDatum<T>());
          if(typeof (filterQuery as any)['compile'] === 'function') {
            const exec = await (filterQuery as RethinkQueryDatum).compile();
            stream = stream.filter(exec);
          } else throw new Error('bad time ahead');
          break;
        case 'distinct':
          stream = stream.distinct();
          break;
        case 'pluck':
          stream = stream.pluck(...params);
          break;
        case 'limit':
          stream = stream.limit(params[0]);
          break;
        case 'map':
          const mapfoo: ((doc: Datum<T>) => any) = params[0];
          stream = stream.map(mapfoo as any);
          break;
      }
    }
    return stream;
  }
}
