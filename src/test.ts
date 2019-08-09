import { getLogger, configure } from 'log4js';
import { create as createReQLSQLite3DB } from './reql-sqlite3';

const level = 'trace';
const layout = { type: 'pattern', pattern: '%[[%d][%p][%c]:%] %m' };
const errorLayout = { type: 'pattern', pattern: '%[[%d][%p][%c]:%] %f:%l %m%n%s' };

interface TableType { key: string; value: object; count: number; sale: boolean; }

(async () => {

  configure({
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

  const logger = getLogger('db2');

  const db = await createReQLSQLite3DB();

  // begin sample

  await db.tableCreate('my-table', [
    { name: 'key', type: 'string' },
    { name: 'value', type: 'any' }
  ]).run();
  const table = db.table<{ key: string, value: any }>('my-table');
  await table.insert({ key: 'fooo', value: 'apple' }).run();
  await table.insert({ key: 'bar', value: 2 }).run();
  await table.insert({ key: 'yeet', value: { super: false } }).run();

  console.log(await table.get('bar')('value').run()); // pear
  console.log(await table.filter(doc => doc('key').len().ge(4)).run()); // { key: 'fooo', value: 'apple' }
  console.log(await table.pluck('key').limit(1).map(doc => doc('key')).run()); // ['foo'] or ['bar'] or ['yeet'] (random)
  console.log(await table.getAll('yeet', 'bar').map(doc => doc('value')).run()); // [ 2, { super: false } ]

  // end sample

  const res = await db.tableCreate('test-table', [
    { name: 'key', type: 'string' },
    { name: 'value', type: 'object' },
    { name: 'count', type: 'number' },
    { name: 'sale', type: 'bool' }
  ])('tables_created').gt(0).run();
  logger.info('res: ', res);
  logger.info('table list: ', await db.tableList().run());
  logger.debug('types db: ', await db.table<{ types: string }>('__reql_typemap__').pluck('types').run().then(a => {
    return a.map(b => JSON.parse(b.types));
  }));
  const testTbl = db.table<TableType>('test-table');
  logger.info('testTbl insert: ', await testTbl.insert({ key: 'foo', value: { type: 'bar' }, count: 3, sale: false }).run());
  logger.info('testTbl insert: ', await testTbl.insert({ key: 'lime', value: { type: 'juice' }, count: 0, sale: true }).run());
  logger.info('testTbl insert: ', await testTbl.insert({ key: 'orange', value: { type: 'syrup' }, count: 1, sale: false }).run());
  logger.info('testTbl: ', await testTbl.run());
  logger.info('testTbl.get("blah"): ', await testTbl.get('foo').run());
  logger.info('testTbl.getAll({ type: "bar" }, { index: "value" }): ', await testTbl.getAll({ type: 'bar' }, { index: 'value' }).run());
  logger.info('testTbl.insert(update): ', await testTbl.insert({ key: 'lime', value: { type: 'bar' } } as any, { conflict: 'update' }).run());
  logger.info('testTbl: ', await testTbl.run());
  logger.info('testTbl.limit(2): ', await testTbl.limit(2).run());
  logger.info('testTbl.pluck("key", "count").filter({ value: { type: bar } }): ',
    await testTbl.pluck('key', 'count').filter({ value: { type: 'bar' } }).run());
  logger.info('testTbl.get("lime")("value")("type"): ', await testTbl.get('lime')('value')('type').run());
  logger.info('testTbl.filter(doc => doc("key").len().ge(4)): ', await testTbl.filter(doc => doc('key').len().ge(4)).run());
})().then(() => {
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
