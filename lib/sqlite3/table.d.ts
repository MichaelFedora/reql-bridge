import { Table, TablePartial, Value, Datum, SchemaEntry, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { WrappedSQLite3Database } from './wrapper';
import { SQLite3Stream } from './stream';
export declare class SQLite3TablePartial<T = any> extends SQLite3Stream<T> implements TablePartial<T> {
    private types;
    private readonly primaryIndexGetter;
    constructor(db: WrappedSQLite3Database, tableName: Value<string>, types: Value<SchemaEntry[]>);
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    fork(): never;
    count(): Datum<number>;
    delete(): Datum<WriteResult<T>>;
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
    run(): Promise<T[]>;
}
interface SQLite3Table<T = any> extends SQLite3TablePartial<T>, Table<T> {
}
export declare function createTable<T = any>(db: WrappedSQLite3Database, tableName: Value<string>, types: Value<SchemaEntry[]>): SQLite3Table<T>;
export {};
