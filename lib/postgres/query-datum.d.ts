import { Datum, Value, DatumPartial } from '../types';
import { SelectableDatum } from '../common/selectable';
import { AbstractDatumPartial } from '../common/datum';
declare class PostgresQueryDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? PostgresQueryDatumPartial<T[U]> : PostgresQueryDatumPartial<any>;
    fork(): Datum<T>;
    run(): Promise<T>;
    compile(): Promise<string>;
}
export interface PostgresQueryDatum<T = any> extends PostgresQueryDatumPartial<T>, Datum<T> {
}
export declare function createQueryDatum<T = any>(): PostgresQueryDatum<T>;
export {};
