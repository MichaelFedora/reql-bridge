import { Value, Datum, DatumPartial, StreamPartial, Stream } from '../types';
export interface SelectableDatum<T = any> extends DatumPartial<T> {
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableDatum<T[U]> : SelectableDatum<any>;
}
export interface SelectableStream<T = any> extends StreamPartial<T> {
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableStream<T[U]> : SelectableStream<any>;
}
export declare function makeSelector<T = any>(partial: SelectableDatum<T>): Datum<T>;
export declare function makeStreamSelector<T = any>(partial: SelectableStream<T>): Stream<T>;
