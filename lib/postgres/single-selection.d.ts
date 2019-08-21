import { Value, SchemaEntry, SingleSelection } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
export declare function createSingleSelection<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>, key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>): SingleSelection<T>;
