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
    _sel(attribute) {
        if (!this.sel)
            this.sel = attribute;
        else
            this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
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
        let q = this.query.find(a => a.cmd === 'limit');
        if (!q) {
            q = { cmd: 'limit', params: [n] };
            this.query.push(q);
        }
        else {
            q.params[0] = n;
        }
        return this;
    }
    pluck(...fields) {
        const q = this.query.find(a => a.cmd === 'pluck');
        if (q) {
            // override readonly
            q.params = q.params.concat(fields.filter(a => !q.params.includes(a)));
        }
        else {
            this.query.push({ cmd: 'pluck', params: fields });
        }
        return this;
    }
    async computeQuery() {
        if (!this.query.length)
            return { cmdsApplied: 0, select: '*' };
        const tableName = await util_1.resolveHValue(this.tableName);
        const primaryKey = await this.db.getPrimaryKey(tableName);
        let select = this.sel ? `[${this.sel}]` : '*';
        let post = undefined;
        let limit = undefined;
        let cmdsApplied = 0;
        for (const q of this.query) {
            const params = [];
            for (const p of q.params)
                params.push(await util_1.resolveHValue(p));
            switch (q.cmd) {
                case 'filter':
                    const pred = params[0];
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
                        return { cmdsApplied: 0, kill: true };
                    } // if it's true, we're g2g anyways
                    cmdsApplied++;
                    break;
                case 'distinct':
                    if (select.startsWith('DISTINCT'))
                        throw new Error('Cannot "distinct" something that is already "distinct"ed!');
                    select = 'DISTINCT ' + select;
                    cmdsApplied++;
                    break;
                case 'pluck':
                    if (!select.endsWith('*'))
                        throw new Error('Cannot pluck on an already selected or plucked stream!');
                    select = select.slice(0, -1) + params.map(a => `[${a}]`).join(', ');
                    cmdsApplied++;
                    break;
                case 'limit':
                    limit = params[0];
                    cmdsApplied++;
                    break;
                case 'map': // SKIP
                default:
                    if (post)
                        return { select, post: post + ')', limit, cmdsApplied };
                    else
                        return { select, limit, cmdsApplied };
            }
        }
        return { select, post, limit, cmdsApplied };
    }
}
exports.SQLite3Stream = SQLite3Stream;
//# sourceMappingURL=stream.js.map