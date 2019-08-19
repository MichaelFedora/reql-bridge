import { Stream, StreamPartial, Value, Datum, DeepPartial } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { SelectableStream } from '../common/selectable';
import { QueryEntry } from '../common/query-entry';
export declare abstract class PostgresStream<T = any> implements StreamPartial<T>, SelectableStream<T> {
    protected db: WrappedPostgresDatabase;
    protected tableName: Value<string>;
    protected query: QueryEntry[];
    protected sel: Value<string | number>;
    constructor(db: WrappedPostgresDatabase, tableName: Value<string>);
    _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SelectableStream<T[U]> : SelectableStream<any>;
    abstract count(): Datum<number>;
    abstract fork(): Stream<T>;
    abstract run(): Promise<T[]>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T>;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U>;
    distinct(): Stream<T>;
    limit(n: Value<number>): Stream<T>;
    pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never;
    protected computeQuery(): Promise<{
        cmdsApplied: number;
        select?: string;
        post?: string;
        limit?: number;
        kill?: boolean;
    }>;
}
