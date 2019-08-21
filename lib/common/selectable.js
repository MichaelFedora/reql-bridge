"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeSelector(partial) {
    const datum = function (attribute) {
        return makeSelector(partial._sel(attribute));
        /*const sel = partial._sel(attribute);
        if(sel === partial)
          return datum;
        else return makeSelector(sel);*/
    };
    datum.__proto__ = partial;
    return datum;
}
exports.makeSelector = makeSelector;
//# sourceMappingURL=selectable.js.map