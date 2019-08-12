import { Datum, Value, DatumPartial } from '../types';
import { Selectable } from './selectable';
import { SQLite3DatumPartial } from './datum';
declare class SQLite3QueryDatumPartial<T = any> extends SQLite3DatumPartial<T> implements DatumPartial<T>, Selectable<T> {
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SQLite3QueryDatumPartial<T[U]> : SQLite3QueryDatumPartial<any>;
    run(): Promise<T>;
    compile(): Promise<string>;
}
export interface SQLite3QueryDatum<T = any> extends SQLite3QueryDatumPartial<T>, Datum<T> {
}
export declare function createQueryDatum<T = any>(): SQLite3QueryDatum<T>;
export {};
