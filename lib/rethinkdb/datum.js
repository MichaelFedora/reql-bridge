"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatum = void 0;
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
const query_datum_1 = require("./query-datum");
class RethinkDatumPartial extends datum_1.AbstractDatumPartial {
    constructor(datum) {
        super();
        this.datum = datum;
        this.errcount = 0;
    }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    fork() {
        console.log('bork');
        const child = createDatum(this.datum);
        child.__proto__.query = this.query.slice();
        return child;
    }
    async run() {
        return this.compile().then(d => d.run());
    }
    async compile() {
        let datum = await this.datum;
        let sel = '';
        let sel2 = '';
        for (const q of this.query) {
            const params = q.params && q.params.slice();
            if (params) { // reduce parameters
                for (let i = 0; i < q.params.length; i++) {
                    if (params[i].compile)
                        params[i] = await params[i].compile();
                    else
                        params[i] = await util_1.resolveValue(params[i]);
                }
            }
            switch (q.cmd) {
                case 'sel':
                    datum = datum(q.params[0]);
                    if (sel)
                        sel2 = q.params[0];
                    else
                        sel = q.params[0];
                    break;
                case 'not':
                    datum = datum.not();
                    break;
                case 'do':
                    const doQuery = params[0](query_datum_1.createQueryDatum());
                    if (typeof doQuery['compile'] === 'function') {
                        const exec = await doQuery.compile();
                        datum = datum.do(exec);
                    }
                    else
                        throw new Error('bad time ahead');
                    break;
                case 'branch':
                    const tests = [];
                    for (let i = 0; i < params.length; i++) {
                        if (i % 2 < 1) { // if even, it's an action (0, 2, etc)
                            if (typeof params[i] !== 'function')
                                tests.push(params[i]);
                            else {
                                const query = params[i](query_datum_1.createQueryDatum());
                                if (typeof query['compile'] === 'function')
                                    tests.push(await query.compile());
                                else
                                    tests.push(query);
                            }
                        }
                        else if (i === params.length - 1) { // false action
                            if (typeof params[i] !== 'function')
                                tests.push(params[i]);
                            else {
                                const query = params[i](query_datum_1.createQueryDatum());
                                if (typeof query['compile'] === 'function')
                                    tests.push(await query.compile());
                                else
                                    tests.push(query);
                            }
                        }
                        else { // odd, is a test (1, 3, etc)
                            tests.push(params[i]);
                        }
                    }
                    datum = datum.branch(tests[0], tests[1], ...tests.slice(2));
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
                    if (datum === this.datum)
                        throw new Error('Cannot start a filter with "or"!');
                    else
                        datum = datum.or(...params);
                    break;
                case 'and':
                    if (datum === this.datum)
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
                case 'count':
                    datum = datum.count();
                    break;
                case 'limit':
                    datum = datum.limit(Number(params[0]));
                    break;
                case 'difference':
                    datum = datum.difference(params[0]);
                    break;
                case 'contains':
                    datum = datum.contains(params[0]);
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
                        datum = datum.filter(exec);
                    }
                    else
                        throw new Error('bad time ahead');
                    break;
                case 'pluck':
                    datum.pluck(...params);
                    break;
                case 'map':
                    datum = datum.map(params[0]);
                    break;
                default:
                    throw new Error(`Cannot perform query "${q.cmd}" on this (rethink) datum!`);
            }
        }
        return datum;
    }
}
function createDatum(datum) {
    return selectable_1.makeSelector(new RethinkDatumPartial(datum));
}
exports.createDatum = createDatum;
//# sourceMappingURL=datum.js.map