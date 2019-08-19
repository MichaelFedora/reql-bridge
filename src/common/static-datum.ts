import { Datum, Value, DatumPartial, DeepPartial } from '../types';
import { resolveHValue, deepPartialToPredicate } from './util';
import { SelectableDatum, makeSelector } from './selectable';
import { AbstractDatumPartial } from './datum';
import { QueryEntry } from './query-entry';

class SQLite3StaticDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {

  constructor(private initialValue: Value<T>) {
    super();
  }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3StaticDatumPartial<T[U]> : SQLite3StaticDatumPartial<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  fork(): Datum<T> {
    const clone = expr(this.initialValue);
    (clone as any).query = this.query.slice();
    return clone;
  }

  async run(): Promise<T> {
    const ret = await resolveQueryStatic<T>(this.query, this.initialValue);
    this.query = [];
    return ret;
  }
}

export async function resolveQueryStatic<T = any>(
  query: readonly QueryEntry[],
  initialValue: Value<T>): Promise<T> {

  let value: any = await resolveHValue(initialValue);

  for(const q of query) {

    const params = q.params.slice();
    if(params) { // reduce parameters
      for(let i = 0; i < q.params.length; i++)
        params[i] = await resolveHValue(params[i]);
    }

    switch(q.cmd) {

      case 'map':
        if(!(value instanceof Array))
          throw new Error('Cannot map a non-array value: ' + JSON.stringify(value));
        const newv = [];
        for(const subv of value) {
          newv.push(await resolveHValue((params[0] as (doc: Datum<typeof subv>) => Datum<any>)(expr(subv))));
        }
        value = newv;
        break;

      case 'sel':
          value = value[params[0]];
        break;

      case 'eq':
          value = !params.find(a => a !== value);
        break;
      case 'ne':
          value = Boolean(params.find(a => a !== value));
        break;

      case 'or':
        value = Boolean(params.reduce((acc, v) => acc || v, value));
        break;
      case 'and':
        value = Boolean(params.reduce((acc, v) => acc && v, value));
        break;

      case 'add':
        value = params.reduce((acc, v) => acc + value, value);
        break;
      case 'sub':
        value = params.reduce((acc, v) => acc - value, value);
        break;
      case 'mul':
        value = params.reduce((acc, v) => acc * v, value);
        break;
      case 'div':
        value = params.reduce((acc, v) => acc / v, value);
        break;
      case 'mod':
        value = params.reduce((acc, v) => acc % v, value);
        break;

      case 'gt':
        value = !params.find((v, i, arr) => {
          if(i === 0)
            return value <= v;
          else return arr[i - 1] <= v;
        });
        break;
      case 'lt':
        value = !params.find((v, i, arr) => {
          if(i === 0)
            return value >= v;
          else return arr[i - 1] >= v;
        });
        break;
      case 'ge':
        value = !params.find((v, i, arr) => {
          if(i === 0)
            return value < v;
          else return arr[i - 1] < v;
        });
        break;
      case 'le':
        value = !params.find((v, i, arr) => {
          if(i === 0)
            return value > v;
          else return arr[i - 1] > v;
        });
        break;

      case 'count':
        value = (value as any[]).length;
        break;
      case 'limit':
        value = (value as any[]).slice(0, Number(params[0]));
        break;
      case 'difference':
        value = (value as any[]).filter(a => !(params[0] as any[]).includes(a));
        break;
      case 'contains':
        value = Boolean((value as any).find(a => a === (params[0])));
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

        value = (value as any[]).filter(a => predfoo(expr(a)));
        break;
      case 'pluck':
        const newvalue = [];
        for(const item of value) {
          const newitem = { };
          for(const field of params) {
            newvalue[field] = value[field];
          }
        }
        value = newvalue;
      break;
      case 'map':
        value = (value as any[]).map(a => params[0](expr(value)));
        break;

      default:
        throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
    }
  }
  return value;
}

export interface SQLite3StaticDatum<T = any> extends SQLite3StaticDatumPartial<T>, Datum<T> { }

export function exprQuery<T = any>(initialValue: Value<T> | Value<T>, query: QueryEntry[]): Datum<T> {
  const datum = makeSelector<T>(new SQLite3StaticDatumPartial<T>(initialValue)) as any;
  datum.query = query;
  return datum;
}

export function expr<T = any>(initialValue: Value<T> | Value<T>): Datum<T> {
  return makeSelector<T>(new SQLite3StaticDatumPartial<T>(initialValue)) as any;
}
