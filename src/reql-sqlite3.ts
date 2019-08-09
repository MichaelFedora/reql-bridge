import 'source-map-support/register';
import { getLogger, Logger } from '@log4js-node/log4js-api';
import { create as createSQLite3DB, WrappedSQLite3Database } from './sqlite3-wrapper';
import {
  DatumPartial, Datum,
  Value, Query, Stream,
  SingleSelectionPartial, SingleSelection,
  DeepPartial, WriteResult, TableChangeResult, SchemaEntry,
  Database, Table, Selection,
} from './types';

// =========================
// ===== UTIL FUNCTIONS ====
// =========================

function createQuery<T = any>(run: () => Promise<T>): Query<T> {
  return { run };
}

async function resolveHValue<T = any>(value: Value<T>): Promise<T> {
  if(typeof value['run'] === 'function')
    return await (value as any).run();
  return value as any;
}

function _dptpRecurse<T = any>(doc: Datum<T>, obj: any): Datum<boolean> {
  let statement: Datum<boolean>;
  for(const k in obj) if(obj[k] != null) {
    if(typeof obj[k] === 'object')
      statement = statement ? statement.and(_dptpRecurse(doc(k), obj[k])) : _dptpRecurse(doc(k), obj[k]);
    else
      statement = statement ? statement.and(doc(k).eq(obj[k])) : doc(k).eq(obj[k]);
  }
  return statement;
}

function deepPartialToPredicate<T = any>(obj: DeepPartial<T>): (doc: Datum<T>) => Datum<boolean> {
  return (doc: Datum<T>) => _dptpRecurse(doc, obj);
}

function safen(value: any) {
  switch(typeof(value)) {
    case 'number':
        return value;
    case 'string':
    case 'object':
    default:
      let str = JSON.stringify(value).replace(/'/g, `''`).replace(/\\"/g, '"').replace(/^"|"$/g, `'`);
      if(str[0] !== `'`) str = `'` + str;
      if(str[str.length - 1] !== `'`) str += `'`;
      return str;
  }
}

function coerceCorrectReturn<T = any>(obj: any, types: SchemaEntry[]): T {
  const boop: any = { }; // make boop[key] null or skip?
  for(const key in obj) if(obj[key] == null) { boop[key] = null; } else {
    const entry = types.find(a => a.name === key);
    switch(entry && entry.type) {
      case 'string':
        boop[key] = obj[key];
        break;
      case 'number':
        boop[key] = Number(obj[key]);
        break;
      case 'bool':
        boop[key] = Boolean(obj[key]);
        break;
      case 'object':
        boop[key] = JSON.parse(obj[key]);
        break;
      case 'any':
        try {
          boop[key] = JSON.parse(obj[key]);
        } catch(e) {
          boop[key] = obj[key];
        }
        break;
      default:
        throw new Error('Unknown type for key "' + key + '"!');
    }
  }
  return boop;
}

function makeSelector<T = any>(datum: SQLite3DatumPartial<T>): Datum<T> {
  const sqliteDatum: any = function(attribute: Value<string | number>): Datum<any> {
    return makeSelector(datum._sel(attribute));
  };
  sqliteDatum.__proto__ = datum;

  return sqliteDatum;
}

// =========================
// ===== ABSTRACT DATUM ====
// =========================

abstract class SQLite3DatumPartial<T = any> implements DatumPartial<T> {
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

// =========================
// ====== QUERY DATUM ======
// =========================

class SQLite3QueryDatumPartial<T = any> extends SQLite3DatumPartial<T> implements DatumPartial<T> {
  constructor() { super(); }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3QueryDatumPartial<T[U]> : SQLite3QueryDatumPartial<any> {

    const child = new SQLite3QueryDatumPartial<T>();
    child.query = this.query.slice();
    child.query.push({ cmd: 'sel', params: [attribute] });
    return child as any;
  }

  async run(): Promise<T> {
    if(this.query.length)
      this.query = [];
    return null;
  }

  async compile(): Promise<string> {
    let query = '';
    let sel = '';
    let sel2 = '';

    for(const q of this.query) {

      const params = q.params && q.params.slice();
      if(params) { // reduce parameters
        for(let i = 0; i < q.params.length; i++) {
          if(params[i].compile)
            params[i] = safen(await params[i].compile());
          else
            params[i] = safen(await resolveHValue(params[i]));
        }
      }

      switch(q.cmd) {
        case 'sel':
          if(sel2)
            throw new Error('Cannot filter via sub-objects in SQLite3!');
          else if(sel)
            sel2 = params[0].slice(1, -1); // get rid of the double quotes
          else
            sel = params[0].slice(1, -1);
          break;

        case 'map':
          throw new Error('Cannot map filter documents in SQLite3!');

        case 'not':
          if(query)
            query = 'NOT (' + query + ')';
          else
            query += 'NOT ';
          break;

        case 'eq':
          if(!sel)
            throw new Error('Cannot start a filter with "eq"!');
          if(query)
            query += ` AND `;
          if(sel2)
            query += `${sel} LIKE '%"${sel2}":${params[0].replace(/^'|'$/g, '"')}%'`;
          else
            query += `${sel} = ${params[0]}`;

          sel = sel2 = '';
          break;
        case 'ne':
            if(!sel)
              throw new Error('Cannot start a filter with "ne"!');
            if(query)
              query += ` AND `;
            if(sel2)
              query += `${sel} NOT LIKE '%"${sel2}":${params[0]}%`;
            else
              query += `${sel} != ${params[0]}`;

            sel = sel2 = '';
          break;

        case 'startsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${'"%' + (params[0] as string).slice(1)})`;
          break;
        case 'endsWith':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${(params[0] as string).slice(0, -1) + '%"'})`;
          break;
        case 'includes':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `(${sel} LIKE ${'"%' + (params[0] as string).slice(1, -1) + '%"'})`;
          break;
        case 'length':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          sel = `LENGTH(${sel})`;
          break;

        case 'or':
          if(!query)
            throw new Error('Cannot start a filter with "or"!');
          else
            query += ' OR (' + params[0] + ')';
          break;
        case 'and':
          if(!query)
            throw new Error('Cannot start a filter with "and"!');
          else
            query += ' AND (' + params[0] + ')';
          break;

        case 'add':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} + ${params[0]})`;
          else
            throw new Error('Cannot use "add" without something selected!');
          break;
        case 'sub':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} - ${params[0]})`;
          else
            throw new Error('Cannot use "sub" without something selected!');
          break;
        case 'mul':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} * ${params[0]})`;
          else
            throw new Error('Cannot use "mul" without something selected!');
          break;
        case 'div':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} / ${params[0]})`;
          else
            throw new Error('Cannot use "div" without something selected!');
          break;
          case 'div':
            if(sel2)
              throw new Error('Can only use "eq" and "ne" on sub-object!');
            else if(sel)
              sel = `(${sel} % ${params[0]})`;
            else
              throw new Error('Cannot use "mod" without something selected!');
            break;

        case 'gt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} > ${params[0]})`;
          else
            throw new Error('Cannot use "gt" without something selected!');
          break;

        case 'lt':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} < ${params[0]})`;
          else
            throw new Error('Cannot use "lt" without something selected!');
          break;
        case 'ge':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} >= ${params[0]})`;
          else
            throw new Error('Cannot use "ge" without something selected!');
          break;
        case 'le':
          if(sel2)
            throw new Error('Can only use "eq" and "ne" on sub-object!');
          else if(sel)
            sel = `(${sel} <= ${params[0]})`;
          else
            throw new Error('Cannot use "le" without something selected!');
          break;

        default:
          throw new Error(`Cannot perform command "${q.cmd}" on this (query) datum!`);
      }
    }
    if(query && sel)
      return query + ' AND ' + sel;
    else if(sel)
      return sel;
    else
      return query;
  }
}

interface SQLite3QueryDatum<T = any> extends SQLite3QueryDatumPartial<T>, Datum<T> { }

function createQueryDatum<T = any>(): SQLite3QueryDatum<T> {
  return makeSelector<T>(new SQLite3QueryDatumPartial()) as any;
}

// =========================
// ====== STATIC DATUM =====
// =========================

class SQLite3StaticDatumPartial<T = any> extends SQLite3DatumPartial<T> implements DatumPartial<T> {

  constructor(private initialValue: Value<T>) {
    super();
  }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3StaticDatumPartial<T[U]> : SQLite3StaticDatumPartial<any> {

    const child = new SQLite3StaticDatumPartial<T>(this.initialValue);
    child.query = this.query.slice();
    child.query.push({ cmd: 'sel', params: [attribute] });
    return child as any;
  }

  // QUERY execute

  static async run<T>(query: { cmd: string, params?: readonly Value<any>[] }[], initialValue: Value<T>): Promise<T> {
    let value: any = await resolveHValue(initialValue);

    for(const q of query) {

      const params = q.params.slice();
      if(params) { // reduce parameters
        for(let i = 0; i < q.params.length; i++)
          params[i] = await resolveHValue(params[i]);
      }

      switch(q.cmd) {

        case 'map':
          if(!(value instanceof Array))
            throw new Error('Cannot map a non-array value!');
          const newv = [];
          for(const subv of value) {
            newv.push(await resolveHValue((params[0] as (doc: Datum<typeof subv>) => Datum<any>)(createStaticDatum(subv))));
          }
          value = newv;
          break;

        case 'sel':
            value = value[params[0]];
          break;

        case 'eq':
            value = !params.find(a => a !== value);
          break;
        case 'ne':
            value = Boolean(params.find(a => a !== value));
          break;

        case 'or':
          value = Boolean(params.reduce((acc, v) => acc || v, value));
          break;
        case 'and':
          value = Boolean(params.reduce((acc, v) => acc && v, value));
          break;

        case 'add':
          value = params.reduce((acc, v) => acc + value, value);
          break;
        case 'sub':
          value = params.reduce((acc, v) => acc - value, value);
          break;
        case 'mul':
          value = params.reduce((acc, v) => acc * v, value);
          break;
        case 'div':
          value = params.reduce((acc, v) => acc / v, value);
          break;
        case 'mod':
          value = params.reduce((acc, v) => acc % v, value);
          break;

        case 'gt':
          value = !params.find((v, i, arr) => {
            if(i === 0)
              return value <= v;
            else return arr[i - 1] <= v;
          });
          break;
        case 'lt':
          value = !params.find((v, i, arr) => {
            if(i === 0)
              return value >= v;
            else return arr[i - 1] >= v;
          });
          break;
        case 'ge':
          value = !params.find((v, i, arr) => {
            if(i === 0)
              return value < v;
            else return arr[i - 1] < v;
          });
          break;
        case 'le':
          value = !params.find((v, i, arr) => {
            if(i === 0)
              return value > v;
            else return arr[i - 1] > v;
          });
          break;

        default:
          throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
      }
    }
    return value;
  }

  async run(): Promise<T> {
    const ret = await SQLite3StaticDatumPartial.run<T>(this.query, this.initialValue);
    this.query = [];
    return ret;
  }
}

interface SQLite3StaticDatum<T = any> extends SQLite3StaticDatumPartial<T>, Datum<T> { }

function createStaticDatum<T = any>(initialValue: Value<T> | Value<T>): SQLite3StaticDatum<T> {
  return makeSelector<T>(new SQLite3StaticDatumPartial<T>(initialValue)) as any;
}

// =========================
// ==== SINGLE SELECTION ===
// =========================

class SQLite3SingleSelectionPartial<T = any> extends SQLite3DatumPartial<T> implements SingleSelectionPartial<T> {
  constructor(private db: WrappedSQLite3Database, private tableName: Value<string>,
    private key: Value<any>, private index: Value<string>, private types: Value<SchemaEntry[]>) { super(); }

  _sel<U extends string | number>(attribute: Value<U>):
    U extends keyof T ? SQLite3DatumPartial<T[U]> : SQLite3DatumPartial<any> {

    const child = new SQLite3SingleSelectionPartial<T>(this.db, this.tableName, this.key, this.index, this.types);
    child.query = this.query.slice();
    child.query.push({ cmd: 'sel', params: [attribute] });
    return child as any;
  }

  readonly cmds = ['sel', 'update', 'replace', 'delete'];

  // Selection

  update(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'update', params: [obj] });
    return this as any;
  }

  replace(obj: Value<DeepPartial<T>>): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'replace', params: [obj] });
    return this as any;
  }

  delete(): Datum<WriteResult<T>> {
    this.query.push({ cmd: 'delete' });
    return this as any;
  }

  // Query

  async run(): Promise<T> {
    const key = await resolveHValue(this.key);
    const index = await resolveHValue(this.index);
    const tableName = await resolveHValue(this.tableName);

    if(!this.query || !this.query.length) {
      return this.db.get<T>(`SELECT * FROM [${tableName}] WHERE [${index}]=${safen(key)}`)
        .then(async r => coerceCorrectReturn<T>(r, await resolveHValue(this.types)));
    }

    let cmd = '';
    const params: any[] = [];
    if(this.cmds.includes(this.query[0].cmd)) {
      const q = this.query.shift();
      cmd = q.cmd;
      for(const p of q.params)
        params.push(await resolveHValue(p));

      if((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
        cmd = 'delete';
      }
    }

    let query = '';
    let sel = '';

    switch(cmd) {
      case 'sel':
        query = `SELECT ${params[0]} FROM [${tableName}] WHERE [${index}]=${safen(key)}`;
        sel = params[0];
        break;
      case 'update':
        let set = '';
        for(const k in params[0]) if(params[0][k] != null) {
          if(!set)
            set = `[${k}]=${params[0][k]}`;
          else
            set += `, [${k}]=${params[0][k]}`;
        }
        query = `UPDATE [${tableName}] SET ${set} WHERE [${index}]=${safen(key)}`;
        break;
      case 'replace':
        let repKeys = '';
        let repValues = '';
        for(const k in params[0]) if(params[0][k] != null) {
          if(!repKeys) {
            repKeys = `[${k}]`;
            repValues = `${params[0][k]}`;
          } else {
            repKeys += `, [${k}]`;
            repValues += `, ${params[0][k]}`;
          }
        }
        query = `REPLACE INTO [${tableName}] (${repKeys}) VALUES (${repValues}) WHERE ${[index]}=${safen(key)}`;
        break;
      case 'delete':
        query = `DELETE FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
        break;

      default:
        query = `SELECT * FROM [${tableName}] WHERE ${[index]}=${safen(key)}`;
    }

    const value = await this.db.get<T>(query).then(async r => coerceCorrectReturn<T>(r, await resolveHValue(this.types)))
      .then(a => sel ? a[sel] : a);

    if(this.query.length > 0) {
      const ret = await SQLite3StaticDatumPartial.run(this.query, value);
      this.query = [];
      return ret;
    } else {
      return value;
    }
  }
}

interface SQLite3SingleSelection<T = any> extends SQLite3SingleSelectionPartial<T>, SingleSelection<T> { }

function createSingleSelection<T = any>(db: WrappedSQLite3Database, tableName: Value<string>,
  key: Value<any>, index: Value<string>, types: Value<SchemaEntry[]>): SQLite3SingleSelection<T> {

  return makeSelector(new SQLite3SingleSelectionPartial<T>(db, tableName, key, index, types)) as any;
}

// =========================
// ======= STREAM ==========
// =========================

abstract class SQLite3Stream<T = any> implements Stream<T> {

  protected query: { cmd: string, params?: any[] }[] = [];

  constructor(protected db: WrappedSQLite3Database, protected tableName: Value<string>) { }

  abstract count(): Datum<number>;
  abstract async run(): Promise<T[]>;

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): this {
    this.query.push({ cmd: 'filter', params: [predicate] });
    return this;
  }

  map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U> {
    this.query.push({ cmd: 'map', params: [predicate] });
    return this as any;
  }

  distinct(): Stream<T> {
    if(!this.query.find(q => q.cmd === 'distinct'))
      this.query.push({ cmd: 'distinct' });
    return this;
  }

  limit(n: Value<number>): Stream<T> {
    if(this.query.find(a => a.cmd === 'imit'))
      throw new Error('Cannot set a limit after having already set one!');

    this.query.push({ cmd: 'limit', params: [n] });
    return this as any;
  }

  pluck(...fields: string[]): Stream<Partial<T>> {
    const idx = this.query.findIndex(q => q.cmd === 'pluck');
    if(idx >= 0) {
      this.query[idx].params = this.query[idx].params.concat(
          fields.filter(a => !this.query[idx].params.includes(a)));
    } else {
      this.query.push({ cmd: 'pluck', params: fields });
    }
    return this as any;
  }

  protected async computeQuery(): Promise<{ select?: string, post?: string, limit?: number, kill?: boolean }> {
    if(!this.query.length)
      return { select: '*' };
    const tableName = await resolveHValue(this.tableName);
    const primaryKey = await this.db.getPrimaryKey(tableName);

    const distinct = Boolean(this.query.find(q => q.cmd === 'distinct'));
    const pluck = this.query.find(q => q.cmd === 'pluck');
    const select = (distinct ? 'DISTINCT ' : '') + (pluck ? pluck.params.map(a => `[${a}]`).join(', ') : '*');

    let post = ``;
    let limit = undefined;
    let cmdsApplied = 0;
    for(const q of this.query) {
      switch(q.cmd) {
        case 'filter':
          const pred: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>) = q.params[0];

          let predfoo: ((doc: Datum<T>) => Value<boolean>);
          if(typeof pred === 'function')
            predfoo = pred as ((doc: Datum<T>) => Value<boolean>);
          else if(typeof pred === 'object')
            predfoo = deepPartialToPredicate(pred);
          else
            predfoo = () => Boolean(pred);

          const res = predfoo(createQueryDatum<T>());
          if(typeof (res as any)['compile'] === 'function') {
            const query = await (res as any).compile();

            if(!post)
              post = `[${primaryKey}] in (SELECT [${primaryKey}] FROM [${tableName}] WHERE ${query})`;
            else
              post += ` AND (${query})`;

          } else if(!res) {
            return { kill: true };
          } // if it's true, we're g2g anyways
          cmdsApplied++;
          break;
        case 'map':
        case 'distinct':
        case 'pluck':
          break;
        case 'limit':
          limit = q.params[0];
          break;
        default:
          if(cmdsApplied)
            return { select, post: post + ')', limit };
          else return { select, limit };
      }
    }
    if(cmdsApplied)
      return { select, post, limit };
    else
      return { select, limit };
  }
}

// =========================
// ======= SELECTION =======
// =========================

class SQLite3Selection<T = any> extends SQLite3Stream<T> implements Selection<T> {

  constructor(db: WrappedSQLite3Database, tableName: Value<string>,
    private keys: Value<any[]>, private index: Value<string>, private types: Value<SchemaEntry[]>) {
    super(db, tableName);
  }

  private async makeSelection(): Promise<string> {
    const keys = await resolveHValue(this.keys);
    const index = await resolveHValue(this.index);
    let selection = '';
    for(const key of keys) {
      if(!selection) {
        selection = `[${index}]=${safen(key)}`;
      } else {
        selection += `OR [${index}]=${safen(key)}`;
      }
    }
    return selection;
  }

  count(): Datum<number> {
    return createStaticDatum(createQuery(async() => {
      const tableName = await resolveHValue(this.tableName);
      const selection = await this.makeSelection();
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return 0;

        const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
        return this.db.get<{
          'COUNT(*)': number
        }>(`SELECT COUNT(*) FROM [${tableName}] WHERE ${selection}${poost}`).then(a => a['COUNT(*)']);
      }
      return this.db.get<{ 'COUNT(*)': number }>(`SELECT COUNT(*) FROM [${tableName}] WHERE ${selection}`).then(a => a['COUNT(*)']);
    }));
  }

  delete(): Datum<WriteResult<T>> {
    return createStaticDatum(createQuery<WriteResult<T>>(async() => {
      const tableName = await resolveHValue(this.tableName);
      const selection = await this.makeSelection();
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };

        const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
        return this.db.exec(`DELETE FROM [${tableName}] WHERE ${selection}${poost}`).then(
          () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      }
      return this.db.exec(`DELETE FROM [${tableName}] WHERE ${selection}`).then(
        () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  async run(): Promise<T[]> {
    const tableName = await resolveHValue(this.tableName);
    const selection = await this.makeSelection();
    if(this.query.length) {
      const { select, post, kill, limit } = await this.computeQuery();

      if(kill) return [];

      const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
      return this.db.all<T>(`SELECT ${select} FROM [${tableName}] WHERE ${selection}${poost}`).then(async rs => {
        const types = await resolveHValue(this.types);
        let res: any[] = rs.map(r => coerceCorrectReturn<T>(r, types));
        const maps = this.query.filter(a => a.cmd === 'map');
        for(const map of maps)
          res = await Promise.all(res.map(r => resolveHValue((map.params[0] as (doc: Datum<typeof r>) => Datum<any>)(createStaticDatum(r)))));

        this.query = [];
        return res;
      });
    }
    return this.db.all<T>(`SELECT * FROM [${tableName}] WHERE ${selection}`).then(async rs => {
      const types = await resolveHValue(this.types);
      return rs.map(r => coerceCorrectReturn<T>(r, types));
    });
  }
}

// =========================
// ========= TABLE =========
// =========================

class SQLite3Table<T = any> extends SQLite3Stream<T> implements Table<T> {

  constructor(db: WrappedSQLite3Database, tableName: Value<string>, private types: Value<SchemaEntry[]>) { super(db, tableName); }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): this {
    this.query.push({ cmd: 'filter', params: [predicate] });
    return this;
  }

  count(): Datum<number> {
    return createStaticDatum(createQuery(async() => {
      const tableName = await resolveHValue(this.tableName);
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return 0;

        const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
        return this.db.get<{ 'COUNT(*)': number }>(`SELECT COUNT(*) FROM [${tableName}]${poost}`).then(a => a['COUNT(*)']);
      }
      return this.db.get<{ 'COUNT(*)': number }>(`SELECT COUNT(*) FROM [${tableName}]`).then(a => a['COUNT(*)']);
    }));
  }

  delete(): Datum<WriteResult<T>> {
    return createStaticDatum(createQuery<WriteResult<T>>(async() => {
      const tableName = await resolveHValue(this.tableName);
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };

        const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
        return this.db.exec(`DELETE FROM [${tableName}]${poost}`).then(
          () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      }

      return this.db.exec(`DELETE TABLE IF EXISTS [${tableName}]`).then(
        () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  get(key: any): SingleSelection<T> {
    return createSingleSelection(this.db, this.tableName, key, createQuery(async () => {
      const tableName = await resolveHValue(this.tableName);
      return this.db.getPrimaryKey(tableName);
    }), this.types);
  }

  getAll(...values: (number | string | { index: string })[]): Selection<T> {
    let index: Value<string>;
    if(typeof values[values.length - 1] === 'object') {
      index = (values.pop() as { index: string }).index;
    } else {
      index = createQuery(async () => {
        const tableName = await resolveHValue(this.tableName);
        return this.db.getPrimaryKey(tableName);
      });
    }
    return new SQLite3Selection(this.db, this.tableName, values, index, this.types);
  }

  insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
    return createStaticDatum(createQuery(async () => {
      const tableName = await resolveHValue(this.tableName);

      let repKeys = '';
      let repValues = '';
      for(const k in obj) if(obj[k] != null) {
        if(!repKeys) {
          repKeys = `[${k}]`;
          repValues = `${safen(obj[k])}`;
        } else {
          repKeys += `, [${k}]`;
          repValues += `, ${safen(obj[k])}`;
        }
      }

      let query = `INSERT`;
      if(options && options.conflict === 'replace')
          query += ' OR REPLACE';
      query += ` INTO [${tableName}] (${repKeys}) VALUES (${repValues})`;

      if(options && options.conflict === 'update') {
        const primaryKey = await this.db.getPrimaryKey(tableName);
        let set = '';
        for(const k in obj) if(obj[k] != null) {
          if(!set)
            set = `[${k}]=excluded.[${k}]`;
          else
            set += `, [${k}]=excluded.[${k}]`;
        }
        query += ` ON CONFLICT([${primaryKey}]) DO UPDATE SET ${set}`;
      }
      const ret: WriteResult<T> = await this.db.exec(query).then(
        () => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      return ret;
    }));
  }

  async run(): Promise<T[]> {
    const tableName = await resolveHValue(this.tableName);
    if(this.query.length) {
      const { select, post, kill, limit } = await this.computeQuery();

      if(kill) return [];

      const poost = (post ? ' WHERE ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
      return this.db.all<T>(`SELECT ${select} FROM [${tableName}]${poost}`).then(async rs => {
        const types = await resolveHValue(this.types);
        let res: any[] = rs.map(r => coerceCorrectReturn<T>(r, types));
        const maps = this.query.filter(a => a.cmd === 'map');
        for(const map of maps)
          res = await Promise.all(res.map(r => resolveHValue((map.params[0] as (doc: Datum<typeof r>) => Datum<any>)(createStaticDatum(r)))));

        this.query = [];
        return res;
      });
    }
    return this.db.all<T>(`SELECT * FROM [${tableName}]`).then(async rs => {
      const types = await resolveHValue(this.types);
      return rs.map(r => coerceCorrectReturn<T>(r, types));
    });
  }
}

// =========================
// ======== DATABASE =======
// =========================

export class SQLite3ReQLDatabase implements Database {

  private db: WrappedSQLite3Database;

  private readonly typemapsType: readonly SchemaEntry[] = Object.freeze([
    { name: 'table', type: 'string' },
    { name: 'types', type: 'string' },
  ]);

  private readonly typemapsTableName = '__reql_typemap__';

  async init(options?: { filename?: string, logger?: string }) {
    options = Object.assign({ logger: 'sqlite3' }, options);
    this.db = await createSQLite3DB(Object.assign(options, { logger: options.logger + '.raw' }));

    const tableList = await this.tableList().run();
    if(!tableList.find(a => a === this.typemapsTableName)) {
      await this.tableCreate(this.typemapsTableName, this.typemapsType).run();
    }
  }

  private get typemaps() {
    return this.table<{ table: string, types: string }>(this.typemapsTableName);
  }

  readonly valueTypeMap = {
    string: 'text',
    bool: 'numeric', // yep
    number: 'numeric',
    object: 'text', // yeeep
  };

  tableCreate(tableName: Value<string>, schema: readonly SchemaEntry[]): Datum<TableChangeResult> {

    const indexes: string[] = [];

    let keys = '';
    for(const key of schema) {
      if(!keys) { // primary key
        keys = `[${key.name}] ${this.valueTypeMap[key.type] || 'text'} primary key`;
      } else {
        keys += `, [${key.name}] ${this.valueTypeMap[key.type] || 'text'}`;
      }

      if(key.index)
        indexes.push(key.name);
    }

    if(keys.length === 0)
      throw new Error('Must have a schema of at least one entry!');

    return createStaticDatum(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`CREATE TABLE IF NOT EXISTS [${tableName}] (${keys})`);
      await this.typemaps.insert({ table: tableName, types: JSON.stringify(schema) }, { conflict: 'replace' }).run();
      for(const index of indexes)
        await this.db.exec(`CREATE INDEX [${tableName}_${index}] ON [${tableName}]([${index}])`);

      return { tables_created: 1 } as TableChangeResult;
    }));
  }

  tableDrop(tableName: Value<string>): Datum<TableChangeResult> {
    return createStaticDatum(createQuery(async () => {
      if(typeof tableName !== 'string')
          tableName = await tableName.run();
      await this.db.exec(`DROP TABLE IF EXISTS [${tableName}]`);
      return { tables_dropped: 1 } as TableChangeResult;
    }));
  }

  tableList(): Datum<string[]> {
    return createStaticDatum(createQuery(async () => {
      const result = await this.db.all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table'`);
      return result.map(a => a.name);
    }));
  }

  table<T = any>(tableName: Value<string>): Table<T> {
    return new SQLite3Table<T>(this.db, tableName, createQuery(async () =>
        tableName !== this.typemapsTableName
          ? await this.typemaps.get(tableName)('types').run().then(a => JSON.parse(a))
          : this.typemapsType));
  }
}

export async function create(options?: { filename?: string, logger?: string }): Promise<Database> {
  const db = new SQLite3ReQLDatabase();
  await db.init(options);
  return db;
}
export default create;
