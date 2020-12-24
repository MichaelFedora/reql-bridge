"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSingleSelection = void 0;
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
const static_datum_1 = require("../common/static-datum");
const util_2 = require("./util");
class LevelSingleSelectionPartial extends datum_1.AbstractDatumPartial {
    constructor(db, tableName, key, index) {
        super();
        this.db = db;
        this.tableName = tableName;
        this.key = key;
        this.index = index;
        this.cmds = ['update', 'replace', 'delete'];
    }
    async getTable() {
        return util_2.subdb(this.db, await util_1.resolveValue(this.tableName));
    }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    // Selection
    update(obj) {
        this.query.push({ cmd: 'update', params: [obj] });
        return this;
    }
    replace(obj) {
        this.query.push({ cmd: 'replace', params: [obj] });
        return this;
    }
    delete() {
        this.query.push({ cmd: 'delete' });
        return this;
    }
    // Query
    fork() {
        const clone = createSingleSelection(this.db, this.tableName, this.key, this.index);
        clone.__proto__.query = this.query.slice();
        return clone;
    }
    async run() {
        let key = await util_1.resolveValue(this.key);
        const table = await this.getTable();
        if (this.index)
            key = await util_2.subdb(table, 'index!!' + await util_1.resolveValue(this.index)).get(key);
        const primaryTable = util_2.subdb(table, 'primary');
        if (!this.query.length)
            return primaryTable.get(key).catch((e) => { if (e.notFound)
                return null;
            else
                throw e; });
        let cmd = '';
        const params = [];
        if (this.cmds.includes(this.query[0].cmd)) {
            const q = this.query.shift();
            cmd = q.cmd;
            for (const p of q.params)
                params.push(await util_1.resolveValue(p));
            if ((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
                cmd = 'delete';
            }
        }
        let value;
        switch (cmd) {
            case 'sel':
                value = await primaryTable.get(key).then(a => a != null ? a[params[0]] : a)
                    .catch((e) => { if (e.notFound)
                    return null;
                else
                    throw e; });
                break;
            case 'update':
                const old = await primaryTable.get(key).catch((e) => { if (e.notFound)
                    return null;
                else
                    throw e; });
                value = await primaryTable.put(key, Object.assign({}, old, params[0])).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 1, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
                break;
            case 'replace':
                value = await primaryTable.put(key, params[0]).then(() => ({ deleted: 0, skipped: 0, errors: 0, inserted: 0, replaced: 1, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
                break;
            case 'delete':
                value = await primaryTable.del(key).then(() => ({ deleted: 1, skipped: 0, errors: 0, inserted: 0, replaced: 0, unchanged: 0 }), e => ({ deleted: 0, skipped: 1, errors: 1, first_error: String(e), inserted: 0, replaced: 0, unchanged: 1 }));
                break;
            default: value = await primaryTable.get(key).catch((e) => { if (e.notFound)
                return null;
            else
                throw e; });
        }
        if (this.query.length > 0) {
            const ret = await static_datum_1.resolveQueryStatic(this.query, value);
            this.query = [];
            return ret;
        }
        else {
            return value;
        }
    }
}
function createSingleSelection(db, tableName, key, index) {
    return selectable_1.makeSelector(new LevelSingleSelectionPartial(db, tableName, key, index));
}
exports.createSingleSelection = createSingleSelection;
//# sourceMappingURL=single-selection.js.map