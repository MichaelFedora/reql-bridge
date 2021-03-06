"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatum = exports.expr = exports.exprQuery = exports.resolveQueryStatic = void 0;
const util_1 = require("./util");
const selectable_1 = require("./selectable");
const datum_1 = require("./datum");
class StaticDatum extends datum_1.AbstractDatumPartial {
    constructor(initialValue) {
        super();
        this.initialValue = initialValue;
    }
    _sel(attribute) {
        this.query.push({ cmd: 'sel', params: [attribute] });
        return this;
    }
    fork() {
        const clone = expr(this.initialValue);
        clone.__proto__.query = this.query.slice();
        return clone;
    }
    async run() {
        const ret = await resolveQueryStatic(this.query, this.initialValue);
        this.query = [];
        return ret;
    }
}
async function resolveQueryStatic(query, initialValue) {
    let value = await util_1.resolveValue(initialValue);
    for (const q of query) {
        const params = q.params && q.params.slice();
        if (params) { // reduce parameters
            for (let i = 0; i < q.params.length; i++)
                params[i] = await util_1.resolveValue(params[i]);
        }
        switch (q.cmd) {
            case 'sel':
                if (value instanceof Array)
                    value = value.map(a => a[params[0]]);
                else if (typeof value === 'object' && value != null)
                    value = value[params[0]];
                else
                    value = undefined;
                break;
            case 'eq':
                value = Boolean(params.find(a => a === value));
                break;
            case 'ne':
                value = Boolean(params.find(a => a !== value));
                break;
            case 'or':
                value = Boolean(params.reduce((acc, v) => acc || v, value));
                break;
            case 'and':
                value = Boolean(params.reduce((acc, v) => acc && v, value));
                break;
            case 'do':
                value = await util_1.resolveValue(params[0](expr(value)));
                break;
            case 'branch':
                let testValue = value;
                let retValue;
                for (let i = 0; i < params.length; i++) {
                    if (i % 2 < 1) { // if even, it's an action (0, 2, etc)
                        if (testValue) {
                            if (typeof params[i] === 'function')
                                retValue = await util_1.resolveValue(params[i](expr(value)));
                            else
                                retValue = params[i];
                        }
                    }
                    else if (i === params.length - 1) { // false action
                        if (typeof params[i] === 'function')
                            retValue = await util_1.resolveValue(params[i](expr(value)));
                        else
                            retValue = params[i];
                    }
                    else { // odd, is a test (1, 3, etc)
                        testValue = params[i];
                    }
                }
                value = retValue;
                break;
            case 'startsWith':
                value = (value || '').startsWith(params[0]);
                break;
            case 'endsWith':
                value = (value || '').endsWith(params[0]);
                break;
            case 'substr':
                value = (value || '').includes(params[0]);
                break;
            case 'len':
                value = (value || '').length;
                break;
            case 'add':
                value = params.reduce((acc, v) => acc + v, value);
                break;
            case 'sub':
                value = params.reduce((acc, v) => acc - v, value);
                break;
            case 'mul':
                value = params.reduce((acc, v) => acc * v, value);
                break;
            case 'div':
                value = params.reduce((acc, v) => acc / v, value);
                break;
            case 'mod':
                value = params.reduce((acc, v) => acc % v, value);
                break;
            case 'gt':
                value = !params.find((v, i, arr) => {
                    if (i === 0)
                        return value <= v;
                    else
                        return arr[i - 1] <= v;
                });
                break;
            case 'lt':
                value = !params.find((v, i, arr) => {
                    if (i === 0)
                        return value >= v;
                    else
                        return arr[i - 1] >= v;
                });
                break;
            case 'ge':
                value = !params.find((v, i, arr) => {
                    if (i === 0)
                        return value < v;
                    else
                        return arr[i - 1] < v;
                });
                break;
            case 'le':
                value = !params.find((v, i, arr) => {
                    if (i === 0)
                        return value > v;
                    else
                        return arr[i - 1] > v;
                });
                break;
            case 'count':
                if (!(value instanceof Array))
                    throw new Error('Cannot count a non-array value: ' + JSON.stringify(value));
                value = value.length;
                break;
            case 'limit':
                if (!(value instanceof Array))
                    throw new Error('Cannot limit a non-array value: ' + JSON.stringify(value));
                value = value.slice(0, Number(params[0]));
                break;
            case 'difference':
                if (!(value instanceof Array))
                    throw new Error('Cannot "difference" a non-array value: ' + JSON.stringify(value));
                value = value.filter(a => !params[0].includes(a));
                break;
            case 'contains':
                if (!(value instanceof Array))
                    throw new Error('Cannot "contains" a non-array value: ' + JSON.stringify(value));
                value = Boolean(value.find(a => a === (params[0])));
                break;
            case 'filter':
                if (!(value instanceof Array))
                    throw new Error('Cannot filter a non-array value: ' + JSON.stringify(value));
                const pred = params[0];
                let predfoo;
                if (typeof pred === 'function')
                    predfoo = pred;
                else if (typeof pred === 'object')
                    predfoo = util_1.deepPartialToPredicate(pred);
                else
                    predfoo = () => Boolean(pred);
                value = value.filter(a => predfoo(expr(a)));
                break;
            case 'pluck':
                if (value instanceof Array) {
                    const newvalue = [];
                    for (const item of value) {
                        const newitem = {};
                        for (const key of params)
                            if (item[key]) {
                                newitem[key] = value[key];
                            }
                        newvalue.push(newitem);
                    }
                    value = newvalue;
                }
                else if (typeof value === 'object' && value != null) {
                    const newvalue = {};
                    for (const key of params)
                        if (value[key])
                            newvalue[key] = params[key];
                    value = newvalue;
                }
                break;
            case 'map':
                if (!(value instanceof Array))
                    throw new Error('Cannot map a non-array value: ' + JSON.stringify(value));
                const newv = [];
                for (const subv of value) {
                    newv.push(await util_1.resolveValue(params[0](expr(subv))));
                }
                value = newv;
                break;
            default:
                throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
        }
    }
    return value;
}
exports.resolveQueryStatic = resolveQueryStatic;
function exprQuery(initialValue, query) {
    const datum = selectable_1.makeSelector(new StaticDatum(initialValue));
    datum.__proto__.query = query;
    return datum;
}
exports.exprQuery = exprQuery;
function expr(initialValue) {
    return selectable_1.makeSelector(new StaticDatum(initialValue));
}
exports.expr = expr;
function ensureDatum(value, fork = false) {
    if (value instanceof datum_1.AbstractDatumPartial)
        return fork ? value : value.fork();
    else
        return expr(value);
}
exports.ensureDatum = ensureDatum;
//# sourceMappingURL=static-datum.js.map