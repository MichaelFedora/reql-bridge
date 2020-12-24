"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTable = exports.LevelTablePartial = void 0;
const uuid_1 = require("uuid");
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const util_2 = require("./util");
const single_selection_1 = require("./single-selection");
const stream_1 = require("./stream");
const selection_1 = require("./selection");
class LevelTablePartial extends stream_1.LevelStream {
    constructor(db, tableName) {
        super();
        this.db = db;
        this.tableName = tableName;
    }
    getStream() { return this.getTable().then(tbl => util_2.subdb(tbl, 'primary').createReadStream()); }
    async getTable() {
        return util_2.subdb(this.db, await util_1.resolveValue(this.tableName));
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    fork() {
        const child = selection_1.createSelection(this.db, this.tableName);
        child.__proto__.query = this.query.slice();
        child.__proto__.sel = this.sel;
        return child;
    }
    delete() {
        return static_datum_1.expr(util_1.createQuery(() => {
            return this.getTable().then(tbl => tbl.clear()).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
        }));
    }
    get(key) {
        return single_selection_1.createSingleSelection(this.db, this.tableName, key);
    }
    getAll(...values) {
        let index;
        if (values.length && typeof values[values.length - 1] === 'object')
            index = values.pop().index;
        return selection_1.createSelection(this.db, this.tableName, values, index);
    }
    insert(obj, options) {
        options = Object.assign({ conflict: 'replace' }, options);
        return static_datum_1.expr(util_1.createQuery(async () => {
            const table = await this.getTable();
            const indexes = await table.get('__index_list__');
            const primaryKey = indexes.shift();
            let objKey = obj[primaryKey];
            const primaryTable = util_2.subdb(table, 'primary');
            if (!objKey) {
                do {
                    objKey = uuid_1.v4();
                } while (await primaryTable.get(objKey).catch((e) => { if (e.notFound)
                    return null;
                else
                    throw e; }));
            }
            else if (options.conflict !== 'replace') {
                const curr = await primaryTable.get(objKey).catch((e) => { if (e.notFound)
                    return null;
                else
                    throw e; });
                if (curr) {
                    if (options.conflict === 'error')
                        throw new Error('Object with primary key ' + objKey + ' already exists!');
                    else
                        obj = Object.assign({}, curr, obj);
                }
            }
            const indexValues = (await Promise.all(indexes.map(i => table.get(`!index!!${i}!${obj[i]}`).catch(e => { if (e.notFound)
                return [];
            else
                throw e; })))).filter(ivs => !ivs.includes(objKey));
            const ops = [
                { type: 'put', key: '!primary!' + objKey, value: obj },
                ...(indexValues.map((iv, i) => ({
                    type: 'put',
                    key: `!index!!${indexes[i]}!${obj[indexes[i]]}`,
                    value: [...iv, objKey]
                })))
            ];
            const ret = await table.batch(ops).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
            return ret;
        }));
    }
    // indexCreate(name: Value<String>, indexFunction: (doc: Datum<T>) => Value<boolean>): Datum<IndexChangeResult>;
    indexCreate(key) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const table = await this.getTable();
            const indexList = await table.get('__index_list__');
            if (indexList.includes(key))
                return { created: 0 };
            const indexValues = await util_2.processStream(util_2.subdb(table, 'primary').createReadStream(), { type: 'transform', exec: (entry) => ({ key: entry.key, value: entry.value[key] }) });
            const indexMap = new Map();
            for (const iv of indexValues) {
                if (!indexMap.get(iv.value))
                    indexMap.set(iv.value, [iv.key]);
                else
                    indexMap.get(iv.value).push(iv.key);
            }
            const ops = [{ type: 'put', key: '__index_list__', value: [...indexList, key] }];
            indexMap.forEach((v, k) => ops.push({ type: 'put', key: '!index!!' + key + '!' + k, value: v }));
            await table.batch(ops);
            return { created: 1 };
        }));
    }
    indexDrop(key) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const table = await this.getTable();
            const indexList = await table.get('__index_list__');
            if (!indexList.includes(key))
                return { dropped: 0 };
            await Promise.all([
                table.put('__index_list__', indexList.filter(a => a !== key)),
                util_2.subdb(util_2.subdb(table, 'index'), key).clear()
            ]);
            return { dropped: 1 };
        }));
    }
    indexList() {
        return static_datum_1.expr(util_1.createQuery(() => this.getTable().then(tbl => tbl.get('__index_list__'))));
    }
}
exports.LevelTablePartial = LevelTablePartial;
function createTable(db, tableName) {
    const instance = new LevelTablePartial(db, tableName);
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