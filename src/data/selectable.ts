import { DatumPartial, Value, Datum } from '../types';

export interface Selectable<T = any> extends DatumPartial<T> {
  _sel<U extends string | number>(attribute: Value<U>): U extends keyof T
    ? Selectable<T[U]>
    : Selectable<any>;
}

export function makeSelector<T = any>(partial: Selectable<T>): Datum<T> {
  const datum: any = function<U extends string | number>(attribute: Value<U>) {
    return makeSelector(partial._sel(attribute) as any);
  };
  datum.__proto__ = partial;

  return datum;
}
