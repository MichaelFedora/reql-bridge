"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
const static_datum_1 = require("../common/static-datum");
const util_2 = require("./util");
class PostgresSingleSelectionPartial extends datum_1.AbstractDatumPartial {
    constructor(db, tableName, key, index, types) {
        super();
        this.db = db;
        this.tableName = tableName;
        this.key = key;
        this.index = index;
        this.types = types;
        this.cmds = ['sel', 'update', 'replace', 'delete'];
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
        const clone = createSingleSelection(this.db, this.tableName, this.key, this.index, this.types);
        clone.query = this.query.slice();
        return clone;
    }
    async run() {
        const key = await util_1.resolveValue(this.key);
        const index = await util_1.resolveValue(this.index);
        const tableName = await util_1.resolveValue(this.tableName);
        if (!this.query || !this.query.length) {
            return this.db.get(`SELECT * FROM ${JSON.stringify(tableName)} WHERE ${JSON.stringify(index)}=${util_2.safen(key)}`)
                .then(async (r) => util_1.coerceCorrectReturn(r, await util_1.resolveValue(this.types)));
        }
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
        let query = '';
        let sel = '';
        switch (cmd) {
            case 'sel':
                query = `SELECT ${params[0]} FROM ${JSON.stringify(tableName)} WHERE ${JSON.stringify(index)}=${util_2.safen(key)}`;
                sel = params[0];
                break;
            case 'update':
                let set = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!set)
                            set = `${JSON.stringify(k)}=${params[0][k]}`;
                        else
                            set += `, ${JSON.stringify(k)}=${params[0][k]}`;
                    }
                query = `UPDATE ${JSON.stringify(tableName)} SET ${set} WHERE ${JSON.stringify(index)}=${util_2.safen(key)}`;
                break;
            case 'replace':
                let repKeys = '';
                let repValues = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!repKeys) {
                            repKeys = `${JSON.stringify(k)}`;
                            repValues = `${params[0][k]}`;
                        }
                        else {
                            repKeys += `, ${JSON.stringify(k)}`;
                            repValues += `, ${params[0][k]}`;
                        }
                    }
                query = `REPLACE INTO ${JSON.stringify(tableName)} (${repKeys}) VALUES (${repValues}) WHERE ${[index]}=${util_2.safen(key)}`;
                break;
            case 'delete':
                query = `DELETE FROM ${JSON.stringify(tableName)} WHERE ${[index]}=${util_2.safen(key)}`;
                break;
            default:
                query = `SELECT * FROM ${JSON.stringify(tableName)} WHERE ${[index]}=${util_2.safen(key)}`;
        }
        const value = await this.db.get(query).then(async (r) => util_1.coerceCorrectReturn(r, await util_1.resolveValue(this.types)))
            .then(a => sel ? a[sel] : a);
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
function createSingleSelection(db, tableName, key, index, types) {
    return selectable_1.makeSelector(new PostgresSingleSelectionPartial(db, tableName, key, index, types));
}
exports.createSingleSelection = createSingleSelection;
//# sourceMappingURL=single-selection.js.map