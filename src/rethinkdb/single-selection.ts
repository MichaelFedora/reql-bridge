import { SingleSelectionPartial, Value, Datum, WriteResult, DeepPartial, SingleSelection } from '../types';
import { RSingleSelection } from 'rethinkdb-ts';
import { resolveValue } from '../common/util';
import { SelectableDatum, makeSelector } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { createDatum } from './datum';

/*
const key = await resolveValue(this.key);
const index = await resolveValue(this.index);
const tableName = await resolveValue(this.tableName);
return this.db.table(tableName).getAll(key, { index }).nth(0);
*/

class RethinkSingleSelectionPartial<T = any> extends AbstractDatumPartial<T> implements SingleSelectionPartial<T>, SelectableDatum<T> {

  private async getSelection(): Promise<RSingleSelection<T>> {
    return await this.selection;
  }

  constructor(protected selection: RSingleSelection<T> | PromiseLike<RSingleSelection<T>>) { super(); }

  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableDatum<T[U]>
    : SelectableDatum<any> {

    const ret = this.getSelection().then(sel => resolveValue(attribute).then(val => sel(val)));
    return createDatum(ret) as any;
  }

  // Selection

  update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>> {
    return createDatum(this.getSelection().then(sel => resolveValue(obj).then(val => sel.update(val))));
  }

  replace(obj: Value<T>): Datum<WriteResult<T>> {
    return createDatum(this.getSelection().then(sel => resolveValue(obj).then(val => sel.replace(val))));
  }

  delete(): Datum<WriteResult<T>> {
    return createDatum(this.getSelection().then(a => a.delete()));
  }

  // Query

  fork(): SingleSelection<T> {
    const clone = createSingleSelection<T>(this.selection);
    (clone as any).query = this.query.slice();
    return clone;
  }

  async run(): Promise<T> {
    return this.getSelection().then(sel => sel.run()).then(res => res && res[0]);
  }
}

export interface RethinkSingleSelection<T = any> extends RethinkSingleSelectionPartial<T>, SingleSelection<T> { }

export function createSingleSelection<T = any>(
  selection: RSingleSelection<T> | PromiseLike<RSingleSelection<T>>): RethinkSingleSelection<T> {

  return makeSelector(new RethinkSingleSelectionPartial<T>(selection)) as any;
}
