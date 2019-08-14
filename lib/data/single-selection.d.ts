import { SingleSelectionPartial, Value, SchemaEntry, Datum, WriteResult, DeepPartial, SingleSelection } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { SelectableDatum } from './selectable';
import { SQLite3DatumPartial } from './datum';
declare class SQLite3SingleSelectionPartial<T = any> extends SQLite3DatumPartial<T> implements SingleSelectionPartial<T>, SelectableDatum<T> {
    private db;
    private tableName;
    private key;
    private index;
    private types;
    constructor(db: WrappedSQLite3Database, tableName: Value<string>, key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>);
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableDatum<T[U]> : SelectableDatum<any>;
    readonly cmds: string[];
    update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
    replace(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
    delete(): Datum<WriteResult<T>>;
    fork(): SingleSelection<T>;
    run(): Promise<T>;
}
export interface SQLite3SingleSelection<T = any> extends SQLite3SingleSelectionPartial<T>, SingleSelection<T> {
}
export declare function createSingleSelection<T = any>(db: WrappedSQLite3Database, tableName: Value<string>, key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>): SQLite3SingleSelection<T>;
export {};
