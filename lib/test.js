"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const log4js_1 = require("log4js");
const index_1 = require("./index");
const pg_1 = require("pg");
const level = 'debug';
const layout = { type: 'pattern', pattern: '%[[%d][%p][%c]:%] %m' };
const errorLayout = { type: 'pattern', pattern: '%[[%d][%p][%c]:%] %f:%l %m%n%s' };
async function test(create, log) {
    log4js_1.configure({
        appenders: {
            stdout: { type: 'stdout', layout },
            stderr: { type: 'stderr', layout: errorLayout },
            out: { type: 'logLevelFilter', appender: 'stdout', level, maxLevel: 'info' },
            err: { type: 'logLevelFilter', appender: 'stderr', level: 'warn' }
        },
        categories: {
            default: { appenders: ['out', 'err'], level, enableCallStack: true }
        }
    });
    const logger = log4js_1.getLogger(log || 'test');
    const db = await create();
    const console = { log: (a, ...b) => logger.info(a, ...b) };
    // begin sample
    try {
        await db.tableCreate('my-table', [
            { name: 'key', type: 'string' },
            { name: 'value', type: 'any' }
        ]).run();
        const table = db.table('my-table');
        await table.insert({ key: 'fooo', value: 'apple' }).run();
        await table.insert({ key: 'bar', value: 2 }).run();
        await table.insert({ key: 'yeet', value: { super: false } }).run();
        console.log(await table.get('bar')('value').run()); // 2
        console.log(await table.filter(doc => doc('key').len().ge(4)).run());
        // ^- [ { key: 'fooo', value: 'apple' }, { key: 'yeet', value: { super: false } }
        console.log(await table.pluck('key').limit(1).map(doc => doc('key')).run()); // ['foo'] or ['bar'] or ['yeet'] (random)
        console.log(await table.getAll('yeet', 'bar').map(doc => doc('value')).run()); // [ 2, { super: false } ]
        const statement = table.filter(doc => doc('key').len().ge(4)).limit(2); // create a statement and add cmds to the queue
        console.log('count: ' + await statement.fork().count().run()); // forked queue, original stays the same
        console.log(await statement.filter(doc => doc('key').substr('e'))('value').run()); // original queue, flushing after run
        console.log(await statement.run()); // clean statement b/c it had an empty cmd queue
        // end sample
        const res = await db.tableCreate('test-table', [
            { name: 'key', type: 'string' },
            { name: 'value', type: 'object' },
            { name: 'count', type: 'number' },
            { name: 'sale', type: 'bool' }
        ])('tables_created').gt(0).run();
        logger.info('res: ', res);
        logger.info('table list: ', await db.tableList().run());
        logger.debug('types db: ', await db.table('__reql_typemap__').pluck('types').run().then(a => {
            return a.map(b => JSON.parse(b.types));
        }));
        const testTbl = db.table('test-table');
        logger.info('testTbl insert: ', await testTbl.insert({ key: 'foo', value: { type: 'bar' }, count: 3, sale: false }).run());
        logger.info('testTbl insert: ', await testTbl.insert({ key: 'lime', value: { type: 'juice' }, count: 0, sale: true }).run());
        logger.info('testTbl insert: ', await testTbl.insert({ key: 'orange', value: { type: 'syrup' }, count: 1, sale: false }).run());
        logger.info('testTbl: ', await testTbl.run());
        logger.info('testTbl.get("blah"): ', await testTbl.get('foo').run());
        logger.info('testTbl.getAll({ type: "bar" }, { index: "value" }): ', await testTbl.getAll({ type: 'bar' }, { index: 'value' }).run());
        logger.info('testTbl.insert(update): ', await testTbl.insert({ key: 'lime', value: { type: 'bar' } }, { conflict: 'update' }).run());
        logger.info('testTbl: ', await testTbl.run());
        logger.info('testTbl.limit(2): ', await testTbl.limit(2).run());
        logger.info('testTbl.pluck("key", "count").filter({ value: { type: bar } }): ', await testTbl.pluck('key', 'count').filter({ value: { type: 'bar' } }).run());
        logger.info('testTbl("key"): ', await testTbl('key').run());
        logger.info('testTbl("value")("type").filter(doc => doc.len().ge(4)): ', await testTbl('value')('type').filter(doc => doc.len().ge(4)).run());
        logger.info('testTbl.get("lime")("value")("type"): ', await testTbl.get('lime')('value')('type').run());
        logger.info('testTbl.filter(doc => doc("key").len().ge(4)): ', await testTbl.filter(doc => doc('key').len().ge(4)).run());
    }
    catch (e) {
        logger.error(e);
    }
    // cleanup!
    const list = await db.tableList().run();
    if (list.includes('my-table'))
        await db.tableDrop('my-table').run().catch(e => logger.error(e));
    if (list.includes('test-table'))
        await db.tableDrop('test-table').run().catch(e => logger.error(e));
    if (list.includes('__reql_typemap__'))
        await db.tableDrop('__reql_typemap__').run().catch(e => logger.error(e));
    return db.close();
}
const rootLog = log4js_1.getLogger('root');
(async () => {
    for (const [create, log] of [
        [() => index_1.createPostgresDatabase({ client: new pg_1.Client({ user: 'bobtest', password: 'keyboardcat', database: 'test' }) }), 'pg'],
        [index_1.createSQLite3Database, 'sqlite3'],
    ]) {
        await test(create, log).catch(e => rootLog.error(e));
    }
})().then(() => {
    process.exit(0);
}).catch(e => {
    log4js_1.shutdown(() => {
        console.error(e);
        process.exit(1);
    });
});
//# sourceMappingURL=test.js.map