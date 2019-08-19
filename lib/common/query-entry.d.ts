import { Value } from '../types';
export interface QueryEntry {
    readonly cmd: string;
    readonly params?: Value<any>[];
}
