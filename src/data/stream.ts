import { Stream, Value, Datum, DeepPartial } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { resolveHValue, deepPartialToPredicate } from '../internal/util';
import { createQueryDatum } from './query-datum';

export abstract class SQLite3Stream<T = any> implements Stream<T> {

  protected query: { cmd: string, params?: any[] }[] = [];

  constructor(protected db: WrappedSQLite3Database, protected tableName: Value<string>) { }

  abstract count(): Datum<number>;
  abstract async run(): Promise<T[]>;

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): this {
    this.query.push({ cmd: 'filter', params: [predicate] });
    return this;
  }

  map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U> {
    this.query.push({ cmd: 'map', params: [predicate] });
    return this as any;
  }

  distinct(): Stream<T> {
    if(!this.query.find(q => q.cmd === 'distinct'))
      this.query.push({ cmd: 'distinct' });
    return this;
  }

  limit(n: Value<number>): Stream<T> {
    if(this.query.find(a => a.cmd === 'imit'))
      throw new Error('Cannot set a limit after having already set one!');

    this.query.push({ cmd: 'limit', params: [n] });
    return this as any;
  }

  pluck(...fields: string[]): Stream<Partial<T>> {
    const idx = this.query.findIndex(q => q.cmd === 'pluck');
    if(idx >= 0) {
      this.query[idx].params = this.query[idx].params.concat(
          fields.filter(a => !this.query[idx].params.includes(a)));
    } else {
      this.query.push({ cmd: 'pluck', params: fields });
    }
    return this as any;
  }

  protected async computeQuery(): Promise<{ select?: string, post?: string, limit?: number, kill?: boolean }> {
    if(!this.query.length)
      return { select: '*' };
    const tableName = await resolveHValue(this.tableName);
    const primaryKey = await this.db.getPrimaryKey(tableName);

    const distinct = Boolean(this.query.find(q => q.cmd === 'distinct'));
    const pluck = this.query.find(q => q.cmd === 'pluck');
    const select = (distinct ? 'DISTINCT ' : '') + (pluck ? pluck.params.map(a => `[${a}]`).join(', ') : '*');

    let post = ``;
    let limit = undefined;
    let cmdsApplied = 0;
    for(const q of this.query) {
      switch(q.cmd) {
        case 'filter':
          const pred: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>) = q.params[0];

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
              post = `[${primaryKey}] in (SELECT [${primaryKey}] FROM [${tableName}] WHERE ${query})`;
            else
              post += ` AND (${query})`;

          } else if(!res) {
            return { kill: true };
          } // if it's true, we're g2g anyways
          cmdsApplied++;
          break;
        case 'map':
        case 'distinct':
        case 'pluck':
          break;
        case 'limit':
          limit = q.params[0];
          break;
        default:
          if(cmdsApplied)
            return { select, post: post + ')', limit };
          else return { select, limit };
      }
    }
    if(cmdsApplied)
      return { select, post, limit };
    else
      return { select, limit };
  }
}
