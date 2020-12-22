"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTable = exports.PostgresTablePartial = void 0;
const util_1 = require("../common/util");
const stream_1 = require("./stream");
const static_datum_1 = require("../common/static-datum");
const single_selection_1 = require("./single-selection");
const selection_1 = require("./selection");
const util_2 = require("./util");
class PostgresTablePartial extends stream_1.PostgresStream {
    constructor(db, tableName, types) {
        super(db, tableName);
        this.types = types;
    }
    get primaryIndexGetter() {
        return util_1.createQuery(async () => this.db.getPrimaryKey(await util_1.resolveValue(this.tableName)));
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    fork() {
        const child = selection_1.createSelection(this.db, this.tableName, ['*'], this.primaryIndexGetter, this.types);
        child.__proto__.query = this.query.slice();
        child.__proto__.sel = this.sel;
        return child;
    }
    count() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return 0;
                this.query = [];
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.get(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)}${poost}`)
                    .then(a => limit ? Math.min(a['count'], limit) : a);
            }
            return this.db.get(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)}`).then(a => a['count']);
        }));
    }
    delete() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };
                this.query = [];
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)}${poost}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            }
            return this.db.exec(`DELETE TABLE IF EXISTS ${JSON.stringify(tableName)}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    get(key) {
        return single_selection_1.createSingleSelection(this.db, this.tableName, key, util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            return this.db.getPrimaryKey(tableName);
        }), this.types);
    }
    getAll(...values) {
        let index;
        if (values.length && typeof values[values.length - 1] === 'object') {
            index = values.pop().index;
        }
        else {
            index = util_1.createQuery(async () => {
                const tableName = await util_1.resolveValue(this.tableName);
                return this.db.getPrimaryKey(tableName);
            });
        }
        return selection_1.createSelection(this.db, this.tableName, values, index, this.types);
    }
    insert(obj, options) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            let repKeys = '';
            let repValues = '';
            for (const k in obj)
                if (obj[k] != null) {
                    if (!repKeys) {
                        repKeys = `${JSON.stringify(k)}`;
                        repValues = `${util_2.safen(obj[k])}`;
                    }
                    else {
                        repKeys += `, ${JSON.stringify(k)}`;
                        repValues += `, ${util_2.safen(obj[k])}`;
                    }
                }
            let query = `INSERT INTO ${JSON.stringify(tableName)} (${repKeys}) VALUES (${repValues})`;
            if (options && (options.conflict === 'update' || options.conflict === 'replace')) {
                const primaryKey = await this.db.getPrimaryKey(tableName);
                let set = '';
                for (const k in obj)
                    if (obj[k] != null) {
                        if (!set)
                            set = `${JSON.stringify(k)}=excluded.${JSON.stringify(k)}`;
                        else
                            set += `, ${JSON.stringify(k)}=excluded.${JSON.stringify(k)}`;
                    }
                query += ` ON CONFLICT(${JSON.stringify(primaryKey)}) DO UPDATE SET ${set}`;
            }
            const ret = await this.db.exec(query).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            return ret;
        }));
    }
    // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
    indexCreate(key) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            await this.db.exec(`CREATE INDEX ${JSON.stringify(tableName + '_' + key)} ON ${JSON.stringify(tableName)}(${JSON.stringify(key)})`);
            return { created: 1 };
        }));
    }
    indexDrop(key) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            await this.db.exec(`DROP INDEX ${JSON.stringify(tableName + '_' + key)}`);
            return { dropped: 1 };
        }));
    }
    indexList() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            const rows = await this.db.all(`SELECT indexname FROM pg_indexes WHERE tablename=${util_2.safen(tableName)};`);
            return rows.map(row => row.indexname.slice(tableName.length + 1));
        }));
    }
    async run() {
        const tableName = await util_1.resolveValue(this.tableName);
        if (this.sel || this.query.length) {
            const { select, post, kill, limit, cmdsApplied } = await this.computeQuery();
            if (kill)
                return [];
            const poost = (post ? ' WHERE ' + post : '') + (limit ? ' LIMIT ' + limit : '');
            return this.db.all(`SELECT ${select} FROM ${JSON.stringify(tableName)}${poost}`).then(async (rs) => {
                const types = await util_1.resolveValue(this.types);
                let res = rs.map(r => util_1.coerceCorrectReturn(r, types));
                if (this.sel) {
                    const sel = await util_1.resolveValue(this.sel);
                    res = res.map(a => a[sel]);
                }
                const query = this.query.slice(cmdsApplied);
                if (query.length)
                    res = await static_datum_1.exprQuery(res, query).run();
                this.sel = undefined;
                this.query = [];
                this.query = [];
                return res;
            });
        }
        return this.db.all(`SELECT * FROM ${JSON.stringify(tableName)}`).then(async (rs) => {
            const types = await util_1.resolveValue(this.types);
            return rs.map(r => util_1.coerceCorrectReturn(r, types));
        });
    }
}
exports.PostgresTablePartial = PostgresTablePartial;
function createTable(db, tableName, types) {
    const instance = new PostgresTablePartial(db, tableName, types);
    const o = Object.assign((attribute) => { instance._sel(attribute); return o; /* override return */ }, {
        // AGGREGATION
        distinct() { instance.distinct(); return o; },
        limit(n) { instance.limit(n); return o; },
        // TRANSFORMS
        count() { return instance.count(); },
        map(predicate) { instance.map(predicate); return o; },
        pluck(...fields) { instance.pluck(...fields); return o; },
        filter(predicate) {
            instance.filter(predicate);
            return o;
        },
        delete() { return instance.delete(); },
        fork() { return instance.fork(); },
        run() { return instance.run(); },
        // TABLE
        get(key) { return instance.get(key); },
        getAll(...key) { return instance.getAll(...key); },
        // OPERATIONS
        insert(obj, options) {
            return instance.insert(obj, options);
        }
    });
    o.__proto__ = instance;
    return o;
}
exports.createTable = createTable;
//# sourceMappingURL=table.js.map