"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.RethinkDatabase = void 0;
const rethinkdb_ts_1 = require("rethinkdb-ts");
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const table_1 = require("./table");
const datum_1 = require("./datum");
class RethinkDatabase {
    async init(options) {
        options = Object.assign({ logger: 'rethinkdb' }, options);
        this.pool = await rethinkdb_ts_1.r.connectPool(options);
        if (await rethinkdb_ts_1.r.dbList().contains(options.db).not().run())
            await rethinkdb_ts_1.r.dbCreate(options.db).run();
        this.db = rethinkdb_ts_1.r.db(options.db);
    }
    tableCreate(tableName, schema) {
        const indexes = [];
        for (const key of schema)
            if (key.index)
                indexes.push(key.name);
        if (schema.length === 0)
            throw new Error('Must have a schema of at least one entry!');
        return static_datum_1.expr(util_1.createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            await this.db.tableCreate(tableName, { primaryKey: indexes.length ? indexes[0] : schema[0].name }).run();
            for (const index of indexes.slice(1))
                await this.db.table(tableName).indexCreate(index).run();
            return { tables_created: 1 };
        }));
    }
    tableDrop(tableName) {
        const res = util_1.resolveValue(tableName).then(tbl => this.db.tableDrop(tbl));
        return datum_1.createDatum(res);
    }
    tableList() {
        return datum_1.createDatum(this.db.tableList());
    }
    table(tableName) {
        return table_1.createTable(this.db, tableName);
    }
    async close() {
        return this.pool.drain();
    }
}
exports.RethinkDatabase = RethinkDatabase;
async function create(options) {
    const db = new RethinkDatabase();
    await db.init(options);
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=database.js.map