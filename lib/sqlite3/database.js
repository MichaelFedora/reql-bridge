"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.SQLite3Database = void 0;
const wrapper_1 = require("./wrapper");
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const table_1 = require("./table");
class SQLite3Database {
    constructor() {
        this.typemapsType = Object.freeze([
            { name: 'table', type: 'string' },
            { name: 'types', type: 'string' },
        ]);
        this.typemapsTableName = '__reql_typemap__';
        this.valueTypeMap = {
            string: 'text',
            bool: 'numeric',
            number: 'numeric',
            object: 'text',
        };
    }
    async init(options) {
        options = Object.assign({ logger: 'sqlite3' }, options);
        this.db = await wrapper_1.create(Object.assign(options, { logger: options.logger + '.raw' }));
        const tableList = await this.tableList().run();
        if (!tableList.find(a => a === this.typemapsTableName)) {
            await this.tableCreate(this.typemapsTableName, this.typemapsType).run();
        }
    }
    get typemaps() {
        return this.table(this.typemapsTableName);
    }
    tableCreate(tableName, schema) {
        const indexes = [];
        let keys = '';
        for (const key of schema) {
            if (!keys) { // primary key
                keys = `[${key.name}] ${this.valueTypeMap[key.type] || 'text'} primary key`;
            }
            else {
                keys += `, [${key.name}] ${this.valueTypeMap[key.type] || 'text'}`;
            }
            if (key.index)
                indexes.push(key.name);
        }
        if (keys.length === 0)
            throw new Error('Must have a schema of at least one entry!');
        return static_datum_1.expr(util_1.createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            await this.db.exec(`CREATE TABLE IF NOT EXISTS [${tableName}] (${keys})`);
            await this.typemaps.insert({ table: tableName, types: JSON.stringify(schema) }, { conflict: 'replace' }).run();
            for (const index of indexes)
                await this.db.exec(`CREATE INDEX [${tableName}_${index}] ON [${tableName}]([${index}])`);
            return { tables_created: 1 };
        }));
    }
    tableDrop(tableName) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            await this.db.exec(`DROP TABLE IF EXISTS [${tableName}]`);
            return { tables_dropped: 1 };
        }));
    }
    tableList() {
        return static_datum_1.expr(util_1.createQuery(async () => {
            const result = await this.db.all('SELECT name FROM sqlite_master WHERE type=\'table\'');
            return result.map(a => a.name);
        }));
    }
    table(tableName) {
        return table_1.createTable(this.db, tableName, util_1.createQuery(async () => tableName !== this.typemapsTableName
            ? await this.typemaps.get(tableName)('types').run().then(a => JSON.parse(a))
            : this.typemapsType));
    }
    async close() {
        return this.db.close();
    }
}
exports.SQLite3Database = SQLite3Database;
async function create(options) {
    const db = new SQLite3Database();
    await db.init(options);
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=database.js.map