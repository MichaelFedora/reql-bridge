"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RethinkStream = void 0;
const util_1 = require("../common/util");
const datum_1 = require("./datum");
const query_datum_1 = require("./query-datum");
class RethinkStream {
    constructor() {
        this.query = [];
    }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    count() {
        return datum_1.createDatum(this.compile().then(str => str.count()));
    }
    ;
    async run() {
        const str = await this.compile();
        this.query = [];
        this.sel = '';
        return str.run();
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
    async compile() {
        let stream = await this.getStream();
        const sel = await util_1.resolveValue(this.sel);
        if (!this.query.length && !this.sel)
            return stream;
        if (!this.query.length)
            return stream(sel);
        for (const q of this.query) {
            const params = [];
            for (const p of q.params)
                params.push(await util_1.resolveValue(p));
            switch (q.cmd) {
                case 'sel':
                    stream = stream(params[0]);
                    break;
                case 'filter':
                    const pred = params[0];
                    let predfoo;
                    if (typeof pred === 'function')
                        predfoo = pred;
                    else if (typeof pred === 'object')
                        predfoo = util_1.deepPartialToPredicate(pred);
                    else
                        predfoo = () => Boolean(pred);
                    const filterQuery = predfoo(query_datum_1.createQueryDatum());
                    if (typeof filterQuery['compile'] === 'function') {
                        const exec = await filterQuery.compile();
                        stream = stream.filter(exec);
                    }
                    else
                        throw new Error('bad time ahead');
                    break;
                case 'distinct':
                    stream = stream.distinct();
                    break;
                case 'pluck':
                    stream = stream.pluck(...params);
                    break;
                case 'limit':
                    stream = stream.limit(params[0]);
                    break;
                case 'map':
                    const mapfoo = params[0];
                    stream = stream.map(mapfoo);
                    break;
            }
        }
        return stream;
    }
}
exports.RethinkStream = RethinkStream;
//# sourceMappingURL=stream.js.map