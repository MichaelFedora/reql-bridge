import { Table, Value, Datum, SchemaEntry, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { SQLite3Stream } from './stream';
export declare class SQLite3Table<T = any> extends SQLite3Stream<T> implements Table<T> {
    private types;
    constructor(db: WrappedSQLite3Database, tableName: Value<string>, types: Value<SchemaEntry[]>);
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): this;
    count(): Datum<number>;
    delete(): Datum<WriteResult<T>>;
    get(key: any): SingleSelection<T>;
    getAll(...values: (number | string | {
        index: string;
    })[]): Selection<T>;
    insert(obj: T, options?: {
        conflict: 'error' | 'replace' | 'update';
    }): Datum<WriteResult<T>>;
    run(): Promise<T[]>;
}
