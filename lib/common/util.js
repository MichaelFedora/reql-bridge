"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceCorrectReturn = exports.deepPartialToPredicate = exports.resolveValue = exports.createQuery = void 0;
function createQuery(run) {
    const query = { run, fork: () => query };
    return query;
}
exports.createQuery = createQuery;
async function resolveValue(value) {
    if (value == null)
        return value;
    if (typeof value['run'] === 'function')
        return await value.run();
    return value;
}
exports.resolveValue = resolveValue;
function _dptpRecurse(doc, obj) {
    let statement;
    for (const k in obj)
        if (obj[k] != null) {
            if (typeof obj[k] === 'object')
                statement = statement ? statement.and(_dptpRecurse(doc(k), obj[k])) : _dptpRecurse(doc(k), obj[k]);
            else
                statement = statement ? statement.and(doc(k).eq(obj[k])) : doc(k).eq(obj[k]);
        }
    return statement;
}
function deepPartialToPredicate(obj) {
    return (doc) => _dptpRecurse(doc, obj);
}
exports.deepPartialToPredicate = deepPartialToPredicate;
function coerceCorrectReturn(obj, types) {
    if (!obj)
        return null;
    const boop = {}; // make boop[key] null or skip?
    for (const key in obj)
        if (obj[key] == null) {
            boop[key] = null;
        }
        else {
            const entry = types.find(a => a.name === key);
            switch (entry && entry.type) {
                case 'string':
                    boop[key] = obj[key];
                    break;
                case 'number':
                    boop[key] = Number(obj[key]);
                    break;
                case 'bool':
                    boop[key] = Boolean(obj[key]);
                    break;
                case 'object':
                    boop[key] = JSON.parse(obj[key]);
                    break;
                case 'any':
                    try {
                        boop[key] = JSON.parse(obj[key]);
                    }
                    catch (e) {
                        boop[key] = obj[key];
                    }
                    break;
                default:
                    throw new Error('Unknown type for key "' + key + '"!');
            }
        }
    return boop;
}
exports.coerceCorrectReturn = coerceCorrectReturn;
//# sourceMappingURL=util.js.map