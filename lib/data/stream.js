"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../internal/util");
const query_datum_1 = require("./query-datum");
class SQLite3Stream {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
        this.query = [];
    }
    filter(predicate) {
        this.query.push({ cmd: 'filter', params: [predicate] });
        return this;
    }
    map(predicate) {
        this.query.push({ cmd: 'map', params: [predicate] });
        return this;
    }
    distinct() {
        if (!this.query.find(q => q.cmd === 'distinct'))
            this.query.push({ cmd: 'distinct' });
        return this;
    }
    limit(n) {
        if (this.query.find(a => a.cmd === 'imit'))
            throw new Error('Cannot set a limit after having already set one!');
        this.query.push({ cmd: 'limit', params: [n] });
        return this;
    }
    pluck(...fields) {
        const idx = this.query.findIndex(q => q.cmd === 'pluck');
        if (idx >= 0) {
            this.query[idx].params = this.query[idx].params.concat(fields.filter(a => !this.query[idx].params.includes(a)));
        }
        else {
            this.query.push({ cmd: 'pluck', params: fields });
        }
        return this;
    }
    async computeQuery() {
        if (!this.query.length)
            return { select: '*' };
        const tableName = await util_1.resolveHValue(this.tableName);
        const primaryKey = await this.db.getPrimaryKey(tableName);
        const distinct = Boolean(this.query.find(q => q.cmd === 'distinct'));
        const pluck = this.query.find(q => q.cmd === 'pluck');
        const select = (distinct ? 'DISTINCT ' : '') + (pluck ? pluck.params.map(a => `[${a}]`).join(', ') : '*');
        let post = ``;
        let limit = undefined;
        let cmdsApplied = 0;
        for (const q of this.query) {
            switch (q.cmd) {
                case 'filter':
                    const pred = q.params[0];
                    let predfoo;
                    if (typeof pred === 'function')
                        predfoo = pred;
                    else if (typeof pred === 'object')
                        predfoo = util_1.deepPartialToPredicate(pred);
                    else
                        predfoo = () => Boolean(pred);
                    const res = predfoo(query_datum_1.createQueryDatum());
                    if (typeof res['compile'] === 'function') {
                        const query = await res.compile();
                        if (!post)
                            post = `[${primaryKey}] in (SELECT [${primaryKey}] FROM [${tableName}] WHERE ${query})`;
                        else
                            post += ` AND (${query})`;
                    }
                    else if (!res) {
                        return { kill: true };
                    } // if it's true, we're g2g anyways
                    cmdsApplied++;
                    break;
                case 'map':
                case 'distinct':
                case 'pluck':
                    break;
                case 'limit':
                    limit = q.params[0];
                    break;
                default:
                    if (cmdsApplied)
                        return { select, post: post + ')', limit };
                    else
                        return { select, limit };
            }
        }
        if (cmdsApplied)
            return { select, post, limit };
        else
            return { select, limit };
    }
}
exports.SQLite3Stream = SQLite3Stream;
//# sourceMappingURL=stream.js.map