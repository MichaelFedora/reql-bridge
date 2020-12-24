import { Datum, Value } from '../types';
import { QueryEntry } from './query-entry';
export declare function resolveQueryStatic<T = any>(query: readonly QueryEntry[], initialValue: Value<T>): Promise<T>;
export declare function exprQuery<T = any>(initialValue: Value<T> | Value<T>, query: QueryEntry[]): Datum<T>;
export declare function expr<T = any>(initialValue: Value<T> | Value<T>): Datum<T>;
export declare function ensureDatum<T = any>(value: Value<T>, fork?: boolean): Datum<T>;
