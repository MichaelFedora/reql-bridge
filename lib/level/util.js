"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStream = exports.subdb = exports.createPromiseArrayIteratable = void 0;
const sub = require("subleveldown");
const static_datum_1 = require("../common/static-datum");
const util_1 = require("../common/util");
function createPromiseArrayIteratable(array) {
    let index = 0;
    return {
        [Symbol.asyncIterator]() {
            return {
                next: async () => {
                    if (index >= array.length)
                        return { value: null, done: true };
                    return { value: await array[index++], done: false };
                }
            };
        }
    };
}
exports.createPromiseArrayIteratable = createPromiseArrayIteratable;
function subdb(db, prefix) {
    return sub(db, prefix, { keyEncoding: 'string', valueEncoding: 'json' });
}
exports.subdb = subdb;
async function processStream(stream, ...modifiers) {
    const entries = await new Promise((resolve, reject) => {
        const data = [];
        stream.on('data', (entry) => {
            data.push((async () => {
                for (const mod of modifiers) {
                    if (mod.type === 'test' && !await util_1.resolveValue(mod.exec(static_datum_1.ensureDatum(entry.value, true))))
                        return null;
                    else if (mod.type === 'transform')
                        entry.value = await util_1.resolveValue(mod.exec(entry.value));
                }
                return entry;
            })());
        })
            .on('end', () => { resolve(data); })
            .on('error', err => reject(err));
    });
    return (await Promise.all(entries)).filter(e => e != null);
}
exports.processStream = processStream;
//# sourceMappingURL=util.js.map