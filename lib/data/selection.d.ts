import { Selection, Value, SchemaEntry, Datum, WriteResult } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { SQLite3Stream } from './stream';
export declare class SQLite3Selection<T = any> extends SQLite3Stream<T> implements Selection<T> {
    private keys;
    private index;
    private types;
    constructor(db: WrappedSQLite3Database, tableName: Value<string>, keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>);
    private makeSelection;
    count(): Datum<number>;
    delete(): Datum<WriteResult<T>>;
    run(): Promise<T[]>;
}
