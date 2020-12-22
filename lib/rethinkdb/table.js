"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTable = exports.RethinkTablePartial = void 0;
const util_1 = require("../common/util");
const stream_1 = require("./stream");
const single_selection_1 = require("./single-selection");
const selection_1 = require("./selection");
const datum_1 = require("./datum");
class RethinkTablePartial extends stream_1.RethinkStream {
    constructor(db, tableName) {
        super();
        this.db = db;
        this.tableName = tableName;
    }
    async getTable() {
        return this.db.table(await util_1.resolveValue(this.tableName));
    }
    getStream() { return this.getTable(); }
    filter(predicate) {
        return super.filter(predicate);
    }
    fork() {
        const clone = selection_1.createSelection(this.getTable());
        clone.__proto__.query = this.query.slice();
        return clone;
    }
    delete() {
        return datum_1.createDatum(this.getTable().then(tbl => tbl.delete()));
    }
    get(key) {
        return single_selection_1.createSingleSelection(this.getTable().then(tbl => tbl.get(key)));
    }
    getAll(...values) {
        return selection_1.createSelection(this.getTable().then(tbl => tbl.getAll(...values)));
    }
    insert(obj, options) {
        return datum_1.createDatum(this.getTable().then(tbl => options ? tbl.insert(obj, options) : tbl.insert(obj)));
    }
    // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
    indexCreate(key) {
        return datum_1.createDatum(this.getTable().then(tbl => tbl.indexCreate(key)));
    }
    indexDrop(key) {
        return datum_1.createDatum(this.getTable().then(tbl => tbl.indexDrop(key)));
    }
    indexList() {
        return datum_1.createDatum(this.getTable().then(tbl => tbl.indexList()));
    }
}
exports.RethinkTablePartial = RethinkTablePartial;
function createTable(db, tableName) {
    const instance = new RethinkTablePartial(db, tableName);
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