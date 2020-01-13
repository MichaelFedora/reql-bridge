import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { Client, PoolConfig } from 'pg';
export declare class PostgresDatabase implements Database {
    private db;
    private readonly typemapsType;
    private readonly typemapsTableName;
    init(options?: {
        logger?: string;
        client?: Client;
    } & PoolConfig): Promise<void>;
    private get typemaps();
    readonly valueTypeMap: {
        string: string;
        bool: string;
        number: string;
        object: string;
    };
    tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult>;
    tableDrop(tableName: Value<string>): Datum<TableChangeResult>;
    tableList(): Datum<string[]>;
    table<T = any>(tableName: Value<string>): Table<T>;
    close(): Promise<void>;
}
export declare function create(options?: {
    logger?: string;
    client?: Client;
} & PoolConfig): Promise<Database>;
export default create;
