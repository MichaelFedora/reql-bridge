import { Selection, SelectionPartial, Value, SchemaEntry, Datum, WriteResult, DeepPartial } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { SQLite3Stream } from './stream';
export declare class SQLite3SelectionPartial<T = any> extends SQLite3Stream<T> implements SelectionPartial<T> {
    private keys;
    private index;
    private types;
    constructor(db: WrappedSQLite3Database, tableName: Value<string>, keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>);
    private makeSelection;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    count(): Datum<number>;
    delete(): Datum<WriteResult<T>>;
    fork(): Selection<T>;
    run(): Promise<T[]>;
}
export interface SQLite3Selection<T = any> extends SQLite3SelectionPartial<T>, Selection<T> {
}
export declare function createSelection<T = any>(db: WrappedSQLite3Database, tableName: Value<string>, keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>): SQLite3Selection<T>;
