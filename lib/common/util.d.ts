import { Query, Datum, Value, SchemaEntry, DeepPartial } from '../types';
export declare function createQuery<T = any>(run: () => Promise<T>): Query<T>;
export declare function resolveHValue<T = any>(value: Value<T>): Promise<T>;
export declare function deepPartialToPredicate<T = any>(obj: DeepPartial<T>): (doc: Datum<T>) => Datum<boolean>;
export declare function coerceCorrectReturn<T = any>(obj: any, types: SchemaEntry[]): T;
