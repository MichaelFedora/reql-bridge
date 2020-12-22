import { RDatum, RValue } from 'rethinkdb-ts';
import { deepPartialToPredicate, resolveValue } from '../common/util';
import { SelectableDatum, makeSelector } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { Datum, DatumPartial, DeepPartial, Value, Query } from '../types';
import { expr } from '../common/static-datum';
import { createQueryDatum, RethinkQueryDatum } from './query-datum';

class RethinkDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
  constructor(private datum: RDatum<T> | PromiseLike<RDatum<T>>) { super(); }

  private errcount = 0;

  _sel<U extends string | number>(attribute: Value<U>):
  U extends keyof T ? RethinkDatumPartial<T[U]> : RethinkDatumPartial<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  fork(): Datum<T> { console.log('bork');
    const child = createDatum<T>(this.datum);
    (child as any).__proto__.query = this.query.slice();
    return child as any;
  }

  async run(): Promise<T> {
    return this.compile().then(d => d.run());
  }

  protected async compile(): Promise<RDatum<T>> {
    let datum: RDatum<any> = await this.datum;
    let sel = '';
    let sel2 = '';

    for(const q of this.query) {

      const params = q.params && q.params.slice();
      if(params) { // reduce parameters
        for(let i = 0; i < q.params.length; i++) {
          if(params[i].compile)
            params[i] = await params[i].compile();
          else
            params[i] = await resolveValue(params[i]);
        }
      }

      switch(q.cmd) {
        case 'sel':
          datum = datum(q.params[0]);
          if(sel) sel2 = q.params[0];
          else sel = q.params[0];
          break;

        case 'not':
          datum = datum.not();
          break;

        case 'do':
          const doQuery = params[0](createQueryDatum());
          if(typeof (doQuery as any)['compile'] === 'function') {
            const exec = await doQuery.compile();
            datum = datum.do(exec);
          } else throw new Error('bad time ahead');
          break;

        case 'branch':
          const tests = [];
          for(let i = 0; i < params.length; i++) {
            if(i % 2 < 1) { // if even, it's an action (0, 2, etc)
              if(typeof params[i] !== 'function')
                tests.push(params[i]);
              else {
                const query = params[i](createQueryDatum());
                if(typeof query['compile'] === 'function')
                  tests.push(await (query as RethinkQueryDatum).compile());
                else tests.push(query);
              }
            } else if(i === params.length - 1) { // false action
              if(typeof params[i] !== 'function')
                tests.push(params[i]);
              else {
                const query = params[i](createQueryDatum());
                if(typeof query['compile'] === 'function')
                  tests.push(await (query as RethinkQueryDatum).compile());
                else tests.push(query);
              }
            } else { // odd, is a test (1, 3, etc)
              tests.push(params[i]);
            }
          }

          datum = datum.branch(tests[0], tests[1], ...tests.slice(2));
          break;

        case 'eq':
          if(!sel)
            throw new Error('Cannot start a filter with "eq"!');
          datum = datum.eq(...params);
          sel = sel2 = '';
          break;
        case 'ne':
          if(!sel)
            throw new Error('Cannot start a filter with "ne"!');
          datum = datum.ne(...params);
          sel = sel2 = '';
          break;

        case 'startsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = (datum as RDatum<string>).match('^' + params[0]).ne(null);
          break;
        case 'endsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = (datum as RDatum<string>).match(params[0] + '$').ne(null);
          break;
        case 'substr':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = (datum as RDatum<string>).match(params[0]).ne(null);
          break;
        case 'len':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = (datum as RDatum<string>).count();
          break;

        case 'or':
          if(datum === this.datum)
            throw new Error('Cannot start a filter with "or"!');
          else
            datum = datum.or(...params);
          break;
        case 'and':
          if(datum === this.datum)
            throw new Error('Cannot start a filter with "and"!');
          else
            datum = datum.and(...params);
          break;

        case 'add':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.add(...params);
          break;
        case 'sub':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.sub(...params);
          break;
        case 'mul':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.mul(...params);
          break;
        case 'div':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.div(...params);
          break;
        case 'mod':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.mod(...params);
          break;

        case 'gt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.gt(...params);
          break;

        case 'lt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.lt(...params);
          break;
        case 'ge':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.ge(...params);
          break;
        case 'le':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          datum = datum.le(...params);
          break;

        case 'count':
          datum = datum.count();
          break;
        case 'limit':
          datum = datum.limit(Number(params[0]));
          break;
        case 'difference':
          datum = datum.difference(params[0] as any[]);
          break;
        case 'contains':
          datum = datum.contains(params[0]);
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
            datum = datum.filter(exec);
          } else throw new Error('bad time ahead');
          break;
        case 'pluck':
          datum.pluck(...params);
          break;
        case 'map':
          datum = datum.map(params[0] as (doc: RDatum<any>) => any);
          break;

        default:
          throw new Error(`Cannot perform query "${q.cmd}" on this (rethink) datum!`);
      }
    }
    return datum;
  }
}

export interface RethinkDatum<T = any> extends RethinkDatumPartial<T>, Datum<T> { }

export function createDatum<T = any>(datum: RDatum<T> | PromiseLike<RDatum<T>>): RethinkDatum<T> {
  return makeSelector<T>(new RethinkDatumPartial(datum)) as any;
}
