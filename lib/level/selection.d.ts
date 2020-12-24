/// <reference types="node" />
import { EventEmitter } from 'stream';
import { LevelUp } from 'levelup';
import { Selection, SelectionPartial, Value, Datum, WriteResult, DeepPartial } from '../types';
import { LevelStream } from './stream';
export declare class LevelSelectionPartial<T = any> extends LevelStream<T> implements SelectionPartial<T> {
    protected db: LevelUp;
    protected tableName: Value<string>;
    private keys?;
    private index?;
    private getTable;
    protected getStream(): Promise<EventEmitter>;
    constructor(db: LevelUp, tableName: Value<string>, keys?: Value<any[]>, index?: Value<string>);
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    delete(): Datum<WriteResult<T>>;
    fork(): Selection<T>;
}
export interface LevelSelection<T = any> extends LevelSelectionPartial<T>, Selection<T> {
}
export declare function createSelection<T = any>(db: LevelUp, tableName: Value<string>, keys?: Value<any[]>, index?: Value<string>): LevelSelection<T>;
