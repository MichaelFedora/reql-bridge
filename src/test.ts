import { getLogger, configure } from 'log4js';
import { create as createReQLSqlite3DB } from './reql-sqlite3';

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

  const test = await createReQLSqlite3DB();

  const res = await test.tableCreate('test-table', [
    { name: 'key', type: 'string' },
    { name: 'value', type: 'object' },
    { name: 'count', type: 'number' },
    { name: 'sale', type: 'bool' }
  ])('tables_created').gt(0).run();
  logger.info('res: ', res);
  logger.info('table list: ', await test.tableList().run());
  logger.debug('types db: ', await test.table<{ types: string }>('__reql_typemap__').pluck('types').run().then(a => {
    return a.map(b => JSON.parse(b.types));
  }));
  const table = test.table<TableType>('test-table');
  logger.info('table insert: ', await table.insert({ key: 'foo', value: { type: 'bar' }, count: 3, sale: false }).run());
  logger.info('table insert: ', await table.insert({ key: 'lime', value: { type: 'juice' }, count: 0, sale: true }).run());
  logger.info('table insert: ', await table.insert({ key: 'orange', value: { type: 'syrup' }, count: 1, sale: false }).run());
  logger.info('table: ', await table.run());
  logger.info('table.get("blah"): ', await table.get('foo').run());
  logger.info('table.getAll({ type: "bar" }, { index: "value" }): ', await table.getAll({ type: 'bar' }, { index: 'value' }).run());
  logger.info('table.insert(update): ', await table.insert({ key: 'lime', value: { type: 'bar' } } as any, { conflict: 'update' }).run());
  logger.info('table: ', await table.run());
  logger.info('table.limit(2): ', await table.limit(2).run());
  logger.info('table.pluck("key", "count").filter({ value: { type: bar } }): ',
    await table.pluck('key', 'count').filter({ value: { type: 'bar' } }).run());
  logger.info('table.get("lime")("value")("type"): ', await table.get('lime')('value')('type').run());
  logger.info('table.filter(doc => doc("key").len().ge(4)): ', await table.filter(doc => doc('key').len().ge(4)).run());
})().then(() => {
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
