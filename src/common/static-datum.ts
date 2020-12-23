import { Datum, Value, DatumPartial, DeepPartial } from '../types';
import { resolveValue, deepPartialToPredicate } from './util';
import { SelectableDatum, makeSelector } from './selectable';
import { AbstractDatumPartial } from './datum';
import { QueryEntry } from './query-entry';

class StaticDatum<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {

  constructor(private initialValue: Value<T>) {
    super();
  }

  _sel<U extends string | number>(attribute: Value<U>):
  U extends keyof T ? StaticDatum<T[U]> : StaticDatum<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  fork(): Datum<T> {
    const clone = expr(this.initialValue);
    (clone as any).__proto__.query = this.query.slice();
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

  let value: any = await resolveValue(initialValue);


  for(const q of query) {

    const params = q.params && q.params.slice();
    if(params) { // reduce parameters
      for(let i = 0; i < q.params.length; i++)
        params[i] = await resolveValue(params[i]);
    }

    switch(q.cmd) {

      case 'sel':
        if(value instanceof Array)
          value = value.map(a => a[params[0]]);
        else
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

      case 'do':
        value = await resolveValue(params[0](expr(value)));
        break;
      case 'branch':
        let testValue = value;
        let retValue;
        for(let i = 0; i < params.length; i++) {
          if(i % 2 < 1) { // if even, it's an action (0, 2, etc)
            if(testValue) {
              if(typeof params[i] === 'function')
                retValue = await resolveValue(params[i](expr(value)));
              else
                retValue = params[i];
            }
          } else if(i === params.length - 1) { // false action
            if(typeof params[i] === 'function')
              retValue = await resolveValue(params[i](expr(value)));
            else
              retValue = params[i];
          } else { // odd, is a test (1, 3, etc)
            testValue = params[i];
          }
        }
        value = retValue;
        break;

      case 'startsWith':
        value = (value as string).startsWith(params[0]);
        break;
      case 'endsWith':
        value = (value as string).endsWith(params[0]);
        break;
      case 'substr':
        value = (value as string).includes(params[0]);
        break;
      case 'len':
        value = (value as string).length;
        break;

      case 'add':
        value = params.reduce((acc, v) => acc + v, value);
        break;
      case 'sub':
        value = params.reduce((acc, v) => acc - v, value);
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
        if(!(value instanceof Array))
          throw new Error('Cannot count a non-array value: ' + JSON.stringify(value));

        value = (value as any[]).length;
        break;
      case 'limit':
        if(!(value instanceof Array))
          throw new Error('Cannot limit a non-array value: ' + JSON.stringify(value));

        value = (value as any[]).slice(0, Number(params[0]));
        break;
      case 'difference':
        if(!(value instanceof Array))
          throw new Error('Cannot "difference" a non-array value: ' + JSON.stringify(value));

        value = (value as any[]).filter(a => !(params[0] as any[]).includes(a));
        break;
      case 'contains':
        if(!(value instanceof Array))
          throw new Error('Cannot "contains" a non-array value: ' + JSON.stringify(value));

        value = Boolean((value as any).find(a => a === (params[0])));
        break;
      case 'filter':
        if(!(value instanceof Array))
          throw new Error('Cannot filter a non-array value: ' + JSON.stringify(value));

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
          for(const key of params as string[]) if(item[key]) {
            newitem[key] = value[key];
          }
          newvalue.push(newitem);
        }
        value = newvalue;
        break;
      case 'map':
        if(!(value instanceof Array))
          throw new Error('Cannot map a non-array value: ' + JSON.stringify(value));
        const newv = [];
        for(const subv of value) {
          newv.push(await resolveValue((params[0] as (doc: Datum<typeof subv>) => Datum<any>)(expr(subv))));
        }
        value = newv;
        break;

      default:
        throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
    }
  }
  return value;
}

export function exprQuery<T = any>(initialValue: Value<T> | Value<T>, query: QueryEntry[]): Datum<T> {
  const datum = makeSelector<T>(new StaticDatum<T>(initialValue)) as any;
  datum.__proto__.query = query;
  return datum;
}

export function expr<T = any>(initialValue: Value<T> | Value<T>): Datum<T> {
  return makeSelector<T>(new StaticDatum<T>(initialValue)) as any;
}

export function ensureDatum<T = any>(value: Value<T>): Datum<T> {
  if(value instanceof AbstractDatumPartial)
    return value as any;
  else return expr(value);
}
