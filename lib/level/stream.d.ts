/// <reference types="node" />
import { EventEmitter } from 'stream';
import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';
export declare abstract class LevelStream<T = any> implements StreamPartial<T>, SelectableStream<T> {
    protected query: QueryEntry[];
    protected sel: Value<string | number>;
    protected abstract getStream(): Promise<EventEmitter>;
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableStream<T[U]> : SelectableStream<any>;
    count(): Datum<number>;
    abstract fork(): Stream<T>;
    run(): Promise<T[]>;
    protected compile(): Promise<{
        key: string;
        value: T;
    }[]>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T>;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U>;
    distinct(): Stream<T>;
    limit(n: Value<number>): Stream<T>;
    pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never;
}
