"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSelection = exports.LevelSelectionPartial = void 0;
const stream_1 = require("stream");
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const stream_2 = require("./stream");
const util_2 = require("./util");
class LevelSelectionPartial extends stream_2.LevelStream {
    constructor(db, tableName, keys, index) {
        super();
        this.db = db;
        this.tableName = tableName;
        this.keys = keys;
        this.index = index;
    }
    async getTable() {
        return util_2.subdb(this.db, await util_1.resolveValue(this.tableName));
    }
    async getStream() {
        const tbl = await this.getTable();
        if (!this.keys)
            return util_2.subdb(tbl, 'primary').createReadStream();
        let keys = await util_1.resolveValue(this.keys);
        if (this.index != null) {
            keys = await Promise.all(keys.map(k => tbl.get('!index!!' + this.index + '!' + k)
                .catch((e) => { if (e.notFound)
                return [];
            else
                throw e; }))).then(res => [].concat(...res));
        }
        const pTable = util_2.subdb(tbl, 'primary');
        const data = keys.map(k => pTable.get(k).then(v => ({ key: k, value: v }), e => { if (e.notFound)
            return { key: k, value: null };
        else
            throw e; }));
        return stream_1.Readable.from(util_2.createPromiseArrayIteratable(data), { objectMode: true });
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    delete() {
        const clone = this.fork();
        return static_datum_1.expr(util_1.createQuery(async () => {
            const keys = await clone.compile().then(data => data.map(e => e.key));
            const table = await clone.getTable();
            const ops = keys.map(k => ({ type: 'del', key: k }));
            return table.batch(ops).then(() => ({ deleted: keys.length, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    fork() {
        const clone = createSelection(this.db, this.tableName, this.keys, this.index);
        clone.__proto__.query = this.query.slice();
        clone.__proto__.sel = this.sel;
        return clone;
    }
}
exports.LevelSelectionPartial = LevelSelectionPartial;
function createSelection(db, tableName, keys, index) {
    const instance = new LevelSelectionPartial(db, tableName, keys, index);
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