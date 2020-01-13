import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { resolveValue, deepPartialToPredicate } from '../common/util';
import { createQueryDatum } from './query-datum';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';

export abstract class PostgresStream<T = any> implements StreamPartial<T>, SelectableStream<T> {

  protected query: QueryEntry[] = [];
  protected sel: Value<string | number>;

  constructor(protected db: WrappedPostgresDatabase, protected tableName: Value<string>) { }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableStream<T[U]>
    : SelectableStream<any> {

    if(!this.sel)
      this.sel = attribute;
    else
      this.query.push({ cmd: 'sel', params: [attribute] });

    return this as any;
  }

  abstract count(): Datum<number>;
  abstract fork(): Stream<T>;
  abstract async run(): Promise<T[]>;

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

  protected async computeQuery(): Promise<{ cmdsApplied: number, select?: string, post?: string, limit?: number, kill?: boolean }> {
    if(!this.query.length && !this.sel)
      return { cmdsApplied: 0, select: '*' };
    if(!this.query.length)
      return { cmdsApplied: 0, select: `${JSON.stringify(this.sel)}` };

    const tableName = await resolveValue(this.tableName);
    const primaryKey = await this.db.getPrimaryKey(tableName);

    let select = this.sel ? `${JSON.stringify(this.sel)}` : '*';
    let post = undefined;
    let limit = undefined;
    let cmdsApplied = 0;
    for(const q of this.query) {
      const params = [];
      for(const p of q.params)
        params.push(await resolveValue(p));

      switch(q.cmd) {
        case 'filter':
          const pred: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>) = params[0];

          let predfoo: ((doc: Datum<T>) => Value<boolean>);
          if(typeof pred === 'function')
            predfoo = pred as ((doc: Datum<T>) => Value<boolean>);
          else if(typeof pred === 'object')
            predfoo = deepPartialToPredicate(pred);
          else
            predfoo = () => Boolean(pred);

          const res = predfoo(createQueryDatum<T>());
          if(typeof (res as any)['compile'] === 'function') {
            const query = await (res as any).compile();

            if(!post)
              post = `${JSON.stringify(primaryKey)} in (SELECT ${JSON.stringify(primaryKey)}`
                + ` FROM ${JSON.stringify(tableName)} WHERE ${query})`;
            else
              post = post.slice(0, -1) + ` AND (${query}))`;

          } else if(!res) {
            return { cmdsApplied: 0, kill: true };
          } // if it's true, we're g2g anyways
          cmdsApplied++;
          break;
        case 'distinct':
          if(select.startsWith('DISTINCT'))
            throw new Error('Cannot "distinct" something that is already "distinct"ed!');
          select = 'DISTINCT ' + select;
          cmdsApplied++;
          break;
        case 'pluck':
          if(!select.endsWith('*'))
            throw new Error('Cannot pluck on an already selected or plucked stream!');
          select = select.slice(0, -1) + params.map(a => `${JSON.stringify(a)}`).join(', ');
          cmdsApplied++;
          break;
        case 'limit':
          limit = params[0];
          cmdsApplied++;
          break;
        case 'map': // SKIP
        default:
          if(post)
            return { select, post: post + ')', limit, cmdsApplied };
          else return { select, limit, cmdsApplied };
      }
    }
    return { select, post, limit, cmdsApplied };
  }
}
