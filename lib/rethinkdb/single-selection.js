"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSingleSelection = void 0;
const util_1 = require("../common/util");
const selectable_1 = require("../common/selectable");
const datum_1 = require("../common/datum");
const datum_2 = require("./datum");
/*
const key = await resolveValue(this.key);
const index = await resolveValue(this.index);
const tableName = await resolveValue(this.tableName);
return this.db.table(tableName).getAll(key, { index }).nth(0);
*/
class RethinkSingleSelectionPartial extends datum_1.AbstractDatumPartial {
    constructor(selection) {
        super();
        this.selection = selection;
    }
    async getSelection() {
        return await this.selection;
    }
    _sel(attribute) {
        const ret = this.getSelection().then(sel => util_1.resolveValue(attribute).then(val => sel(val)));
        return datum_2.createDatum(ret);
    }
    // Selection
    update(obj) {
        return datum_2.createDatum(this.getSelection().then(sel => util_1.resolveValue(obj).then(val => sel.update(val))));
    }
    replace(obj) {
        return datum_2.createDatum(this.getSelection().then(sel => util_1.resolveValue(obj).then(val => sel.replace(val))));
    }
    delete() {
        return datum_2.createDatum(this.getSelection().then(a => a.delete()));
    }
    // Query
    fork() {
        const clone = createSingleSelection(this.selection);
        clone.query = this.query.slice();
        return clone;
    }
    async run() {
        return this.getSelection().then(sel => sel.run()).then(res => res && res[0]);
    }
}
function createSingleSelection(selection) {
    return selectable_1.makeSelector(new RethinkSingleSelectionPartial(selection));
}
exports.createSingleSelection = createSingleSelection;
//# sourceMappingURL=single-selection.js.map