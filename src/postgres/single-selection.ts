import { SingleSelectionPartial, Value, SchemaEntry, Datum, WriteResult, DeepPartial, SingleSelection } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { resolveHValue, safen, coerceCorrectReturn } from '../common/util';
import { SelectableDatum, makeSelector } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { resolveQueryStatic } from '../common/static-datum';

class PostgresSingleSelectionPartial<T = any> extends AbstractDatumPartial<T> implements SingleSelectionPartial<T>, SelectableDatum<T> {
  constructor(private db: WrappedPostgresDatabase, private tableName: Value<string>,
    private key: Value<any>, private index: Value<string>, private types: Value<SchemaEntry[]>) { super(); }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableDatum<T[U]>
    : SelectableDatum<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  readonly cmds = ['sel', 'update', 'replace', 'delete'];

  // Selection

  update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'update', params: [obj] });
    return this as any;
  }

  replace(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'replace', params: [obj] });
    return this as any;
  }

  delete(): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'delete' });
    return this as any;
  }

  // Query

  fork(): SingleSelection<T> {
    const clone = createSingleSelection<T>(this.db, this.tableName, this.key, this.index, this.types);
    clone.query = this.query.slice();
    return clone;
  }

  async run(): Promise<T> {
    const key = await resolveHValue(this.key);
    const index = await resolveHValue(this.index);
    const tableName = await resolveHValue(this.tableName);

    if(!this.query || !this.query.length) {
      return this.db.get<T>(`SELECT * FROM [${tableName}] WHERE [${index}]=${safen(key)}`)
        .then(async r => coerceCorrectReturn<T>(r, await resolveHValue(this.types)));
    }

    let cmd = '';
    const params: any[] = [];
    if(this.cmds.includes(this.query[0].cmd)) {
      const q = this.query.shift();
      cmd = q.cmd;
      for(const p of q.params)
        params.push(await resolveHValue(p));

      if((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
        cmd = 'delete';
      }
    }

    let query = '';
    let sel = '';

    switch(cmd) {
      case 'sel':
        query = `SELECT ${params[0]} FROM [${tableName}] WHERE [${index}]=${safen(key)}`;
        sel = params[0];
        break;
      case 'update':
        let set = '';
        for(const k in params[0]) if(params[0][k] != null) {
          if(!set)
            set = `[${k}]=${params[0][k]}`;
          else
            set += `, [${k}]=${params[0][k]}`;
        }
        query = `UPDATE [${tableName}] SET ${set} WHERE [${index}]=${safen(key)}`;
        break;
      case 'replace':
        let repKeys = '';
        let repValues = '';
        for(const k in params[0]) if(params[0][k] != null) {
          if(!repKeys) {
            repKeys = `[${k}]`;
            repValues = `${params[0][k]}`;
          } else {
            repKeys += `, [${k}]`;
            repValues += `, ${params[0][k]}`;
          }
        }
        query = `REPLACE INTO [${tableName}] (${repKeys}) VALUES (${repValues}) WHERE ${[index]}=${safen(key)}`;
        break;
      case 'delete':
        query = `DELETE FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
        break;

      default:
        query = `SELECT * FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
    }

    const value = await this.db.get<T>(query).then(async r => coerceCorrectReturn<T>(r, await resolveHValue(this.types)))
      .then(a => sel ? a[sel] : a);

    if(this.query.length > 0) {
      const ret = await resolveQueryStatic(this.query, value);
      this.query = [];
      return ret;
    } else {
      return value;
    }
  }
}

export interface PostgresSingleSelection<T = any> extends PostgresSingleSelectionPartial<T>, SingleSelection<T> { }

export function createSingleSelection<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>,
  key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>): PostgresSingleSelection<T> {

  return makeSelector(new PostgresSingleSelectionPartial<T>(db, tableName, key, index, types)) as any;
}
