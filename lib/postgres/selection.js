"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSelection = exports.PostgresSelectionPartial = void 0;
const util_1 = require("../common/util");
const stream_1 = require("./stream");
const static_datum_1 = require("../common/static-datum");
const util_2 = require("./util");
class PostgresSelectionPartial extends stream_1.PostgresStream {
    constructor(db, tableName, keys, index, types) {
        super(db, tableName);
        this.keys = keys;
        this.index = index;
        this.types = types;
    }
    async makeSelection() {
        const keys = await util_1.resolveValue(this.keys);
        if (!keys.length)
            return 'false';
        const index = await util_1.resolveValue(this.index);
        if (keys[0] === '*')
            return `${JSON.stringify(index)} IS NOT NULL`;
        let selection = '';
        for (const key of keys) {
            if (!selection) {
                selection = `${JSON.stringify(index)}=${util_2.safen(key)}`;
            }
            else {
                selection += `OR ${JSON.stringify(index)}=${util_2.safen(key)}`;
            }
        }
        return selection;
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    count() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            const selection = await this.makeSelection();
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return 0;
                const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
                return this.db.get(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`)
                    .then(a => limit ? Math.min(a['count'], limit) : a['count']);
            }
            return this.db.get(`SELECT COUNT(*) FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(a => a['count']);
        }));
    }
    delete() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const tableName = await util_1.resolveValue(this.tableName);
            const selection = await this.makeSelection();
            if (this.query.length) {
                const { post, kill, limit } = await this.computeQuery();
                if (kill)
                    return { deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 1 };
                const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
                return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            }
            return this.db.exec(`DELETE FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    fork() {
        const clone = createSelection(this.db, this.tableName, this.keys, this.index, this.types);
        clone.query = this.query.slice();
        clone.sel = this.sel;
        return clone;
    }
    async run() {
        const tableName = await util_1.resolveValue(this.tableName);
        const selection = await this.makeSelection();
        if (this.sel || this.query.length) {
            const { select, post, kill, limit, cmdsApplied } = await this.computeQuery();
            if (kill)
                return [];
            const poost = (post ? ' AND ' + post : '') + (limit ? ' LIMIT ' + limit : '');
            return this.db.all(`SELECT ${select} FROM ${JSON.stringify(tableName)} WHERE ${selection}${poost}`).then(async (rs) => {
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
                return res;
            });
        }
        return this.db.all(`SELECT * FROM ${JSON.stringify(tableName)} WHERE ${selection}`).then(async (rs) => {
            const types = await util_1.resolveValue(this.types);
            return rs.map(r => util_1.coerceCorrectReturn(r, types));
        });
    }
}
exports.PostgresSelectionPartial = PostgresSelectionPartial;
function createSelection(db, tableName, keys, index, types) {
    const instance = new PostgresSelectionPartial(db, tableName, keys, index, types);
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
        // QUERY/etc
        delete() { return instance.delete(); },
        fork() { return instance.fork(); },
        run() { return instance.run(); }
    });
    o.__proto__ = instance;
    return o;
}
exports.createSelection = createSelection;
//# sourceMappingURL=selection.js.map