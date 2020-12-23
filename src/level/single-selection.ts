import { LevelUp } from 'levelup';
import sub from 'subleveldown';

import { SingleSelectionPartial, Value, Datum, WriteResult, DeepPartial, SingleSelection } from '../types';
import { resolveValue } from '../common/util';
import { SelectableDatum, makeSelector } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { resolveQueryStatic } from '../common/static-datum';
import { subdb } from './util';

class LevelSingleSelectionPartial<T = any> extends AbstractDatumPartial<T> implements SingleSelectionPartial<T>, SelectableDatum<T> {

  private async getTable(): Promise<LevelUp> {
    return subdb(this.db, await resolveValue(this.tableName));
  }

  constructor(private db: LevelUp, private tableName: Value<string>,
    private key: Value<any>, private index?: Value<string>) { super(); }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableDatum<T[U]>
    : SelectableDatum<any> {

    this.query.push({ cmd: 'sel', params: [attribute] });
    return this as any;
  }

  readonly cmds = ['update', 'replace', 'delete'];

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
    const clone = createSingleSelection<T>(this.db, this.tableName, this.key, this.index);
    (clone as any).__proto__.query = this.query.slice();
    return clone;
  }

  async run(): Promise<T> {
    let key = await resolveValue(this.key);
    const table = await this.getTable();

    if(this.index)
      key = await subdb(table, 'index!!' + await resolveValue(this.index)).get(key);

    const primaryTable = subdb(table, 'primary');

    if(!this.query.length)
      return primaryTable.get(key).catch((e: any) => { if(e.notFound) return null; else throw e; });

    let cmd = '';
    const params: any[] = [];
    if(this.cmds.includes(this.query[0].cmd)) {
      const q = this.query.shift();
      cmd = q.cmd;
      for(const p of q.params)
        params.push(await resolveValue(p));

      if((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
        cmd = 'delete';
      }
    }

    let value: T | WriteResult<T>;

    switch(cmd) {
      case 'sel':
        value = await primaryTable.get(key).then(a => a != null ? a[params[0]] : a)
          .catch((e: any) => { if(e.notFound) return null; else throw e; });
        break;
      case 'update':
        const old = await primaryTable.get(key).catch((e: any) => { if(e.notFound) return null; else throw e; });
        value = await primaryTable.put(key, Object.assign({ }, old, params[0])).then(
          () => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        break;
      case 'replace':
        value = await primaryTable.put(key, params[0]).then(
          () => ({ deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 1, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        break;
      case 'delete':
        value = await primaryTable.del(key).then(
          () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        break;
      default: value = await primaryTable.get(key).catch((e: any) => { if(e.notFound) return null; else throw e; });
    }

    if(this.query.length > 0) {
      const ret = await resolveQueryStatic(this.query, value as any);
      this.query = [];
      return ret;
    } else {
      return value as any;
    }
  }
}

export function createSingleSelection<T = any>(db: LevelUp, tableName: Value<string>,
  key: Value<any>, index?: Value<string>): SingleSelection<T> {

  return makeSelector(new LevelSingleSelectionPartial<T>(db, tableName, key, index)) as any;
}
