import { Value, Datum, DatumPartial, StreamPartial, Stream } from '../types';

export interface SelectableDatum<T = any> extends DatumPartial<T> {
  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableDatum<T[U]>
    : SelectableDatum<any>;
}

export interface SelectableStream<T = any> extends StreamPartial<T> {
  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? SelectableStream<T[U]>
    : SelectableStream<any>;
}

export function makeSelector<T = any>(partial: SelectableDatum<T>): Datum<T> {
  const datum: any = function<U extends string | number>(attribute: Value<U>) {
    return makeSelector(partial._sel(attribute));
    /* const sel = partial._sel(attribute);
    if(sel === partial)
      return datum;
    else return makeSelector(sel);*/
  };
  datum.__proto__ = partial;

  return datum;
}
