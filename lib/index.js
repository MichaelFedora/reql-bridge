"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresDatabase = exports.createSQLite3Database = exports.expr = void 0;
var static_datum_1 = require("./common/static-datum");
Object.defineProperty(exports, "expr", { enumerable: true, get: function () { return static_datum_1.expr; } });
var database_1 = require("./sqlite3/database");
Object.defineProperty(exports, "createSQLite3Database", { enumerable: true, get: function () { return database_1.create; } });
var database_2 = require("./postgres/database");
Object.defineProperty(exports, "createPostgresDatabase", { enumerable: true, get: function () { return database_2.create; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map