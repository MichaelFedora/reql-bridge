import { Logger, getLogger } from '@log4js-node/log4js-api';
import { Pool, Client, PoolConfig, ClientBase, Submittable, QueryArrayConfig, QueryConfig, QueryResultBase } from 'pg';

export interface WrappedPostgresDatabase {
  close(): Promise<void>;
  query<T = any>(query: string, values?: any[]): Promise<ActualQueryResult<T>>;
  get<T = any>(query: string, values?: any[]): Promise<T>;
  all<T extends any[] = any[]>(query: string, values?: any[]): Promise<T>;
  exec(query: string, values?: any[]): Promise<void>;

  // extensions
  getPrimaryKey(tableName: string): Promise<string>;
  getKeys(tableName: string): Promise<{ name: string, primary?: boolean }[]>;
}

interface ActualQueryResult<T = any> extends QueryResultBase {
  rows: T[];
}

interface PoolOrClient {
  end(): Promise<void>;

  query<T extends Submittable>(queryStream: T): T;
  query<T = any>(queryTextOrConfig: string | QueryConfig | QueryArrayConfig, values?: any[]): Promise<ActualQueryResult<T>>;

  on(event: 'error', listener: (err: Error, client?: ClientBase) => void): this;
}

class PostgresDatabase implements WrappedPostgresDatabase {
  private pool: Pool;
  private _client: Client;
  private options: PoolConfig;
  public get client(): PoolOrClient { return this._client || this.pool; }
  private logger: Logger;

  constructor(options?: { client?: Client, logger?: string } & PoolConfig) {
    options = Object.assign({ logger: 'pg' }, options);
    if(options.client)
      this._client = options.client;
    this.logger = getLogger(options.logger);
  }

  async init(): Promise<void> {
    if(this._client)
      return this._client.connect();
    this.pool = new Pool(this.options);
  }

  public close(): Promise<void> {
    return this.client.end();
  }

  public query<T = any>(query: string, values?: any[]): Promise<ActualQueryResult<T>> {
    this.logger.trace('Query: ' + (values
      ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
      : query));

    return this.client.query<T>(query, values);
  }

  public get<T = any>(query: string, values?: any[]): Promise<T> {
    this.logger.trace('Query: ' + (values
      ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
      : query));

    return this.client.query<T>(query, values).then(a => a.rows && a.rows.length ? a.rows[0]  : null);
  }

  public all<T extends any[] = any[]>(query: string, values?: any[]): Promise<T> {
    this.logger.trace('All: ' + (values
      ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
      : query));

    return this.client.query(query, values).then(a => a.rows as T);
  }

  public exec(query: string, values?: any[]): Promise<void> {
    this.logger.trace('Exec: ' + (values
      ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
      : query));

    return this.client.query(query, values).then(a => null);
  }

  // extensions

  public async getPrimaryKey(tableName: string): Promise<string> {
    return this.query<{ name: string }>(`SELECT name FROM pragma_table_info('${tableName}') where pk=1;`)
      .then(a => a.rows && a.rows.length && a.rows[0].name);
  }

  public async getKeys(tableName: string): Promise<{ name: string, primary?: boolean }[]> {
    return this.query<{ name: string, pk: number }>(`SELECT name,pk FROM pragma_table_info('${tableName}')`)
        .then(res => res.rows.map(a => (a.pk ? { name: a.name, primary: true } : { name: a.name })));
  }
}

export async function create(options?: { filename?: string, logger?: string }): Promise<WrappedPostgresDatabase> {
  const db = new PostgresDatabase(options);
  await db.init();
  return db;
}

export default create;
