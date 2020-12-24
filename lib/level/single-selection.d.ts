import { LevelUp } from 'levelup';
import { Value, SingleSelection } from '../types';
export declare function createSingleSelection<T = any>(db: LevelUp, tableName: Value<string>, key: Value<any>, index?: Value<string>): SingleSelection<T>;
