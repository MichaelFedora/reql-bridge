import { Table, TablePartial, Value, Datum, SchemaEntry, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { PostgresStream } from './stream';
export declare class PostgresTablePartial<T = any> extends PostgresStream<T> implements TablePartial<T> {
    private types;
    private readonly primaryIndexGetter;
    constructor(db: WrappedPostgresDatabase, tableName: Value<string>, types: Value<SchemaEntry[]>);
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
interface PostgresTable<T = any> extends PostgresTablePartial<T>, Table<T> {
}
export declare function createTable<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>, types: Value<SchemaEntry[]>): PostgresTable<T>;
export {};
