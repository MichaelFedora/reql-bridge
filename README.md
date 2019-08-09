# ReQL-SQLite3

*ReQL(-like) interpreter for SQLite3*

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/michaelfedora)

```typescript
import { create as createReQLSQLite3DB } from 'reql-sqlite3';

const db = await create({ filename: ':memory:' });
await db.tableCreate('my-table', [
  { name: 'key', type: 'string' },
  { name: 'value', type: 'any' }
]).run();
const table = db.table<{ key: string, value: string }>('my-table');
await table.insert({ key: 'fooo', value: 'apple' }).run();
await table.insert({ key: 'bar', value: 'pear' }).run();

console.log(await table.get('bar')('value').run()); // pear
console.log(await table.filter(doc => doc('key').len().ge(4)).run()); // { key: 'fooo', value: 'apple' }
console.log(await table.pluck('key').limit(1).map(doc => doc('key')).run()); // random, but usually ['bar']
console.log(await table.getAll('yeet', 'bar').map(doc => doc('value')).run()); // [ 2, { super: false } ]
```

While most things in ReQL *aren't* supported, I've been able to get most of the core features done. Do note while
I do as much as I can *within* SQLite, some things (like map) can only be done *outside*, and thus a "StaticDatum"
is created which will do what you ask but in memory instead of in the database. Also, because some things aren't
supported within the database, they will throw errors when you try to use them in the `filter` statement; i.e.
if you try to `map` a document within a filter, it will throw an error at you.

Typescript is supported, so that should allow you to use it without too much fear you're using an unsupported
call, otherwise the types are in [`types.ts`](src/types.ts).

Unlike RethinkDB, SQLite3 runs off of a Schema, so you'll have to define it when you make your database. See the
sample above for an example. Available types are `'string' | 'number' | 'bool' | 'object' | 'any'`, with `'any'`
acting like `'object'` but returning the raw-straight-from-sqlite3 value if it fails to parse JSON.

It also supports Log4JS if you have that configured -- you can pass `{ logger: string }` to the `create` function
to determine what it category it should use.

## Building & Testing

`npm test` to build & test.
`npm run build` to just build.

## License

Code is under MPL-2.0. Feel free to adapt this for other databases (looking at you, PostgreSQL).

Feel free to let me know if you use this somewhere!
