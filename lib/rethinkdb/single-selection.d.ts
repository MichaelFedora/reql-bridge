import { SingleSelectionPartial, Value, Datum, WriteResult, DeepPartial, SingleSelection } from '../types';
import { RSingleSelection } from 'rethinkdb-ts';
import { SelectableDatum } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
declare class RethinkSingleSelectionPartial<T = any> extends AbstractDatumPartial<T> implements SingleSelectionPartial<T>, SelectableDatum<T> {
    protected selection: RSingleSelection<T> | PromiseLike<RSingleSelection<T>>;
    private getSelection;
    constructor(selection: RSingleSelection<T> | PromiseLike<RSingleSelection<T>>);
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableDatum<T[U]> : SelectableDatum<any>;
    update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
    replace(obj: Value<T>): Datum<WriteResult<T>>;
    delete(): Datum<WriteResult<T>>;
    fork(): SingleSelection<T>;
    run(): Promise<T>;
}
export interface RethinkSingleSelection<T = any> extends RethinkSingleSelectionPartial<T>, SingleSelection<T> {
}
export declare function createSingleSelection<T = any>(selection: RSingleSelection<T> | PromiseLike<RSingleSelection<T>>): RethinkSingleSelection<T>;
export {};
