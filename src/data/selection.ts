import { Selection, Value, SchemaEntry, Datum, WriteResult } from '../types';
import { WrappedSQLite3Database } from '../internal/sqlite3-wrapper';
import { resolveHValue, createQuery, coerceCorrectReturn, safen } from '../internal/util';
import { SQLite3Stream } from './stream';
import { createStaticDatum } from './static-datum';

export class SQLite3Selection<T = any> extends SQLite3Stream<T> implements Selection<T> {

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
          res = await Promise.all(res.map(r =>
            resolveHValue((map.params[0] as (doc: Datum<typeof r>) => Datum<any>)(createStaticDatum(r)))));

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
