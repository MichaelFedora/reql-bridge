import { Datum, Value, DatumPartial } from '../types';
import { resolveHValue } from '../internal/util';
import { Selectable, makeSelector } from './selectable';
import { SQLite3DatumPartial } from './datum';

class SQLite3StaticDatumPartial<T = any> extends SQLite3DatumPartial<T> implements DatumPartial<T>, Selectable<T> {

  constructor(private initialValue: Value<T>) {
    super();
  }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3StaticDatumPartial<T[U]> : SQLite3StaticDatumPartial<any> {

    const child = new SQLite3StaticDatumPartial<T>(this.initialValue);
    child.query = this.query.slice();
    child.query.push({ cmd: 'sel', params: [attribute] });
    return child as any;
  }

  async run(): Promise<T> {
    const ret = await resolveQueryStatic<T>(this.query, this.initialValue);
    this.query = [];
    return ret;
  }
}

export async function resolveQueryStatic<T = any>(
  query: { cmd: string, params?: readonly Value<any>[] }[],
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
          throw new Error('Cannot map a non-array value!');
        const newv = [];
        for(const subv of value) {
          newv.push(await resolveHValue((params[0] as (doc: Datum<typeof subv>) => Datum<any>)(createStaticDatum(subv))));
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

      default:
        throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
    }
  }
  return value;
}

export interface SQLite3StaticDatum<T = any> extends SQLite3StaticDatumPartial<T>, Datum<T> { }

export function createStaticDatum<T = any>(initialValue: Value<T> | Value<T>): SQLite3StaticDatum<T> {
  return makeSelector<T>(new SQLite3StaticDatumPartial<T>(initialValue)) as any;
}
