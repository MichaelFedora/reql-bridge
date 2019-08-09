import { Table, Value, Datum, SchemaEntry, DeepPartial, WriteResult, SingleSelection, Selection } from '../types';
import { createQuery, resolveHValue, safen, coerceCorrectReturn } from '../internal/util';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { SQLite3Stream } from './stream';
import { createStaticDatum } from './static-datum';
import { createSingleSelection } from './single-selection';
import { SQLite3Selection } from './selection';

export class SQLite3Table<T = any> extends SQLite3Stream<T> implements Table<T> {

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
          res = await Promise.all(res.map(r =>
            resolveHValue((map.params[0] as (doc: Datum<typeof r>) => Datum<any>)(createStaticDatum(r)))));

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
