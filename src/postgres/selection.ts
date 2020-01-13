import { Selection, SelectionPartial, Value, SchemaEntry, Datum, WriteResult, DeepPartial, Stream } from '../types';
import { WrappedPostgresDatabase } from './wrapper';
import { resolveValue, createQuery, coerceCorrectReturn } from '../common/util';
import { PostgresStream } from './stream';
import { expr, exprQuery } from '../common/static-datum';
import { safen } from './util';

export class PostgresSelectionPartial<T = any> extends PostgresStream<T> implements SelectionPartial<T> {

  constructor(db: WrappedPostgresDatabase, tableName: Value<string>,
    private keys: Value<any[]>, private index: Value<string>, private types: Value<SchemaEntry[]>) {
    super(db, tableName);
  }

  private async makeSelection(): Promise<string> {
    const keys = await resolveValue(this.keys);
    if(!keys.length)
      return 'false';

    const index = await resolveValue(this.index);
    if(keys[0] === '*')
      return `${JSON.stringify(index)} IS NOT NULL`;

    let selection = '';
    for(const key of keys) {
      if(!selection) {
        selection = `${JSON.stringify(index)}=${safen(key)}`;
      } else {
        selection += `OR ${JSON.stringify(index)}=${safen(key)}`;
      }
    }
    return selection;
  }

  filter(predicate: DeepPartial<T> | ((doc: Datum<T>) => Value<boolean>)): Selection<T> {
    return super.filter(predicate) as any;
  }

  count(): Datum<number> {
    return expr(createQuery(async() => {
      const tableName = await resolveValue(this.tableName);
      const selection = await this.makeSelection();
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return 0;

        const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
        return this.db.get<{
          'count': number
        }>(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`)
          .then(a => limit ? Math.min(a['count'], limit) : a['count']);
      }
      return this.db.get<{ 'count': number }>
        (`SELECT COUNT(*) FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(a => a['count']);
    }));
  }

  delete(): Datum<WriteResult<T>> {
    return expr(createQuery<WriteResult<T>>(async() => {
      const tableName = await resolveValue(this.tableName);
      const selection = await this.makeSelection();
      if(this.query.length) {
        const { post, kill, limit } = await this.computeQuery();
        if(kill) return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };

        const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
        return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`).then(
          () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
          e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
      }
      return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(
        () => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }),
        e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
    }));
  }

  fork(): Selection<T> {
    const clone = createSelection<T>(this.db, this.tableName, this.keys, this.index, this.types);
    clone.query = this.query.slice();
    clone.sel = this.sel;
    return clone as any;
  }

  async run(): Promise<T[]> {
    const tableName = await resolveValue(this.tableName);
    const selection = await this.makeSelection();
    if(this.sel || this.query.length) {
      const { select, post, kill, limit, cmdsApplied } = await this.computeQuery();

      if(kill) return [];

      const poost = (post ? ' AND ' + post : '') + (limit ?  ' LIMIT ' + limit : '');
      return this.db.all<T[]>(`SELECT ${select} FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`).then(async rs => {
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

        return res;
      });
    }
    return this.db.all<T[]>(`SELECT * FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(async rs => {
      const types = await resolveValue(this.types);
      return rs.map(r => coerceCorrectReturn<T>(r, types));
    });
  }
}

export interface PostgresSelection<T = any> extends PostgresSelectionPartial<T>, Selection<T> { }

export function createSelection<T = any>(db: WrappedPostgresDatabase, tableName: Value<string>,
  keys: Value<any[]>, index: Value<string>, types: Value<SchemaEntry[]>): PostgresSelection<T> {
  const instance = new PostgresSelectionPartial<T>(db, tableName, keys, index, types);
  const o: Selection<T> = Object.assign(
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

      // QUERY/etc

      delete(): Datum<WriteResult<T>> { return instance.delete(); },

      fork(): Selection<T> { return instance.fork(); },
      run() { return instance.run(); }
    } as SelectionPartial<T>) as any;
  (o as any).__proto__ = instance;
  return o as any;
}
