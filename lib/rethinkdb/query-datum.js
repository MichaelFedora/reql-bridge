"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryDatum = void 0;
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
class RethinkQueryDatumPartial extends datum_1.AbstractDatumPartial {
    constructor() { super(); }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    fork() {
        const child = createQueryDatum();
        child.__proto__.query = this.query.slice();
        return child;
    }
    async run() {
        throw new Error('Cannot "run" a Query Datum!');
    }
    async compile() {
        const query = [];
        for (const q of this.query) {
            const params = q.params && q.params.slice();
            if (params) { // reduce parameters
                for (let i = 0; i < q.params.length; i++) {
                    if (params[i].compile)
                        params[i] = { exec: await params[i].compile() };
                    else
                        params[i] = await util_1.resolveValue(params[i]);
                }
            }
            query.push({ cmd: q.cmd, params });
        }
        return (doc) => {
            let datum = doc;
            let sel = '', sel2 = '';
            for (const q of query) {
                const params = q.params && q.params.slice();
                if (params)
                    for (let i = 0; i < params.length; i++)
                        if (params[i].exec)
                            params[i] = params[i].exec(datum);
                switch (q.cmd) {
                    case 'sel':
                        if (sel2)
                            throw new Error('Cannot filter via sub-objects!');
                        datum = datum(q.params[0]);
                        if (sel)
                            sel2 = q.params[0];
                        else
                            sel = q.params[0];
                        break;
                    case 'not':
                        datum = datum.not();
                        break;
                    case 'eq':
                        if (!sel)
                            throw new Error('Cannot start a filter with "eq"!');
                        datum = datum.eq(...params);
                        sel = sel2 = '';
                        break;
                    case 'ne':
                        if (!sel)
                            throw new Error('Cannot start a filter with "ne"!');
                        datum = datum.ne(...params);
                        sel = sel2 = '';
                        break;
                    case 'startsWith':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.match('^' + params[0]).ne(null);
                        break;
                    case 'endsWith':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.match(params[0] + '$').ne(null);
                        break;
                    case 'substr':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.match(params[0]).ne(null);
                        break;
                    case 'len':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.count();
                        break;
                    case 'or':
                        if (datum === doc)
                            throw new Error('Cannot start a filter with "or"!');
                        else
                            datum = datum.or(...params);
                        break;
                    case 'and':
                        if (datum === doc)
                            throw new Error('Cannot start a filter with "and"!');
                        else
                            datum = datum.and(...params);
                        break;
                    case 'add':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.add(...params);
                        break;
                    case 'sub':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.sub(...params);
                        break;
                    case 'mul':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.mul(...params);
                        break;
                    case 'div':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.div(...params);
                        break;
                    case 'mod':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.mod(...params);
                        break;
                    case 'gt':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.gt(...params);
                        break;
                    case 'lt':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.lt(...params);
                        break;
                    case 'ge':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.ge(...params);
                        break;
                    case 'le':
                        if (sel2)
                            throw new Error('Can only use "eq" and "ne" on sub-object!');
                        datum = datum.le(...params);
                        break;
                    default:
                        throw new Error(`Cannot perform query "${q.cmd}" on this (query) datum!`);
                }
            }
            return datum;
        };
    }
}
function createQueryDatum() {
    return selectable_1.makeSelector(new RethinkQueryDatumPartial());
}
exports.createQueryDatum = createQueryDatum;
//# sourceMappingURL=query-datum.js.map