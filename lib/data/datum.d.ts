import { DatumPartial, Value, Datum } from '../types';
export declare abstract class SQLite3DatumPartial<T = any> implements DatumPartial<T> {
    protected query: {
        readonly cmd: string;
        readonly params?: readonly Value<any>[];
    }[];
    abstract _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SQLite3DatumPartial<T[U]> : SQLite3DatumPartial<any>;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): T extends any[] ? Datum<U[]> : never;
    eq(...values: Value<T>[]): Datum<boolean>;
    ne(...values: Value<T>[]): Datum<boolean>;
    or(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
    and(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
    not(): T extends boolean ? Datum<boolean> : never;
    startsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
    endsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
    includes(str: Value<string>): T extends string ? Datum<boolean> : never;
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
    abstract run(): Promise<T>;
}
