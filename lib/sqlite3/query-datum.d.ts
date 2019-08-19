import { Datum, Value, DatumPartial } from '../types';
import { SelectableDatum } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
declare class SQLite3QueryDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SQLite3QueryDatumPartial<T[U]> : SQLite3QueryDatumPartial<any>;
    fork(): Datum<T>;
    run(): Promise<T>;
    compile(): Promise<string>;
}
export interface SQLite3QueryDatum<T = any> extends SQLite3QueryDatumPartial<T>, Datum<T> {
}
export declare function createQueryDatum<T = any>(): SQLite3QueryDatum<T>;
export {};
