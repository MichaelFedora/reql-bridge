"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSelection = exports.RethinkSelectionPartial = void 0;
;
const stream_1 = require("./stream");
const datum_1 = require("./datum");
class RethinkSelectionPartial extends stream_1.RethinkStream {
    constructor(selection) {
        super();
        this.selection = selection;
    }
    async getSelection() {
        return await this.selection;
    }
    getStream() { return this.getSelection(); }
    fork() {
        const clone = createSelection(this.selection);
        clone.__proto__.query = this.query.slice();
        return clone;
    }
    filter(predicate) {
        return super.filter(predicate);
    }
    delete() {
        return datum_1.createDatum(this.compile().then(sel => sel.delete()));
    }
}
exports.RethinkSelectionPartial = RethinkSelectionPartial;
function createSelection(selection) {
    const instance = new RethinkSelectionPartial(selection);
    const o = Object.assign((attribute) => { instance._sel(attribute); return o; /* override return */ }, instance, {
        // AGGREGATION
        distinct() { instance.distinct(); return o; },
        limit(n) { instance.limit(n); return o; },
        // TRANSFORMS
        count() { return instance.count(); },
        map(predicate) { instance.map(predicate); return o; },
        pluck(...fields) { instance.pluck(...fields); return o; },
        filter(predicate) {
            instance.filter(predicate);
            return o;
        },
        // QUERY/etc
        delete() { return instance.delete(); },
        fork() { return instance.fork(); },
        run() { return instance.run(); }
    });
    o.__proto__ = instance;
    return o;
}
exports.createSelection = createSelection;
//# sourceMappingURL=selection.js.map