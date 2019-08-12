"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../internal/util");
const selectable_1 = require("./selectable");
const datum_1 = require("./datum");
class SQLite3StaticDatumPartial extends datum_1.SQLite3DatumPartial {
    constructor(initialValue) {
        super();
        this.initialValue = initialValue;
    }
    _sel(attribute) {
        const child = new SQLite3StaticDatumPartial(this.initialValue);
        child.query = this.query.slice();
        child.query.push({ cmd: 'sel', params: [attribute] });
        return child;
    }
    async run() {
        const ret = await resolveQueryStatic(this.query, this.initialValue);
        this.query = [];
        return ret;
    }
}
async function resolveQueryStatic(query, initialValue) {
    let value = await util_1.resolveHValue(initialValue);
    for (const q of query) {
        const params = q.params.slice();
        if (params) { // reduce parameters
            for (let i = 0; i < q.params.length; i++)
                params[i] = await util_1.resolveHValue(params[i]);
        }
        switch (q.cmd) {
            case 'map':
                if (!(value instanceof Array))
                    throw new Error('Cannot map a non-array value!');
                const newv = [];
                for (const subv of value) {
                    newv.push(await util_1.resolveHValue(params[0](createStaticDatum(subv))));
                }
                value = newv;
                break;
            case 'sel':
                value = value[params[0]];
                break;
            case 'eq':
                value = !params.find(a => a !== value);
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
            case 'add':
                value = params.reduce((acc, v) => acc + value, value);
                break;
            case 'sub':
                value = params.reduce((acc, v) => acc - value, value);
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
            default:
                throw new Error(`Cannot perform query "${q.cmd}" on this (static) datum!`);
        }
    }
    return value;
}
exports.resolveQueryStatic = resolveQueryStatic;
function createStaticDatum(initialValue) {
    return selectable_1.makeSelector(new SQLite3StaticDatumPartial(initialValue));
}
exports.createStaticDatum = createStaticDatum;
//# sourceMappingURL=static-datum.js.map