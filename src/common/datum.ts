import { DatumPartial, Value, Datum, DeepPartial } from '../types';
import { QueryEntry } from './query-entry';

export abstract class AbstractDatumPartial<T = any> implements DatumPartial<T> {
  protected query: QueryEntry[] = [];

  abstract _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? DatumPartial<T[U]> : DatumPartial<any>;

  // LOGIC

  eq(...values: Value<T>[]): Datum<boolean> {
    this.query.push({ cmd: 'eq', params: values });
    return this as any;
  }

  ne(...values: Value<T>[]): Datum<boolean> {
    this.query.push({ cmd: 'ne', params: values });
    return this as any;
  }

  // BOOLEAN

  or(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never {
    this.query.push({ cmd: 'or', params: bool });
    return this as any;
  }

  and(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never {
    this.query.push({ cmd: 'and', params: bool });
    return this as any;
  }
  not(): T extends boolean ? Datum<boolean> : never {
    this.query.push({ cmd: 'not' });
    return this as any;
  }

  do<U = any>(func: (value: Datum<T>) => Value<U>): Datum<U> {
    this.query.push({ cmd: 'do', params: [func] });
    return this as any;
  }

  branch<U = any, V = any>(trueAction: Value<U> | (() => Value<U>), falseAction: Value<V> | (() => Value<V>)): Datum<U | V>;
  branch<U = any, V = any, W = any>(trueAction: Value<U> | (() => Value<U>),
      test2: Value<any>, test2Action: Value<V> | (() => Value<V>),
      falseAction: Value<W> | (() => Value<W>)): Datum<U | V | W>;
  branch<U = any>(trueAction: Value<any> | (() => Value<any>),
    ...testsActionsAndFalseAction: (Value<any> | (() => Value<any>))[]): Datum<U> {
    if(testsActionsAndFalseAction.length % 2 < 1)
      throw new Error('Must have an action for every test, and a false action at the end!');
    this.query.push({ cmd: 'branch', params: [trueAction, ...testsActionsAndFalseAction] });
    return this as any;
  }

  // STRING

  startsWith(str: Value<string>): T extends string ? Datum<boolean> : never {
    this.query.push({ cmd: 'startsWith', params: [str] });
    return this as any;
  }
  endsWith(str: Value<string>): T extends string ? Datum<boolean> : never {
    this.query.push({ cmd: 'endsWith', params: [str] });
    return this as any;
  }
  substr(str: Value<string>): T extends string ? Datum<boolean> : never {
    this.query.push({ cmd: 'includes', params: [str] });
    return this as any;
  }
  len(): T extends string ? Datum<number> : never {
    this.query.push({ cmd: 'length' });
    return this as any;
  }

  // NUMBER

  add(...values: Value<number>[]): T extends number ? Datum<number> : never {
    this.query.push({ cmd: 'add', params: values });
    return this as any;
  }
  sub(...values: Value<number>[]): T extends number ? Datum<number> : never {
    this.query.push({ cmd: 'sub', params: values });
    return this as any;
  }
  mul(...values: Value<number>[]): T extends number ? Datum<number> : never {
    this.query.push({ cmd: 'mul', params: values });
    return this as any;
  }
  div(...values: Value<number>[]): T extends number ? Datum<number> : never {
    this.query.push({ cmd: 'div', params: values });
    return this as any;
  }
  mod(...values: Value<number>[]): T extends number ? Datum<number> : never {
    this.query.push({ cmd: 'mod', params: values });
    return this as any;
  }

  gt(...values: Value<number>[]): T extends number ? Datum<boolean> : never {
    this.query.push({ cmd: 'gt', params: values });
    return this as any;
  }
  lt(...values: Value<number>[]): T extends number ? Datum<boolean> : never {
    this.query.push({ cmd: 'lt', params: values });
    return this as any;
  }
  ge(...values: Value<number>[]): T extends number ? Datum<boolean> : never {
    this.query.push({ cmd: 'ge', params: values });
    return this as any;
  }
  le(...values: Value<number>[]): T extends number ? Datum<boolean> : never {
    this.query.push({ cmd: 'le', params: values });
    return this as any;
  }

  // ARRAY

  count(): T extends any[] ? Datum<number> : never {
    this.query.push({ cmd: 'count' });
    return this as any;
  }
  difference(value: Value<T>): T extends any[] ? Datum<boolean> : never {
    this.query.push({ cmd: 'difference', params: [value] });
    return this as any;
  }
  contains<U = any>(value: Value<U>): T extends U[] ? Datum<boolean> : never {
    this.query.push({ cmd: 'contains', params: [value] });
    return this as any;
  }
  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): T extends any[] ? Datum<T> : never {
    this.query.push({ cmd: 'filter', params: [predicate] });
    return this as any;
  }
  limit(n: Value<number>): T extends any[] ? Datum<T> : never {
    this.query.push({ cmd: 'limit', params: [n] });
    return this as any;
  }
  pluck<U>(...fields: string[]): T extends U[] ? Datum<Partial<U>[]> : never {
    this.query.push({ cmd: 'pluck', params: fields });
    return this as any;
  }
  map<U, V = any>(predicate: (doc: Datum<U>) => Datum<V>): T extends U[] ? Datum<V[]> : never {
    this.query.push({ cmd: 'map', params: [predicate] });
    return this as any;
  }

  // QUERY

  abstract fork(): Datum<T>;
  abstract run(): Promise<T>;
}
