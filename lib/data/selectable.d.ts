import { DatumPartial, Value, Datum } from '../types';
export interface Selectable<T = any> extends DatumPartial<T> {
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? Selectable<T[U]> : Selectable<any>;
}
export declare function makeSelector<T = any>(partial: Selectable<T>): Datum<T>;
