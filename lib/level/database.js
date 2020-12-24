"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.LevelDatabase = void 0;
const encoding_down_1 = require("encoding-down");
const util_1 = require("../common/util");
const static_datum_1 = require("../common/static-datum");
const table_1 = require("./table");
const levelup_1 = require("levelup");
const util_2 = require("./util");
/*
Level tables work like so:

db.get({table}.__index_list__) => field[] -- first is primary
db.get({table}._index_.{index}) => key[]
db.get({table}._primary_.{key}) => value

db.put({table}._primary_.{key}, object)
indexes = db.get({table}.__index_list__);
for(i of indexes) {
  let old = db.get({table}._index_.{index}.{value})
  db.put({table}._index_.{index}.{value}, [...old, key])
}

db.del({table}._primary_.{key})
indexes = db.get({table}.__index_list__);
for(i of indexes) {
  let old = db.get({table}._index_.{index}.{value})
  db.put({table}._index_.{index}.{value}, old.filter(a => a !== key))
}
*/
class LevelDatabase {
    async init(options) {
        options = Object.assign({ logger: 'level' }, options);
        this.db = levelup_1.default(encoding_down_1.default(options.store, { keyEncoding: 'string', valueEncoding: 'json' }), options.options, err => { if (err)
            throw err; });
        const list = await this.db.get('__reql_table_list__').catch((e) => { if (e.notFound)
            return null;
        else
            throw e; });
        if (!list)
            await this.db.put('__reql_table_list__', []);
    }
    tableCreate(tableName, schema) {
        if (!schema.length)
            throw new Error('Must have a schema of at least one entry!');
        let indexes = schema.reduce((acc, c) => { if (c.index)
            acc.push(c.name); return acc; }, []);
        if (!indexes.length)
            indexes = [schema[0].name];
        return static_datum_1.expr(util_1.createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            const tableList = await this.db.get('__reql_table_list__').catch((e) => { if (e.notFound)
                return null;
            else
                throw e; });
            if (tableList.includes(tableName))
                return { tables_created: 0 };
            const table = util_2.subdb(this.db, tableName);
            await Promise.all([
                table.put('__index_list__', indexes),
                this.db.put('__reql_table_list__', [...tableList, tableName])
            ]);
            return { tables_created: 1 };
        }));
    }
    tableDrop(tableName) {
        return static_datum_1.expr(util_1.createQuery(async () => {
            if (typeof tableName !== 'string')
                tableName = await tableName.run();
            const tableList = await this.db.get('__reql_table_list__').catch((e) => { if (e.notFound)
                return null;
            else
                throw e; });
            if (!tableList.includes(tableName))
                return { tables_dropped: 0 };
            await Promise.all([
                this.db.put('__reql_table_list__', tableList.filter(a => a !== tableName)),
                util_2.subdb(this.db, tableName).clear()
            ]);
            return { tables_dropped: 1 };
        }));
    }
    tableList() {
        return static_datum_1.expr(util_1.createQuery(() => this.db.get('__reql_table_list__').catch((e) => { if (e.notFound)
            return null;
        else
            throw e; })));
    }
    table(tableName) {
        return table_1.createTable(this.db, tableName);
    }
    async close() {
        return this.db.close();
    }
}
exports.LevelDatabase = LevelDatabase;
async function create(options) {
    const db = new LevelDatabase();
    await db.init(options);
    return db;
}
exports.create = create;
exports.default = create;
//# sourceMappingURL=database.js.map