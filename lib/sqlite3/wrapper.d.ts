export interface WrappedSQLite3Database {
    close(): Promise<void>;
    configure(option: 'trace' | 'profile', cb: (val?: any) => void): void;
    configure(option: 'busyTimeout', value: number): void;
    run(sql: string, params?: {
        [key: string]: any;
    }): Promise<void>;
    get<T = any>(sql: string, params?: {
        [key: string]: any;
    }): Promise<T>;
    all<T = any>(sql: string, params?: {
        [key: string]: any;
    }): Promise<T[]>;
    each<T = any>(cb: (row: T) => void, sql: string, params?: {
        [key: string]: any;
    }): Promise<number>;
    exec(sql: string): Promise<void>;
    prepare(sql: string, params?: {
        [key: string]: any;
    }): Promise<WrappedSQLite3Statement>;
    getPrimaryKey(tableName: string): Promise<string>;
    getKeys(tableName: string): Promise<{
        name: string;
        primary?: boolean;
    }[]>;
}
export interface WrappedSQLite3Statement {
    bind(params: {
        [key: string]: any;
    }): Promise<void>;
    reset(): Promise<void>;
    finalize(): Promise<void>;
    run(params?: {
        [key: string]: any;
    }): Promise<void>;
    get<T = any>(params?: {
        [key: string]: any;
    }): Promise<T>;
    all<T = any>(params?: {
        [key: string]: any;
    }): Promise<T[]>;
    each<T = any>(cb: (row: T) => void, params?: {
        [key: string]: any;
    }): Promise<number>;
}
export declare function create(options?: {
    filename?: string;
    logger?: string;
}): Promise<WrappedSQLite3Database>;
export default create;
