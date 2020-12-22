import { Datum, Value, DatumPartial } from '../types';
import { resolveValue } from '../common/util';
import { SelectableDatum, makeSelector } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { RDatum, RValue } from 'rethinkdb-ts';

class RethinkQueryDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
  constructor() { super(); }

  _sel<U extends string | number>(attribute: Value<U>):
  U extends keyof T ? RethinkQueryDatumPartial<T[U]> : RethinkQueryDatumPartial<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  fork(): Datum<T> {
    const child = createQueryDatum<T>();
    (child as any).__proto__.query = this.query.slice();
    return child as any;
  }

  async run(): Promise<T> {
    throw new Error('Cannot "run" a Query Datum!');
  }

  async compile<U = any>(): Promise<(doc: RDatum<T>) => RValue<U>> {

    const query = [];
    for(const q of this.query) {
      const params = q.params && q.params.slice();
      if(params) { // reduce parameters
        for(let i = 0; i < q.params.length; i++) {
          if(params[i].compile)
            params[i] = { exec: await params[i].compile() };
          else
            params[i] = await resolveValue(params[i]);
        }
      }
      query.push({ cmd: q.cmd, params });
    }

    return (doc: RDatum<T>) => {
      let datum: RDatum<any> = doc;
      let sel = '', sel2 = '';

      for(const q of query) {

        const params = q.params && q.params.slice();
        if(params)
          for(let i = 0; i < params.length; i++)
            if(params[i].exec)
              params[i] = params[i].exec(datum);

        switch(q.cmd) {
          case 'sel':
            if(sel2)
              throw new Error('Cannot filter via sub-objects!');

            datum = datum(q.params[0]);
            if(sel) sel2 = q.params[0];
            else sel = q.params[0];
            break;

          case 'not':
            datum = datum.not();
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
            if(datum === doc)
              throw new Error('Cannot start a filter with "or"!');
            else
              datum = datum.or(...params);
            break;
          case 'and':
            if(datum === doc)
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

          default:
            throw new Error(`Cannot perform query "${q.cmd}" on this (query) datum!`);
        }
      }
      return datum;
    };
  }
}

export interface RethinkQueryDatum<T = any> extends RethinkQueryDatumPartial<T>, Datum<T> { }

export function createQueryDatum<T = any>(): RethinkQueryDatum<T> {
  return makeSelector<T>(new RethinkQueryDatumPartial()) as any;
}
