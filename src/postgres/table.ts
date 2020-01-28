import {
  Table, TablePartial, IndexChangeResult,
  Value, Datum, SchemaEntry, DeepPartial, WriteResult,
  SingleSelection, Selection, Query, Stream
} from '../types';
import { createQuery, resolveValue, coerceCorrectReturn } from '../common/util';
import { WrappedPostgresDatabase } from './wrapper';
import { PostgresStream } from './stream';
import { expr, exprQuery } from '../common/static-datum';
import { createSingleSelection } from './single-selection';
import { createSelection } from './selection';
import { safen } from './util';

export class PostgresTablePartial<T = any> extends PostgresStream<T> implements TablePartial<T> {

  private get primaryIndexGetter(): Query<string> {
    return createQuery(async () => this.db.getPrimaryKey(await resolveValue(this.tableName)));
  }

  constructor(db: WrappedPostgresDatabase, tableName: Value<string>, private types: Value<SchemaEntry[]>) { super(db, tableName); }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  fork(): never;
  fork() { // for fake Selection<T>
    const child = createSelection(this.db, this.tableName, ['*'], this.primaryIndexGetter, this.types);
    (child as any).query = this.query.slice();
    (child as any).sel = this.sel;
    return child;
  }

  count(): Datum<number> {
    return expr(createQuery(async() => {
      const tableName = await resolveValue(this.tableName);
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return 0;

        this.query = [];

        const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
        return this.db.get<{ 'count': number }>(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)}${poost}`)
          .then(a => limit ? Math.min(a['count'], limit) : a as any);
      }
      return this.db.get<{ 'count': number }>(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)}`).then(a => a['count']);
    }));
  }

  delete(): Datum<WriteResult<T>> {
    return expr(createQuery<WriteResult<T>>(async() => {
      const tableName = await resolveValue(this.tableName);
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };

        this.query = [];

        const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
        return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)}${poost}`).then(
          () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      }

      return this.db.exec(`DELETE TABLE IF EXISTS ${JSON.stringify(tableName)}`).then(
        () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  get(key: any): SingleSelection<T> {
    return createSingleSelection(this.db, this.tableName, key, createQuery(async () => {
      const tableName = await resolveValue(this.tableName);
      return this.db.getPrimaryKey(tableName);
    }), this.types);
  }

  getAll(key: any, options?: { index: string }): Selection<T>; // not editable
  getAll(key: any, key2: any, options?: { index: string }): Selection<T>;
  getAll(...key: (number | string | { index: string })[]): Selection<T>;
  getAll(...values: (number | string | { index: string })[]): Selection<T> {
    let index: Value<string>;
    if(values.length && typeof values[values.length - 1] === 'object') {
      index = (values.pop() as { index: string }).index;
    } else {
      index = createQuery(async () => {
        const tableName = await resolveValue(this.tableName);
        return this.db.getPrimaryKey(tableName);
      });
    }
    return createSelection(this.db, this.tableName, values, index, this.types);
  }

  insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
    return expr(createQuery(async () => {
      const tableName = await resolveValue(this.tableName);

      let repKeys = '';
      let repValues = '';
      for(const k in obj) if(obj[k] != null) {
        if(!repKeys) {
          repKeys = `${JSON.stringify(k)}`;
          repValues = `${safen(obj[k])}`;
        } else {
          repKeys += `, ${JSON.stringify(k)}`;
          repValues += `, ${safen(obj[k])}`;
        }
      }

      let query = `INSERT INTO ${JSON.stringify(tableName)} (${repKeys}) VALUES (${repValues})`;

      if(options && (options.conflict === 'update' || options.conflict === 'replace')) {
        const primaryKey = await this.db.getPrimaryKey(tableName);
        let set = '';
        for(const k in obj) if(obj[k] != null) {
          if(!set)
            set = `${JSON.stringify(k)}=excluded.${JSON.stringify(k)}`;
          else
            set += `, ${JSON.stringify(k)}=excluded.${JSON.stringify(k)}`;
        }
        query += ` ON CONFLICT(${JSON.stringify(primaryKey)}) DO UPDATE SET ${set}`;
      }
      const ret: WriteResult<T> = await this.db.exec(query).then(
        () => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      return ret;
    }));
  }

  indexCreate<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult>;
  // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
  indexCreate(key: any): Datum<IndexChangeResult> {
    return expr(createQuery(async () => {
      const tableName = await resolveValue(this.tableName);
      await this.db.exec(`CREATE INDEX ${JSON.stringify(tableName + '_' + key)} ON ${JSON.stringify(tableName)}(${JSON.stringify(key)})`);
      return { created: 1 } as IndexChangeResult;
    }));
  }

  indexDrop<U extends keyof T>(key: U): Datum<IndexChangeResult>;
  // indexDrop(name: Value<string>): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult>;
  indexDrop(key: any): Datum<IndexChangeResult> {
    return expr(createQuery(async () => {
      const tableName = await resolveValue(this.tableName);
      await this.db.exec(`DROP INDEX ${JSON.stringify(tableName + '_' + key)}`);
      return { dropped: 1 } as IndexChangeResult;
    }));
  }

  indexList(): Datum<string[]> {
    return expr(createQuery(async () => {
      const tableName = await resolveValue(this.tableName);
      const rows = await this.db.all<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes WHERE tablename=${safen(tableName)};`);
      return rows.map(row => row.indexname.slice(tableName.length + 1));
    }));
  }

  async run(): Promise<T[]> {
    const tableName = await resolveValue(this.tableName);
    if(this.sel || this.query.length) {
      const { select, post, kill, limit, cmdsApplied } = await this.computeQuery();

      if(kill) return [];

      const poost = (post ? ' WHERE ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
      return this.db.all<T[]>(`SELECT ${select} FROM ${JSON.stringify(tableName)}${poost}`).then(async rs => {
        const types = await resolveValue(this.types);
        let res: any[] = rs.map(r => coerceCorrectReturn<T>(r, types));

        if(this.sel) {
          const sel = await resolveValue(this.sel);
          res = res.map(a => a[sel]);
        }

        const query = this.query.slice(cmdsApplied);
        if(query.length)
          res = await exprQuery(res, query).run();

        this.sel = undefined;
        this.query = [];

        this.query = [];
        return res;
      });
    }
    return this.db.all<T[]>(`SELECT * FROM ${JSON.stringify(tableName)}`).then(async rs => {
      const types = await resolveValue(this.types);
      return rs.map(r => coerceCorrectReturn<T>(r, types));
    });
  }
}

interface PostgresTable<T = any> extends PostgresTablePartial<T>, Table<T> { }

export function createTable<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>, types: Value<SchemaEntry[]>): PostgresTable<T> {
  const instance = new PostgresTablePartial<T>(db, tableName, types);
  const o: Table<T> = Object.assign(
    (attribute: Value<string | number>) => { instance._sel(attribute); return o; /* override return */ },
    {
      // AGGREGATION

      distinct(): Stream<T> { instance.distinct(); return o as any; },
      limit(n: Value<number>): Stream<T> { instance.limit(n); return o as any; },

      // TRANSFORMS

      count(): Datum<number> { return instance.count(); },
      map<U = any>(predicate: (doc: Datum<T>) => Datum<U>): Stream<U> { instance.map(predicate); return o as any; },
      pluck(...fields: (string | number)[]): T extends object ? Stream<Partial<T>> : never { instance.pluck(...fields); return o as any; },
      filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
        instance.filter(predicate);
        return o as any;
      },

      delete(): Datum<WriteResult<T>> { return instance.delete(); },

      fork(): never { return instance.fork(); },
      run() { return instance.run(); },

      // TABLE

      get(key: any): SingleSelection<T> { return instance.get(key); },
      getAll(...key: (number | string | { index: string })[]): Selection<T> { return instance.getAll(...key); },

      // OPERATIONS

      insert(obj: T, options?: { conflict: 'error' | 'replace' | 'update' }): Datum<WriteResult<T>> {
        return instance.insert(obj, options);
      }
    } as TablePartial<T>) as any;
  (o as any).__proto__ = instance;
  return o as any;
}
