"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
const util_2 = require("./util");
class SQLite3QueryDatumPartial extends datum_1.AbstractDatumPartial {
    constructor() { super(); }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    fork() {
        const child = createQueryDatum();
        child.query = this.query.slice();
        return child;
    }
    async run() {
        throw new Error('Cannot "run" a Query Datum!');
    }
    async compile() {
        let query = '';
        let sel = '';
        let sel2 = '';
        for (const q of this.query) {
            const params = q.params && q.params.slice();
            if (params) { // reduce parameters
                for (let i = 0; i < q.params.length; i++) {
                    if (params[i].compile)
                        params[i] = util_2.safen(await params[i].compile());
                    else
                        params[i] = util_2.safen(await util_1.resolveValue(params[i]));
                }
            }
            switch (q.cmd) {
                case 'sel':
                    if (sel2)
                        throw new Error('Cannot filter via sub-objects in SQLite3!');
                    else if (sel)
                        sel2 = params[0].slice(1, -1); // get rid of the double quotes
                    else
                        sel = params[0].slice(1, -1);
                    break;
                case 'not':
                    if (query)
                        query = 'NOT (' + query + ')';
                    else
                        query += 'NOT ';
                    break;
                case 'eq':
                    if (!sel)
                        throw new Error('Cannot start a filter with "eq"!');
                    if (query)
                        query += ' AND ';
                    if (sel2)
                        query += `${sel} LIKE '%"${sel2}":${params[0].replace(/^'|'$/g, '"')}%'`;
                    else
                        query += `${sel} = ${params[0]}`;
                    sel = sel2 = '';
                    break;
                case 'ne':
                    if (!sel)
                        throw new Error('Cannot start a filter with "ne"!');
                    if (query)
                        query += ' AND ';
                    if (sel2)
                        query += `${sel} NOT LIKE '%"${sel2}":${params[0]}%`;
                    else
                        query += `${sel} != ${params[0]}`;
                    sel = sel2 = '';
                    break;
                case 'startsWith':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${'"%' + params[0].slice(1)})`;
                    break;
                case 'endsWith':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${params[0].slice(0, -1) + '%"'})`;
                    break;
                case 'substr':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `(${sel} LIKE ${'"%' + params[0].slice(1, -1) + '%"'})`;
                    break;
                case 'length':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    sel = `LENGTH(${sel})`;
                    break;
                case 'or':
                    if (!query)
                        throw new Error('Cannot start a filter with "or"!');
                    else
                        query += ' OR (' + params[0] + ')';
                    break;
                case 'and':
                    if (!query)
                        throw new Error('Cannot start a filter with "and"!');
                    else
                        query += ' AND (' + params[0] + ')';
                    break;
                case 'add':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} + ${params[0]})`;
                    else
                        throw new Error('Cannot use "add" without something selected!');
                    break;
                case 'sub':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} - ${params[0]})`;
                    else
                        throw new Error('Cannot use "sub" without something selected!');
                    break;
                case 'mul':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} * ${params[0]})`;
                    else
                        throw new Error('Cannot use "mul" without something selected!');
                    break;
                case 'div':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} / ${params[0]})`;
                    else
                        throw new Error('Cannot use "div" without something selected!');
                    break;
                case 'div':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} % ${params[0]})`;
                    else
                        throw new Error('Cannot use "mod" without something selected!');
                    break;
                case 'gt':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} > ${params[0]})`;
                    else
                        throw new Error('Cannot use "gt" without something selected!');
                    break;
                case 'lt':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} < ${params[0]})`;
                    else
                        throw new Error('Cannot use "lt" without something selected!');
                    break;
                case 'ge':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} >= ${params[0]})`;
                    else
                        throw new Error('Cannot use "ge" without something selected!');
                    break;
                case 'le':
                    if (sel2)
                        throw new Error('Can only use "eq" and "ne" on sub-object!');
                    else if (sel)
                        sel = `(${sel} <= ${params[0]})`;
                    else
                        throw new Error('Cannot use "le" without something selected!');
                    break;
                default: // map, contains, difference
                    throw new Error(`Cannot perform command "${q.cmd}" on this (query) datum!`);
            }
        }
        if (query && sel)
            return query + ' AND ' + sel;
        else if (sel)
            return sel;
        else
            return query;
    }
}
function createQueryDatum() {
    return selectable_1.makeSelector(new SQLite3QueryDatumPartial());
}
exports.createQueryDatum = createQueryDatum;
//# sourceMappingURL=query-datum.js.map