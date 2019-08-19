import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
export declare class SQLite3Database implements Database {
    private db;
    private readonly typemapsType;
    private readonly typemapsTableName;
    init(options?: {
        filename?: string;
        logger?: string;
    }): Promise<void>;
    private readonly typemaps;
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
    filename?: string;
    logger?: string;
}): Promise<Database>;
export default create;
