"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelStream = void 0;
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const util_2 = require("./util");
class LevelStream {
    constructor() {
        this.query = [];
    }
    _sel(attribute) {
        this.sel = attribute;
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    count() {
        return static_datum_1.expr(util_1.createQuery(() => this.run().then(res => res.length)));
    }
    async run() {
        const res = await this.compile();
        this.query = [];
        this.sel = '';
        return res.map(v => v.value);
    }
    async compile() {
        const sel = await util_1.resolveValue(this.sel);
        if (!this.query.length && !this.sel)
            return util_2.processStream(await this.getStream());
        if (!this.query.length)
            return util_2.processStream(await this.getStream(), { type: 'transform', exec: (entry) => entry[sel] });
        const modifiers = [
            { type: 'test', exec: (entry) => entry != null },
            { type: 'transform', exec: (entry) => static_datum_1.expr(entry) }
        ];
        for (const q of this.query) {
            const params = [];
            for (const p of q.params)
                params.push(await util_1.resolveValue(p));
            switch (q.cmd) {
                case 'sel':
                    modifiers.push({ type: 'transform', exec: (entry) => static_datum_1.ensureDatum(entry)(q.params[0]) });
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
                    modifiers.push({ type: 'test', exec: (entry) => predfoo(entry) });
                    break;
                case 'distinct':
                    const hash = [];
                    modifiers.push({ type: 'test', exec: (entry) => !hash.includes(JSON.stringify(entry)) });
                    break;
                case 'pluck':
                    modifiers.push({ type: 'transform', exec: (entry) => {
                            const obj = {};
                            for (const key of params)
                                obj[key] = entry[key];
                            return obj;
                        } });
                    break;
                case 'limit':
                    let count = 0;
                    modifiers.push({ type: 'test', exec: () => count++ < params[0] });
                    break;
                case 'map':
                    const mapfoo = params[0];
                    modifiers.push({ type: 'transform', exec: (entry) => mapfoo(static_datum_1.ensureDatum(entry)) });
                    break;
            }
        }
        return util_2.processStream(await this.getStream(), ...modifiers);
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
}
exports.LevelStream = LevelStream;
//# sourceMappingURL=stream.js.map