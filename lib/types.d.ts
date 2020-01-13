export declare type DeepPartial<T> = T | {
    [P in keyof T]?: T[P] extends Array<infer U1> ? Array<DeepPartial<U1>> : T[P] extends readonly (infer U2)[] ? readonly DeepPartial<U2>[] : DeepPartial<T[P]>;
};
export interface ValueChange<T = any> {
    old_val?: T;
    new_val?: T;
}
export interface IndexChangeResult {
    created?: number;
    renamed?: number;
    dropped?: number;
}
export interface TableChangeResult {
    tables_created?: number;
    tables_dropped?: number;
}
export interface WriteResult<T = any> {
    deleted: number;
    skipped: number;
    errors: number;
    first_error?: string;
    inserted: number;
    replaced: number;
    unchanged: number;
    generated_keys?: string[];
    warnings?: string[];
    changes?: Array<ValueChange<T>>;
}
export declare type Value<T = any> = Datum<T> | Query<T> | T;
export interface Query<T = any> {
    fork(): Query<T>;
    run(): Promise<T>;
}
export interface DatumPartial<T = any> extends Query<T> {
    fork(): Datum<T>;
    eq(...value: Value<T>[]): Datum<boolean>;
    ne(...value: Value<T>[]): Datum<boolean>;
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
    limit(n: Value<number>): T extends any[] ? Datum<T> : never;
    difference(value: Value<T>): T extends any[] ? Datum<boolean> : never;
    contains<U>(value: Value<U>): T extends U[] ? Datum<boolean> : never;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): T extends any[] ? Datum<T> : never;
    pluck<U extends object>(...fields: string[]): T extends U[] ? Datum<Partial<U>[]> : never;
    map<U, V = any>(predicate: (doc: Datum<U>) => Datum<V>): T extends U[] ? Datum<V[]> : never;
}
export interface Datum<T = any> extends DatumPartial<T> {
    <U extends string | number>(attribute: Value<U>): U extends keyof T ? Datum<T[U]> : Datum<any>;
}
export interface SingleSelectionPartial<T = any> extends DatumPartial<T> {
    fork(): SingleSelection<T>;
    update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
    replace(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
    delete(): Datum<WriteResult<T>>;
}
export interface SingleSelection<T = any> extends SingleSelectionPartial<T>, Datum<T> {
    fork(): SingleSelection<T>;
}
export interface StreamPartial<T = any> extends Query<T[]> {
    fork(): Stream<T>;
    distinct(): Stream<T>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T>;
    limit(n: Value<number>): Stream<T>;
    count(): Datum<number>;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U>;
    pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never;
}
export interface Stream<T> extends StreamPartial<T> {
    fork(): Stream<T>;
    <U extends string | number>(attribute: Value<U>): U extends keyof T ? Stream<T[U]> : Stream<any>;
}
export interface SelectionPartial<T = any> extends StreamPartial<T> {
    fork(): Selection<T>;
    delete(): Datum<WriteResult<T>>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
}
export interface Selection<T = any> extends SelectionPartial<T>, Stream<T> {
    fork(): Selection<T>;
    <U extends string | number>(attribute: Value<U>): U extends keyof T ? Selection<T[U]> : Selection<any>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
}
export interface TablePartial<T = any> extends SelectionPartial<T> {
    fork(): never;
    get(key: any): SingleSelection<T>;
    getAll(key: any, options?: {
        index: string;
    }): Selection<T>;
    getAll(key: any, key2: any, options?: {
        index: string;
    }): Selection<T>;
    getAll(...key: (number | string | {
        index: string;
    })[]): Selection<T>;
    insert(obj: T, options?: {
        conflict: 'error' | 'replace' | 'update';
    }): Datum<WriteResult<T>>;
    indexCreate<U extends keyof T>(key: U): Datum<IndexChangeResult>;
    indexCreate(key: any): Datum<IndexChangeResult>;
    indexDrop<U extends keyof T>(key: U): Datum<IndexChangeResult>;
    indexDrop(key: any): Datum<IndexChangeResult>;
    indexList(): Datum<any[]>;
}
export interface Table<T = any> extends TablePartial<T>, Selection<T> {
    fork(): never;
}
export interface SchemaEntry {
    name: string;
    type: 'string' | 'bool' | 'number' | 'object' | 'any';
    index?: boolean;
}
export interface Database {
    tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult>;
    tableDrop(tableName: Value<string>): Datum<TableChangeResult>;
    tableList(): Datum<string[]>;
    table<T = any>(tableName: Value<string>): Table<T>;
    close(): Promise<void>;
}
