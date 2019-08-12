"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeSelector(partial) {
    const datum = function (attribute) {
        return makeSelector(partial._sel(attribute));
    };
    datum.__proto__ = partial;
    return datum;
}
exports.makeSelector = makeSelector;
//# sourceMappingURL=selectable.js.map