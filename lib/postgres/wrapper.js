"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_api_1 = require("@log4js-node/log4js-api");
const pg_1 = require("pg");
class PostgresDatabase {
    get client() { return this._client || this.pool; }
    constructor(options) {
        options = Object.assign({ logger: 'pg' }, options);
        if (options.client)
            this._client = options.client;
        this.logger = log4js_api_1.getLogger(options.logger);
    }
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
        this.logger.trace('Query: ' + (values
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
        return this.client.query(query, values).then(a => null);
    }
    // extensions
    async getPrimaryKey(tableName) {
        return this.query(`SELECT name FROM pragma_table_info('${tableName}') where pk=1;`)
            .then(a => a.rows && a.rows.length && a.rows[0].name);
    }
    async getKeys(tableName) {
        return this.query(`SELECT name,pk FROM pragma_table_info('${tableName}')`)
            .then(res => res.rows.map(a => (a.pk ? { name: a.name, primary: true } : { name: a.name })));
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