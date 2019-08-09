import { Datum, Value, DatumPartial } from '../types';
import { resolveHValue, safen } from '../internal/util';
import { Selectable, makeSelector } from './selectable';
import { SQLite3DatumPartial } from './datum';

class SQLite3QueryDatumPartial<T = any> extends SQLite3DatumPartial<T> implements DatumPartial<T>, Selectable<T> {
  constructor() { super(); }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3QueryDatumPartial<T[U]> : SQLite3QueryDatumPartial<any> {

    const child = new SQLite3QueryDatumPartial<T>();
    child.query = this.query.slice();
    child.query.push({ cmd: 'sel', params: [attribute] });
    return child as any;
  }

  async run(): Promise<T> {
    if(this.query.length)
      this.query = [];
    return null;
  }

  async compile(): Promise<string> {
    let query = '';
    let sel = '';
    let sel2 = '';

    for(const q of this.query) {

      const params = q.params && q.params.slice();
      if(params) { // reduce parameters
        for(let i = 0; i < q.params.length; i++) {
          if(params[i].compile)
            params[i] = safen(await params[i].compile());
          else
            params[i] = safen(await resolveHValue(params[i]));
        }
      }

      switch(q.cmd) {
        case 'sel':
          if(sel2)
            throw new Error('Cannot filter via sub-objects in SQLite3!');
          else if(sel)
            sel2 = params[0].slice(1, -1); // get rid of the double quotes
          else
            sel = params[0].slice(1, -1);
          break;

        case 'map':
          throw new Error('Cannot map filter documents in SQLite3!');

        case 'not':
          if(query)
            query = 'NOT (' + query + ')';
          else
            query += 'NOT ';
          break;

        case 'eq':
          if(!sel)
            throw new Error('Cannot start a filter with "eq"!');
          if(query)
            query += ` AND `;
          if(sel2)
            query += `${sel} LIKE '%"${sel2}":${params[0].replace(/^'|'$/g, '"')}%'`;
          else
            query += `${sel} = ${params[0]}`;

          sel = sel2 = '';
          break;
        case 'ne':
            if(!sel)
              throw new Error('Cannot start a filter with "ne"!');
            if(query)
              query += ` AND `;
            if(sel2)
              query += `${sel} NOT LIKE '%"${sel2}":${params[0]}%`;
            else
              query += `${sel} != ${params[0]}`;

            sel = sel2 = '';
          break;

        case 'startsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${'"%' + (params[0] as string).slice(1)})`;
          break;
        case 'endsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${(params[0] as string).slice(0, -1) + '%"'})`;
          break;
        case 'includes':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${'"%' + (params[0] as string).slice(1, -1) + '%"'})`;
          break;
        case 'length':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `LENGTH(${sel})`;
          break;

        case 'or':
          if(!query)
            throw new Error('Cannot start a filter with "or"!');
          else
            query += ' OR (' + params[0] + ')';
          break;
        case 'and':
          if(!query)
            throw new Error('Cannot start a filter with "and"!');
          else
            query += ' AND (' + params[0] + ')';
          break;

        case 'add':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} + ${params[0]})`;
          else
            throw new Error('Cannot use "add" without something selected!');
          break;
        case 'sub':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} - ${params[0]})`;
          else
            throw new Error('Cannot use "sub" without something selected!');
          break;
        case 'mul':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} * ${params[0]})`;
          else
            throw new Error('Cannot use "mul" without something selected!');
          break;
        case 'div':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} / ${params[0]})`;
          else
            throw new Error('Cannot use "div" without something selected!');
          break;
          case 'div':
            if(sel2)
              throw new Error('Can only use "eq" and "ne" on sub-object!');
            else if(sel)
              sel = `(${sel} % ${params[0]})`;
            else
              throw new Error('Cannot use "mod" without something selected!');
            break;

        case 'gt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} > ${params[0]})`;
          else
            throw new Error('Cannot use "gt" without something selected!');
          break;

        case 'lt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} < ${params[0]})`;
          else
            throw new Error('Cannot use "lt" without something selected!');
          break;
        case 'ge':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} >= ${params[0]})`;
          else
            throw new Error('Cannot use "ge" without something selected!');
          break;
        case 'le':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} <= ${params[0]})`;
          else
            throw new Error('Cannot use "le" without something selected!');
          break;

        default:
          throw new Error(`Cannot perform command "${q.cmd}" on this (query) datum!`);
      }
    }
    if(query && sel)
      return query + ' AND ' + sel;
    else if(sel)
      return sel;
    else
      return query;
  }
}

export interface SQLite3QueryDatum<T = any> extends SQLite3QueryDatumPartial<T>, Datum<T> { }

export function createQueryDatum<T = any>(): SQLite3QueryDatum<T> {
  return makeSelector<T>(new SQLite3QueryDatumPartial()) as any;
}
