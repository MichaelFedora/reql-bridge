"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../common/util");
const stream_1 = require("./stream");
const static_datum_1 = require("../common/static-datum");
const single_selection_1 = require("./single-selection");
const selection_1 = require("./selection");
const selectable_1 = require("../common/selectable");
class SQLite3TablePartial extends stream_1.SQLite3Stream {
    constructor(db, tableName, types) {
        super(db, tableName);
        this.types = types;
    }
    get primaryIndexGetter() {
        return util_1.createQuery(async () => this.db.getPrimaryKey(await util_1.resolveHValue(this.tableName)));
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    fork() {
        const child = selection_1.createSelection(this.db, this.tableName, ['*'], this.primaryIndexGetter, this.types);
        child.query = this.query.slice();
        child.sel = this.sel;
        return child;
    }
    count() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveHValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return 0;
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.get(`SELECT COUNT(*) FROM [${tableName}]${poost}`)
                    .then(a => limit ? Math.min(a['COUNT(*)'], limit) : a['COUNT(*)']);
            }
            return this.db.get(`SELECT COUNT(*) FROM [${tableName}]`).then(a => a['COUNT(*)']);
        }));
    }
    delete() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveHValue(this.tableName);
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };
                const poost = (post ? ` WHERE ${post}` : '') + (limit ? `LIMIT ${limit}` : '');
                return this.db.exec(`DELETE FROM [${tableName}]${poost}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            }
            return this.db.exec(`DELETE TABLE IF EXISTS [${tableName}]`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    get(key) {
        return single_selection_1.createSingleSelection(this.db, this.tableName, key, util_1.createQuery(async () => {
            const tableName = await util_1.resolveHValue(this.tableName);
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
                const tableName = await util_1.resolveHValue(this.tableName);
                return this.db.getPrimaryKey(tableName);
            });
        }
        return selection_1.createSelection(this.db, this.tableName, values, index, this.types);
    }
    insert(obj, options) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveHValue(this.tableName);
            let repKeys = '';
            let repValues = '';
            for (const k in obj)
                if (obj[k] != null) {
                    if (!repKeys) {
                        repKeys = `[${k}]`;
                        repValues = `${util_1.safen(obj[k])}`;
                    }
                    else {
                        repKeys += `, [${k}]`;
                        repValues += `, ${util_1.safen(obj[k])}`;
                    }
                }
            let query = `INSERT`;
            if (options && options.conflict === 'replace')
                query += ' OR REPLACE';
            query += ` INTO [${tableName}] (${repKeys}) VALUES (${repValues})`;
            if (options && options.conflict === 'update') {
                const primaryKey = await this.db.getPrimaryKey(tableName);
                let set = '';
                for (const k in obj)
                    if (obj[k] != null) {
                        if (!set)
                            set = `[${k}]=excluded.[${k}]`;
                        else
                            set += `, [${k}]=excluded.[${k}]`;
                    }
                query += ` ON CONFLICT([${primaryKey}]) DO UPDATE SET ${set}`;
            }
            const ret = await this.db.exec(query).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            return ret;
        }));
    }
    async run() {
        const tableName = await util_1.resolveHValue(this.tableName);
        if (this.query.length) {
            const { select, post, kill, limit, cmdsApplied } = await this.computeQuery();
            if (kill)
                return [];
            const poost = (post ? ' WHERE ' + post : '') + (limit ? ' LIMIT ' + limit : '');
            return this.db.all(`SELECT ${select} FROM [${tableName}]${poost}`).then(async (rs) => {
                const types = await util_1.resolveHValue(this.types);
                let res = rs.map(r => util_1.coerceCorrectReturn(r, types));
                const query = this.query.slice(cmdsApplied);
                res = await Promise.all(res.map(r => static_datum_1.exprQuery(r, query).run()));
                this.query = [];
                return res;
            });
        }
        return this.db.all(`SELECT * FROM [${tableName}]`).then(async (rs) => {
            const types = await util_1.resolveHValue(this.types);
            return rs.map(r => util_1.coerceCorrectReturn(r, types));
        });
    }
}
exports.SQLite3TablePartial = SQLite3TablePartial;
function createTable(db, tableName, types) {
    return selectable_1.makeStreamSelector(new SQLite3TablePartial(db, tableName, types));
}
exports.createTable = createTable;
//# sourceMappingURL=table.js.map