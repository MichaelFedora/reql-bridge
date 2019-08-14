"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../internal/util");
const selectable_1 = require("./selectable");
const datum_1 = require("./datum");
const static_datum_1 = require("./static-datum");
class SQLite3SingleSelectionPartial extends datum_1.SQLite3DatumPartial {
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
        const key = await util_1.resolveHValue(this.key);
        const index = await util_1.resolveHValue(this.index);
        const tableName = await util_1.resolveHValue(this.tableName);
        if (!this.query || !this.query.length) {
            return this.db.get(`SELECT * FROM [${tableName}] WHERE [${index}]=${util_1.safen(key)}`)
                .then(async (r) => util_1.coerceCorrectReturn(r, await util_1.resolveHValue(this.types)));
        }
        let cmd = '';
        const params = [];
        if (this.cmds.includes(this.query[0].cmd)) {
            const q = this.query.shift();
            cmd = q.cmd;
            for (const p of q.params)
                params.push(await util_1.resolveHValue(p));
            if ((cmd === 'update' || cmd === 'replace') && !Object.keys(params[0]).filter(k => params[0][k]).length) {
                cmd = 'delete';
            }
        }
        let query = '';
        let sel = '';
        switch (cmd) {
            case 'sel':
                query = `SELECT ${params[0]} FROM [${tableName}] WHERE [${index}]=${util_1.safen(key)}`;
                sel = params[0];
                break;
            case 'update':
                let set = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!set)
                            set = `[${k}]=${params[0][k]}`;
                        else
                            set += `, [${k}]=${params[0][k]}`;
                    }
                query = `UPDATE [${tableName}] SET ${set} WHERE [${index}]=${util_1.safen(key)}`;
                break;
            case 'replace':
                let repKeys = '';
                let repValues = '';
                for (const k in params[0])
                    if (params[0][k] != null) {
                        if (!repKeys) {
                            repKeys = `[${k}]`;
                            repValues = `${params[0][k]}`;
                        }
                        else {
                            repKeys += `, [${k}]`;
                            repValues += `, ${params[0][k]}`;
                        }
                    }
                query = `REPLACE INTO [${tableName}] (${repKeys}) VALUES (${repValues}) WHERE ${[index]}=${util_1.safen(key)}`;
                break;
            case 'delete':
                query = `DELETE FROM [${tableName}] WHERE ${[index]}=${util_1.safen(key)}`;
                break;
            default:
                query = `SELECT * FROM [${tableName}] WHERE ${[index]}=${util_1.safen(key)}`;
        }
        const value = await this.db.get(query).then(async (r) => util_1.coerceCorrectReturn(r, await util_1.resolveHValue(this.types)))
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
    return selectable_1.makeSelector(new SQLite3SingleSelectionPartial(db, tableName, key, index, types));
}
exports.createSingleSelection = createSingleSelection;
//# sourceMappingURL=single-selection.js.map