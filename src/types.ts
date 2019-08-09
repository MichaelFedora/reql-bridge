export type DeepPartial<T> =
  | T
  | {
      [P in keyof T]?: T[P] extends Array<infer U1>
        ? Array<DeepPartial<U1>>
        : T[P] extends ReadonlyArray<infer U2>
        ? ReadonlyArray<DeepPartial<U2>>
        : DeepPartial<T[P]>
};

export interface ValueChange<T = any> {
  old_val?: T;
  new_val?: T;
}

export interface IndexChangeResult {
  created?: number;
  renamed?: number;
  dropped?: number;
}

export interface TableChangeResult {
  tables_created?: number;
  tables_dropped?: number;
}

export interface WriteResult<T = any> {
  deleted: number;
  skipped: number;
  errors: number;
  first_error?: string;
  inserted: number;
  replaced: number;
  unchanged: number;
  generated_keys?: string[];
  warnings?: string[];
  changes?: Array<ValueChange<T>>;
}

export type Value<T = any> = Datum<T> | Query<T> | T;

export interface Query<T = any> {
  run(): Promise<T>;
}

export interface DatumPartial<T = any> extends Query<T>  {

  // ANY

  eq(...value: Value<T>[]): Datum<boolean>;
  ne(...value: Value<T>[]): Datum<boolean>;

  // BOOLEAN

  or(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
  and(...bool: Value<boolean>[]): T extends boolean ? Datum<boolean> : never;
  not(): T extends boolean ? Datum<boolean> : never;

  // STRING

  startsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
  endsWith(str: Value<string>): T extends string ? Datum<boolean> : never;
  includes(str: Value<string>): T extends string ? Datum<boolean> : never;
  len(): T extends string ? Datum<number> : never;

  // NUMBER

  add(...values: Value<number>[]): T extends number ? Datum<number> : never;
  sub(...values: Value<number>[]): T extends number ? Datum<number> : never;
  mul(...values: Value<number>[]): T extends number ? Datum<number> : never;
  div(...values: Value<number>[]): T extends number ? Datum<number> : never;
  mod(...values: Value<number>[]): T extends number ? Datum<number> : never;

  // NUMBER LOGIC

  gt(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
  lt(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
  ge(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
  le(...values: Value<number>[]): T extends number ? Datum<boolean> : never;
}

export interface Datum<T = any> extends DatumPartial<T> {
  // Select sub-object / field
  <U extends string | number>(attribute: Value<U>): U extends keyof T
    ? Datum<T[U]>
    : Datum<any>;
}

export interface SingleSelectionPartial<T = any> extends DatumPartial<T> {
  update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
  replace(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>>;
  delete(): Datum<WriteResult<T>>;
}

export interface SingleSelection<T = any> extends SingleSelectionPartial<T>, Datum<T> { }

export interface Stream<T = any> extends Query<T[]> {
  count(): Datum<number>;
  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Stream<T>;
  distinct(): Stream<T>;
  limit(n: Value<number>): Query<T[]>; // don't do things after limiting
  pluck(...fields: string[]): Stream<Partial<T>>;
}

export interface Selection<T = any> extends Stream<T> {
  delete(): Datum<WriteResult<T>>;
  // allow filtering to delete, but not to insert/get/getall
  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T>;
}

export interface Table<T = any> extends Selection<T> {
  get(key: any): SingleSelection<T>;
  getAll(key: any, options?: { index: string }): Selection<T>;
  getAll(key: any, key2: any, options?: { index: string }): Selection<T>;
  getAll(...key: (number | string | { index: string })[]): Selection<T>;
  insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>>;
}

export interface SchemaEntry {
  name: string;
  type: 'string' | 'bool' | 'number' | 'object';
  index?: boolean;
}

export interface Database {
  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult>;
  tableDrop(tableName: Value<string>): Datum<TableChangeResult>;
  tableList(): Datum<string[]>;
  table<T = any>(tableName: Value<string>): Table<T>;
}
