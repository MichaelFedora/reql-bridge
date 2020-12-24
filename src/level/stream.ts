import { EventEmitter } from 'stream';

import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { resolveValue, deepPartialToPredicate, createQuery } from '../common/util';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';
import { ensureDatum, expr } from '../common/static-datum';

import { processStream } from './util';

export abstract class LevelStream<T = any> implements StreamPartial<T>, SelectableStream<T> {

  protected query: QueryEntry[] = [];
  protected sel: Value<string | number>;

  protected abstract getStream(): Promise<EventEmitter>;

  constructor() { }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableStream<T[U]>
    : SelectableStream<any> {

    this.sel = attribute;
    this.query.push({ cmd: 'sel', params: [attribute] });

    return this as any;
  }

  count(): Datum<number> {
    return expr(createQuery(() => this.run().then(res => res.length)));
  }

  abstract fork(): Stream<T>;

  async run(): Promise<T[]> {
    const res = await this.compile();
    this.query = [];
    this.sel = '';
    return res.map(v => v.value);
  }

  protected async compile(): Promise<{ key: string; value: T }[]> {
    const sel = await resolveValue(this.sel);
    if(!this.query.length && !this.sel)
      return processStream<T>(await this.getStream());
    if(!this.query.length)
      return processStream<T>(await this.getStream(), { type: 'transform', exec: (entry) => entry[sel]});

    const modifiers = [
      { type: 'test', exec: (entry) => entry != null },
      { type: 'transform', exec: (entry) => expr(entry) }
    ] as { type: 'test' | 'transform'; exec: (entry: Value<any>) => Value<any> }[];

    for(const q of this.query) {
      const params = [];
      for(const p of q.params)
        params.push(await resolveValue(p));

      switch(q.cmd) {
        case 'sel':
          modifiers.push({ type: 'transform', exec: (entry) => ensureDatum(entry)(q.params[0]) });
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

          modifiers.push({ type: 'test', exec: (entry) => predfoo(entry) });
          break;
        case 'distinct':
          const hash: string[] = [];
          modifiers.push({ type: 'test', exec: (entry) => !hash.includes(JSON.stringify(entry)) });
          break;
        case 'pluck':
          modifiers.push({ type: 'transform', exec: (entry) => {
            const obj = { };
            for(const key of params)
              obj[key] = entry[key];
            return obj;
          }});
          break;
        case 'limit':
          let count = 0;
          modifiers.push({ type: 'test', exec: () => count++ < params[0] });
          break;
        case 'map':
          const mapfoo: ((doc: Datum<T>) => any) = params[0];
          modifiers.push({ type: 'transform', exec: (entry) => mapfoo(ensureDatum(entry)) });
          break;
      }
    }
    return processStream<T>(await this.getStream(), ...modifiers);
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
}
