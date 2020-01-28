import { Database, Statement } from 'sqlite3';
import { Logger, getLogger } from '@log4js-node/log4js-api';

export interface WrappedSQLite3Database {
  close(): Promise<void>;
  configure(option: 'trace' | 'profile', cb: (val?: any) => void): void;
  configure(option: 'busyTimeout', value: number): void;
  run(sql: string, params?: { [key: string]: any }): Promise<void>;
  get<T = any>(sql: string, params?: { [key: string]: any }): Promise<T>;
  all<T = any>(sql: string, params?: { [key: string]: any }): Promise<T[]>;
  each<T = any>(cb: (row: T) => void, sql: string, params?: { [key: string]: any }): Promise<number>;
  exec(sql: string): Promise<void>;
  prepare(sql: string, params?: { [key: string]: any }): Promise<WrappedSQLite3Statement>;

  // extensions
  getPrimaryKey(tableName: string): Promise<string>;
  getKeys(tableName: string): Promise<{ name: string; primary?: boolean }[]>;
}

export interface WrappedSQLite3Statement {
  bind(params: { [key: string]: any }): Promise<void>;
  reset(): Promise<void>;
  finalize(): Promise<void>;
  run(params?: { [key: string]: any }): Promise<void>;
  get<T = any>(params?: { [key: string]: any }): Promise<T>;
  all<T = any>(params?: { [key: string]: any }): Promise<T[]>;
  each<T = any>(cb: (row: T) => void, params?: { [key: string]: any }): Promise<number>;
}

class SQLite3Database implements WrappedSQLite3Database {
  private db: Database;
  private logger: Logger;

  private filename: string;

  constructor(options?: { filename?: string; logger?: string }) {
    options = Object.assign({ filename: ':memory:', logger: 'sqlite3' }, options);
    this.filename = options.filename;
    this.logger = getLogger(options.logger);
  }

  async init(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.db = new Database(this.filename, err => err ? reject(err) : resolve());
    });
  }

  public close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => err ? reject(err) : resolve());
    });
  }

  public configure(option: 'trace' | 'profile', cb: (val?: any) => void): void;
  public configure(option: 'busyTimeout', value: number): void;
  public configure(option: string, value: any) {
    this.db.configure(option as any, value);
  }

  public run(sql: string, params?: { [key: string]: any }): Promise<void> {
    this.logger.trace('run ' + sql);
    return new Promise<void>((resolve, reject) => {
      this.db.run(sql, params || [], (err) => err ? reject(err) : resolve());
    });
  }

  public get<T = any>(sql: string, params?: { [key: string]: any }): Promise<T> {
    this.logger.trace('get ' + sql);
    return new Promise<T>((resolve, reject) => {
      this.db.get(sql, params || [], (err, row) => err ? reject(err) : resolve(row));
    });
  }

  public all<T = any>(sql: string, params?: { [key: string]: any }): Promise<T[]> {
    this.logger.trace('all ' + sql);
    return new Promise<T[]>((resolve, reject) => {
      this.db.all(sql, params || [], (err, rows) => err ? reject(err) : resolve(rows));
    });
  }

  public each<T = any>(cb: (row: T) => void, sql: string, params?: { [key: string]: any }): Promise<number> {
    this.logger.trace('each ' + sql);
    return new Promise<number>((resolve, reject) => {
      this.db.each(sql, params || [], (err, row) => !err && cb(row), (err, count) => err ? reject(err) : resolve(count));
    });
  }

  public exec(sql: string): Promise<void> {
    this.logger.trace('exec ' + sql);
    return new Promise<void>((resolve, reject) => {
      this.db.exec(sql, (err) => err ? reject(err) : resolve());
    });
  }

  public prepare(sql: string, params?: { [key: string]: any }): Promise<SQLite3Statement> {
    this.logger.trace('prepare ' + sql);
    return new Promise<SQLite3Statement>((resolve, reject) => {
      let e: Error;
      const statement = this.db.prepare(sql, params || [], (err) => err && reject(e = err));
      if(!e)
        resolve(new SQLite3Statement(statement));
    });
  }

  public async getPrimaryKey(tableName: string): Promise<string> {
    return this.get<{ name: string }>(`SELECT name FROM pragma_table_info('${tableName}') where pk=1;`).then(a => a.name);
  }

  public async getKeys(tableName: string): Promise<{ name: string; primary?: boolean }[]> {
    return this.all<{ name: string; pk: number }>(`SELECT name,pk FROM pragma_table_info('${tableName}')`)
      .then(arr => arr.map(a => (a.pk ? { name: a.name, primary: true } : { name: a.name })));
  }
}

class SQLite3Statement implements WrappedSQLite3Statement {
  locked = false;

  constructor(private statement: Statement) { }

  public bind(params: { [key: string]: any }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.statement.bind(params, (err) => err ? reject(err) : resolve());
    });
  }

  public reset(): Promise<void> {
    return new Promise<void>(resolve => {
      this.statement.reset(() => resolve());
    });
  }

  public async finalize(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.statement.finalize((err) => err ? reject(err) : resolve());
    });
    this.locked = true;
  }

  public run(params?: { [key: string]: any }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.statement.run(params || [], (err) => err ? reject(err) : resolve());
    });
  }

  public get<T = any>(params?: { [key: string]: any }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.statement.get(params || [], (err, row) => err ? reject(err) : resolve(row));
    });
  }

  public all<T = any>(params?: { [key: string]: any }): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.statement.all(params || [], (err, rows) => err ? reject(err) : resolve(rows));
    });
  }

  public each<T = any>(cb: (row: T) => void, params?: { [key: string]: any }): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.statement.each(params || [], (err, row) => !err && cb(row), (err, count) => err ? reject(err) : resolve(count));
    });
  }
}

export async function create(options?: { filename?: string; logger?: string }): Promise<WrappedSQLite3Database> {
  const db = new SQLite3Database(options);
  await db.init();
  return db;
}

export default create;
