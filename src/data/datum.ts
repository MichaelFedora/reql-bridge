import { DatumPartial, Value, Datum } from '../types';

export abstract class SQLite3DatumPartial<T = any> implements DatumPartial<T> {
  protected query: { readonly cmd: string, readonly params?: readonly Value<any>[] }[] = [];

  abstract _sel<U extends string | number>(attribute: Value<U>): U extends keyof T ? SQLite3DatumPartial<T[U]> : SQLite3DatumPartial<any>;

  // TRANSFORMATION

  map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): T extends any[] ? Datum<U[]> : never {
    this.query.push({ cmd: 'map', params: [predicate] });
    return this as any;
  }

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

  // STRING

  startsWith(str: Value<string>): T extends string ? Datum<boolean> : never {
    this.query.push({ cmd: 'startsWith', params: [str] });
    return this as any;
  }
  endsWith(str: Value<string>): T extends string ? Datum<boolean> : never {
    this.query.push({ cmd: 'endsWith', params: [str] });
    return this as any;
  }
  includes(str: Value<string>): T extends string ? Datum<boolean> : never {
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

  abstract run(): Promise<T>;
}
