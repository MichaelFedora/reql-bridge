import { RDatum } from 'rethinkdb-ts';
import { SelectableDatum } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { Datum, DatumPartial, Value } from '../types';
declare class RethinkDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
    private datum;
    constructor(datum: RDatum<T> | PromiseLike<RDatum<T>>);
    private errcount;
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? RethinkDatumPartial<T[U]> : RethinkDatumPartial<any>;
    fork(): Datum<T>;
    run(): Promise<T>;
    protected compile(): Promise<RDatum<T>>;
}
export interface RethinkDatum<T = any> extends RethinkDatumPartial<T>, Datum<T> {
}
export declare function createDatum<T = any>(datum: RDatum<T> | PromiseLike<RDatum<T>>): RethinkDatum<T>;
export {};
