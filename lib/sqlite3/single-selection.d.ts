import { Value, SchemaEntry, SingleSelection } from '../types';
import { WrappedSQLite3Database } from './wrapper';
export declare function createSingleSelection<T = any>(db: WrappedSQLite3Database, tableName: Value<string>, key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>): SingleSelection<T>;
