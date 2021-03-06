import { DatumPartial, Value, Datum, DeepPartial } from '../types';
import { QueryEntry } from './query-entry';
export declare abstract class AbstractDatumPartial<T = any> implements DatumPartial<T> {
    protected query: QueryEntry[];
    abstract _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? DatumPartial<T[U]> : DatumPartial<any>;
    eq(...values: Value<T>[]): Datum<boolean>;
    ne(...values: Value<T>[]): Datum<boolean>;
    or(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
    and(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
    not(): T extends boolean ? Datum<boolean> : never;
    do<U = any>(func: (value: Datum<T>) => Value<U>): Datum<U>;
    branch<U = any, V = any>(trueAction: Value<U> | (() => Value<U>), falseAction: Value<V> | (() => Value<V>)): Datum<U | V>;
    branch<U = any, V = any, W = any>(trueAction: Value<U> | (() => Value<U>), test2: Value<any>, test2Action: Value<V> | (() => Value<V>), falseAction: Value<W> | (() => Value<W>)): Datum<U | V | W>;
    branch<U = any>(trueAction: Value<any> | (() => Value<any>), ...testsActionsAndFalseAction: (Value<any> | (() => Value<any>))[]): Datum<U>;
    startsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
    endsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
    substr(str: Value<string>): T extends string ? Datum<boolean> : never;
    len(): T extends string ? Datum<number> : never;
    add(...values: Value<number>[]): T extends number ? Datum<number> : never;
    sub(...values: Value<number>[]): T extends number ? Datum<number> : never;
    mul(...values: Value<number>[]): T extends number ? Datum<number> : never;
    div(...values: Value<number>[]): T extends number ? Datum<number> : never;
    mod(...values: Value<number>[]): T extends number ? Datum<number> : never;
    gt(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
    lt(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
    ge(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
    le(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
    count(): T extends any[] ? Datum<number> : never;
    difference(value: Value<T>): T extends any[] ? Datum<T> : never;
    contains<U>(value: Value<U>): T extends U[] ? Datum<boolean> : never;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): T extends any[] ? Datum<T> : never;
    limit(n: Value<number>): T extends any[] ? Datum<T> : never;
    pluck<U extends object>(...fields: string[]): T extends U[] ? Datum<Partial<U>[]> : never;
    map<U, V = any>(predicate: (doc: Datum<U>) => Datum<V>): T extends U[] ? Datum<V[]> : never;
    abstract fork(): Datum<T>;
    abstract run(): Promise<T>;
}
