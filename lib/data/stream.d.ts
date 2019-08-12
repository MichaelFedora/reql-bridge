import { Stream, Value, Datum, DeepPartial } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
export declare abstract class SQLite3Stream<T = any> implements Stream<T> {
    protected db: WrappedSQLite3Database;
    protected tableName: Value<string>;
    protected query: {
        cmd: string;
        params?: any[];
    }[];
    constructor(db: WrappedSQLite3Database, tableName: Value<string>);
    abstract count(): Datum<number>;
    abstract run(): Promise<T[]>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): this;
    map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U>;
    distinct(): Stream<T>;
    limit(n: Value<number>): Stream<T>;
    pluck(...fields: string[]): Stream<Partial<T>>;
    protected computeQuery(): Promise<{
        select?: string;
        post?: string;
        limit?: number;
        kill?: boolean;
    }>;
}
