import { Datum, Value, DatumPartial } from '../types';
import { SelectableDatum } from './selectable';
import { AbstractDatumPartial } from './datum';
import { QueryEntry } from './query-entry';
declare class SQLite3StaticDatumPartial<T = any> extends AbstractDatumPartial<T> implements DatumPartial<T>, SelectableDatum<T> {
    private initialValue;
    constructor(initialValue: Value<T>);
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SQLite3StaticDatumPartial<T[U]> : SQLite3StaticDatumPartial<any>;
    fork(): Datum<T>;
    run(): Promise<T>;
}
export declare function resolveQueryStatic<T = any>(query: readonly QueryEntry[], initialValue: Value<T>): Promise<T>;
export interface SQLite3StaticDatum<T = any> extends SQLite3StaticDatumPartial<T>, Datum<T> {
}
export declare function exprQuery<T = any>(initialValue: Value<T> | Value<T>, query: QueryEntry[]): Datum<T>;
export declare function expr<T = any>(initialValue: Value<T> | Value<T>): Datum<T>;
export {};
