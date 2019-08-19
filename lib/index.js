"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var static_datum_1 = require("./common/static-datum");
exports.expr = static_datum_1.expr;
var database_1 = require("./sqlite3/database");
exports.createSQLite3Database = database_1.create;
var database_2 = require("./postgres/database");
exports.createPostgresDatabase = database_2.create;
//# sourceMappingURL=index.js.map