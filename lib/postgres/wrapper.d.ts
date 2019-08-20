import { Client, PoolConfig, QueryResultBase } from 'pg';
export interface WrappedPostgresDatabase {
    close(): Promise<void>;
    query<T = any>(query: string, values?: any[]): Promise<ActualQueryResult<T>>;
    get<T = any>(query: string, values?: any[]): Promise<T>;
    all<T extends any[] = any[]>(query: string, values?: any[]): Promise<T>;
    exec(query: string, values?: any[]): Promise<void>;
    getPrimaryKey(tableName: string): Promise<string>;
    getKeys(tableName: string): Promise<{
        name: string;
        primary?: boolean;
    }[]>;
}
interface ActualQueryResult<T = any> extends QueryResultBase {
    rows: T[];
}
export declare function create(options?: {
    logger?: string;
    client?: Client;
} & PoolConfig): Promise<WrappedPostgresDatabase>;
export default create;
