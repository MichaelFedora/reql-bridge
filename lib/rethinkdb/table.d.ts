import { Table, TablePartial, IndexChangeResult, Value, Datum, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { RDatabase, RTable } from 'rethinkdb-ts';
import { RethinkStream } from './stream';
export declare class RethinkTablePartial<T = any> extends RethinkStream<T> implements TablePartial<T> {
    protected db: RDatabase;
    protected tableName: Value<string>;
    private getTable;
    protected getStream(): Promise<RTable<T>>;
    constructor(db: RDatabase, tableName: Value<string>);
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    fork(): never;
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
    indexCreate<U extends keyof T>(key: U): Datum<IndexChangeResult>;
    indexCreate(key: any): Datum<IndexChangeResult>;
    indexDrop<U extends keyof T>(key: U): Datum<IndexChangeResult>;
    indexDrop(key: any): Datum<IndexChangeResult>;
    indexList(): Datum<string[]>;
}
interface RethinkTable<T = any> extends RethinkTablePartial<T>, Table<T> {
}
export declare function createTable<T = any>(db: RDatabase, tableName: Value<string>): RethinkTable<T>;
export {};
