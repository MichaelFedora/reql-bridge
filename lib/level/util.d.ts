/// <reference types="node" />
import { LevelUp } from 'levelup';
import { EventEmitter } from 'stream';
import { Value } from '../types';
export declare function createPromiseArrayIteratable<T = any>(array: readonly Promise<T>[]): AsyncIterable<T>;
export declare function subdb(db: LevelUp, prefix: string): LevelUp<import("abstract-leveldown").AbstractLevelDOWN<any, any>, import("abstract-leveldown").AbstractIterator<any, any>>;
export declare function processStream<T = any, U = T>(stream: EventEmitter, ...modifiers: {
    type: 'test' | 'transform';
    exec: (entry: Value<any>) => Value<any>;
}[]): Promise<{
    key: any;
    value: U;
}[]>;
