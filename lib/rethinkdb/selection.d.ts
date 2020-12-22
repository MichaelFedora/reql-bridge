import { Selection, SelectionPartial, Value, Datum, WriteResult, DeepPartial } from '../types';
import { RSelection } from 'rethinkdb-ts';
import { RethinkStream } from './stream';
export declare class RethinkSelectionPartial<T = any> extends RethinkStream<T> implements SelectionPartial<T> {
    protected selection: RSelection<T> | PromiseLike<RSelection<T>>;
    private getSelection;
    protected getStream(): Promise<RSelection<T>>;
    constructor(selection: RSelection<T> | PromiseLike<RSelection<T>>);
    fork(): Selection<T>;
    filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
    delete(): Datum<WriteResult<T>>;
}
export interface RethinkSelection<T = any> extends RethinkSelectionPartial<T>, Selection<T> {
}
export declare function createSelection<T = any>(selection: RSelection<T> | PromiseLike<RSelection<T>>): RethinkSelection<T>;
