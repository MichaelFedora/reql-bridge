/// <reference types="node" />
import { EventEmitter } from 'stream';
import { LevelUp } from 'levelup';
import { Table, TablePartial, IndexChangeResult, Value, Datum, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { LevelStream } from './stream';
export declare class LevelTablePartial<T = any> extends LevelStream<T> implements TablePartial<T> {
    protected db: LevelUp;
    protected tableName: Value<string>;
    constructor(db: LevelUp, tableName: Value<string>);
    getStream(): Promise<EventEmitter>;
    getTable(): Promise<LevelUp>;
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
interface LevelTable<T = any> extends LevelTablePartial<T>, Table<T> {
}
export declare function createTable<T = any>(db: LevelUp, tableName: Value<string>): LevelTable<T>;
export {};
