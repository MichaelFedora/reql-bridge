import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { RStream } from 'rethinkdb-ts';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';
export declare abstract class RethinkStream<T = any> implements StreamPartial<T>, SelectableStream<T> {
    protected query: QueryEntry[];
    protected sel: Value<string | number>;
    protected abstract getStream(): Promise<RStream<T>>;
    constructor();
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableStream<T[U]> : SelectableStream<any>;
    count(): Datum<number>;
    abstract fork(): Stream<T>;
    run(): Promise<T[]>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T>;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U>;
    distinct(): Stream<T>;
    limit(n: Value<number>): Stream<T>;
    pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never;
    protected compile(): Promise<RStream<any>>;
}
