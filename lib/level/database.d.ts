import { Value, Database, SchemaEntry, Datum, TableChangeResult, Table } from '../types';
import { AbstractLevelDOWN } from 'abstract-leveldown';
export declare class LevelDatabase implements Database {
    private db;
    init<DB extends AbstractLevelDOWN = AbstractLevelDOWN>(options?: {
        logger?: string;
        store: DB;
        options?: any;
    }): Promise<void>;
    tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult>;
    tableDrop(tableName: Value<string>): Datum<TableChangeResult>;
    tableList(): Datum<string[]>;
    table<T = any>(tableName: Value<string>): Table<T>;
    close(): Promise<void>;
}
export declare function create<DB extends AbstractLevelDOWN = AbstractLevelDOWN>(options: {
    logger?: string;
    store: DB;
    options?: any;
}): Promise<Database>;
export default create;
