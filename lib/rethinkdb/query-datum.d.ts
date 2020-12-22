import { Datum, Value, DatumPartial } from '../types';
import { SelectableDatum } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
import { RDatum, RValue } from 'rethinkdb-ts';
declare class RethinkQueryDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? RethinkQueryDatumPartial<T[U]> : RethinkQueryDatumPartial<any>;
    fork(): Datum<T>;
    run(): Promise<T>;
    compile<U = any>(): Promise<(doc: RDatum<T>) => RValue<U>>;
}
export interface RethinkQueryDatum<T = any> extends RethinkQueryDatumPartial<T>, Datum<T> {
}
export declare function createQueryDatum<T = any>(): RethinkQueryDatum<T>;
export {};
