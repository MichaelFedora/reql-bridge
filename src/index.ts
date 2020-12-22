export { expr } from './common/static-datum';

export { create as createSQLite3Database } from './sqlite3/database';
export { create as createPostgresDatabase } from './postgres/database';
export { create as createLevelDatabase } from './level/database';
export { create as createRethinkDatabase } from './rethinkdb/database';

export * from './types';
