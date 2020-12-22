import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { RPoolConnectionOptions } from 'rethinkdb-ts';
export declare class RethinkDatabase implements Database {
    private pool;
    private db;
    init(options: {
        logger?: string;
        db: string;
    } & RPoolConnectionOptions): Promise<void>;
    tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult>;
    tableDrop(tableName: Value<string>): Datum<TableChangeResult>;
    tableList(): Datum<string[]>;
    table<T = any>(tableName: Value<string>): Table<T>;
    close(): Promise<void>;
}
export declare function create(options: {
    logger?: string;
    db: string;
} & RPoolConnectionOptions): Promise<Database>;
export default create;
