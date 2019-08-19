import { Selection, SelectionPartial, Value, SchemaEntry, Datum, WriteResult, DeepPartial } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { PostgresStream } from './stream';
export declare class PostgresSelectionPartial<T = any> extends PostgresStream<T> implements SelectionPartial<T> {
    private keys;
    private index;
    private types;
    constructor(db: WrappedPostgresDatabase, tableName: Value<string>, keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>);
    private makeSelection;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    count(): Datum<number>;
    delete(): Datum<WriteResult<T>>;
    fork(): Selection<T>;
    run(): Promise<T[]>;
}
export interface PostgresSelection<T = any> extends PostgresSelectionPartial<T>, Selection<T> {
}
export declare function createSelection<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>, keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>): PostgresSelection<T>;
