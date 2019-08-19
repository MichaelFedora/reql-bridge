"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("sqlite3");
const log4js_api_1 = require("@log4js-node/log4js-api");
class SQLite3Database {
    constructor(options) {
        options = Object.assign({ filename: ':memory:', logger: 'sqlite3' }, options);
        this.filename = options.filename;
        this.logger = log4js_api_1.getLogger(options.logger);
    }
    async init() {
        await new Promise((resolve, reject) => {
            this.db = new sqlite3_1.Database(this.filename, err => err ? reject(err) : resolve());
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => err ? reject(err) : resolve());
        });
    }
    configure(option, value) {
        this.db.configure(option, value);
    }
    run(sql, params) {
        this.logger.trace('run ' + sql);
        return new Promise((resolve, reject) => {
            this.db.run(sql, params || [], (err) => err ? reject(err) : resolve());
        });
    }
    get(sql, params) {
        this.logger.trace('get ' + sql);
        return new Promise((resolve, reject) => {
            this.db.get(sql, params || [], (err, row) => err ? reject(err) : resolve(row));
        });
    }
    all(sql, params) {
        this.logger.trace('all ' + sql);
        return new Promise((resolve, reject) => {
            this.db.all(sql, params || [], (err, rows) => err ? reject(err) : resolve(rows));
        });
    }
    each(cb, sql, params) {
        this.logger.trace('each ' + sql);
        return new Promise((resolve, reject) => {
            this.db.each(sql, params || [], (err, row) => !err && cb(row), (err, count) => err ? reject(err) : resolve(count));
        });
    }
    exec(sql) {
        this.logger.trace('exec ' + sql);
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => err ? reject(err) : resolve());
        });
    }
    prepare(sql, params) {
        this.logger.trace('prepare ' + sql);
        return new Promise((resolve, reject) => {
            let e;
            const statement = this.db.prepare(sql, params || [], (err) => err && reject(e = err));
            if (!e)
                resolve(new SQLite3Statement(statement));
        });
    }
    async getPrimaryKey(tableName) {
        return this.get(`SELECT name FROM pragma_table_info('${tableName}') where pk=1;`).then(a => a.name);
    }
    async getKeys(tableName) {
        return this.all(`SELECT name,pk FROM pragma_table_info('${tableName}')`)
            .then(arr => arr.map(a => (a.pk ? { name: a.name, primary: true } : { name: a.name })));
    }
}
class SQLite3Statement {
    constructor(statement) {
        this.statement = statement;
        this.locked = false;
    }
    bind(params) {
        return new Promise((resolve, reject) => {
            this.statement.bind(params, (err) => err ? reject(err) : resolve());
        });
    }
    reset() {
        return new Promise(resolve => {
            this.statement.reset(() => resolve());
        });
    }
    async finalize() {
        await new Promise((resolve, reject) => {
            this.statement.finalize((err) => err ? reject(err) : resolve());
        });
        this.locked = true;
    }
    run(params) {
        return new Promise((resolve, reject) => {
            this.statement.run(params || [], (err) => err ? reject(err) : resolve());
        });
    }
    get(params) {
        return new Promise((resolve, reject) => {
            this.statement.get(params || [], (err, row) => err ? reject(err) : resolve(row));
        });
    }
    all(params) {
        return new Promise((resolve, reject) => {
            this.statement.all(params || [], (err, rows) => err ? reject(err) : resolve(rows));
        });
    }
    each(cb, params) {
        return new Promise((resolve, reject) => {
            this.statement.each(params || [], (err, row) => !err && cb(row), (err, count) => err ? reject(err) : resolve(count));
        });
    }
}
async function create(options) {
    const db = new SQLite3Database(options);
    await db.init();
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=wrapper.js.map