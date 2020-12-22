# ReQL-Bridge

*ReQL(-like) interpreter for a multitude of databases*

```typescript
import { createSQLite3Database } from 'reql-bridge';

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

[![patreon](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://patreon.com/michaelfedora)
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/michaelfedora)

For those who don't know, ReQL is the official query language of [RethinkDB](https://rethinkdb.com/api/javascript/).
I wanted to use it with other databases, and so I made this so I could use SQLite without wanting to die inside;
but also because I wanted to pass objects to plugins in a way that was more flexible then a simple key-value
store.

While most things in ReQL *aren't* supported, I've been able to get most of the core features done. Do note while
I do as much as I can *within* SQLite, some things (like map) can only be done *outside*, and thus a "StaticDatum"
is created which will do what you ask but in memory instead of in the database. Also, because some things aren't
supported within the database, they will throw errors when you try to use them in the `filter` statement; i.e.
if you try to `map` a document within a filter, it will throw an error at you.

Changefeeds don't work correctly either; if an object is replaced or updated in an insert conflict, it will still
say `inserted: 1` in the return. In addition, if multiple things are inserted or updated, it will still only
count 1. That's because SQLite is kinda sparse on feedback, and I don't want to make an excess amount of calls (
maybe one day I'll just not return them at all instead?)

Typescript is supported, so that should allow you to use it without too much fear you're using an unsupported
call, otherwise the types are in [`types.ts`](src/types.ts) and the list of supported items is below -- match
them up with the [ReQL](https://rethinkdb.com/api/javascript/) docs for more information.

Unlike RethinkDB, SQLite3 runs off of a Schema, so you'll have to define it when you make your database. See the
sample above for an example. Available types are `'string' | 'number' | 'bool' | 'object' | 'any'`, with `'any'`
acting like `'object'` but returning the raw-straight-from-sqlite3 value if it fails to parse JSON. The first item
in the schema list is the primary key, and secondary keys can be made via `{ ... index: true }` in the schema entry.

It also supports Log4JS if you have that configured -- you can pass `{ logger: string }` to the `create` function
to determine what it category it should use.

## Features

See [DOCS.md](./DOCS.md) for types/function information.

- `npm i reql-bridge --no-optional` (* not on NPM yet)
- `npm i https://github.com/MichaelFedora/reql-bridge.git --no-optional`

**To use with SQLite3:**
  - install the `sqlite3` optional dependency: `npm i sqlite3`
  - `import { createSQLite3Database } from 'reql-bridge';`
  - `const db = createSQLite3Database({ filename: ':memory:' , logger: 'my-category.sqlite3' });`

**To use with PostgreSQL:**
  - install the `pg` optional dependency: `npm i pg`
  - `import { createPostgreDatabase } from 'reql-bridge';`
  - `const db = createPostgreDatabase({ logger: 'my-category.pg' });`

**To use with RethinkDB:**
  - install the `rethinkdb-ts` optional dependency: `npm i rethinkdb-ts`
  - `import { createRethinkDatabase } from 'reql-bridge';`
  - `const db = createRethinkDatabase({ logger: 'my-category.rethink', db: 'my-database' });`

## Building & Testing

`npm test` to build & test.
`npm run build` to just build.

## License

Code is under MPL-2.0. Feel free to adapt this for other databases (looking at you, PostgreSQL).

Feel free to let me know if you use this somewhere!
