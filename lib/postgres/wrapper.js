"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_api_1 = require("@log4js-node/log4js-api");
const pg_1 = require("pg");
const util_1 = require("./util");
class PostgresDatabase {
    constructor(options) {
        options = Object.assign({ logger: 'pg' }, options);
        if (options.client)
            this._client = options.client;
        this.logger = log4js_api_1.getLogger(options.logger);
        this.options = options;
    }
    get client() { return this._client || this.pool; }
    async init() {
        if (this._client)
            return this._client.connect();
        this.pool = new pg_1.Pool(this.options);
    }
    close() {
        return this.client.end();
    }
    query(query, values) {
        this.logger.trace('Query: ' + (values
            ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
            : query));
        return this.client.query(query, values);
    }
    get(query, values) {
        this.logger.trace('Get: ' + (values
            ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
            : query));
        return this.client.query(query, values).then(a => a.rows && a.rows.length ? a.rows[0] : null);
    }
    all(query, values) {
        this.logger.trace('All: ' + (values
            ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
            : query));
        return this.client.query(query, values).then(a => a.rows);
    }
    exec(query, values) {
        this.logger.trace('Exec: ' + (values
            ? values.reduce((acc, v, i) => acc.replace('$' + i, String(v)), query)
            : query));
        return this.client.query(query, values).catch(e => {
            this.logger.error(e);
            throw e;
        });
    }
    // extensions
    async getPrimaryKey(tableName) {
        return this.query(`
    SELECT a.attname as name
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid
                         AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = ${util_1.safen(tableName)}::regclass
    AND    i.indisprimary;`).then(a => a.rows && a.rows.length && a.rows[0].name);
    }
    async getKeys(tableName) {
        const columns = await this.query(`SELECT column_name AS name FROM information_schema.columns WHERE table_name=${util_1.safen(tableName)};`)
            .then(a => a.rows);
        const primaryKey = await this.getPrimaryKey(tableName);
        return columns.map(a => { return primaryKey === a.name ? { name: a.name, primary: true } : a; });
    }
}
async function create(options) {
    const db = new PostgresDatabase(options);
    await db.init();
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=wrapper.js.map