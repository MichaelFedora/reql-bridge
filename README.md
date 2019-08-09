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

For those who don't now, ReQL is the official query language of [RethinkDB](https://rethinkdb.com/api/javascript/).
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

### Manipulating Tables

- tableCreate
  - database.tableCreate(tableName, schema) -> changes
- tableDrop
  - database.tableDrop(tableName) -> void
- tableList
  - database.tableList() -> string[]

### Writing Data

- insert
  - table.insert(object[, { conflict: 'error' | 'replace' | 'update' }]) -> changes
- update
  - table.update(object) -> changes
- replace
  - table.replace(object) -> changes
- delete
  - table.delete() -> changes
  - selection.delete() -> changes
  - singleSelection.delete() -> changes

### Selecting Data

- table
  - database.table(tableName) -> Table
- get
  - table.get(key) -> singleSelection
- getAll
  - table.getAll(key[, key2...][, { index: string }]) -> selection
- filter
  - table.filter(predicate | object) -> selection
  - selection.filter(predicate | object) -> selection
  - stream.filter(predicate | object) -> stream

### Joins

- none supported

### Transformations

- map (**limited - don't use in filter/query functions**)
  - table.map(predicate) -> stream
  - selection.map(predicate) -> stream
  - stream.map(predicate) -> stream
- limit
  - table.limit(n) -> stream
  - selection.limit(n) -> stream
  - stream.limit(n) -> stream
  
### Aggregation

- count
  - table.count() -> number
  - selection.count() -> number
  - stream.count() -> number
- distinct
  - table.distinct() -> stream
  - selection.distinct() -> stream
  - stream.distinct() -> stream

### Document Manipulation

- table.pluck(...fields) -> stream
  - selection.pluck(...fields) -> stream
  - stream.pluck(...fields) -> stream
- () (bracket)
  - singleSelection(attribute) -> value
  - datum(attribute) -> value
  - *use `pluck` + `map` with tables/selections/streams*

### String manipulation

***Non-standard!***

- startsWith
  - string.startsWith(string) -> boolean
- endsWith
  - string.endsWith(string) -> boolean
- includes
  - string.includes(string) -> boolean
- len
  - string.len(string) -> number

### Math and logic

- add
  - number.add(...values) -> number
- sub
  - number.sub(...values) -> number
- mul
  - number.mul(...values) -> number
- div
  - number.div(...values) -> number
- mod
  - number.mod(...values) -> number
- and
  - bool.and(...bool) -> bool
- or
  - bool.or(...bool) -> bool
- eq
  - value.eq(...value) -> bool
- ne
  - value.ne(...value) -> bool
- gt
  - number.gt(...number) -> bool
- ge
  - number.ge(...number) -> bool
- lt
  - number.lt(...number) -> bool
- le
  - number.le(...number) -> bool
- not
  - bool.not() -> bool

### The rest (unsupported)

- Dates and times (*make them a number*)
- Control structures
- Geospatial commands
- Administration


## Building & Testing

`npm test` to build & test.
`npm run build` to just build.

## License

Code is under MPL-2.0. Feel free to adapt this for other databases (looking at you, PostgreSQL).

Feel free to let me know if you use this somewhere!
