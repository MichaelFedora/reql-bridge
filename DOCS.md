
# Docs

### Initializing Databases

Databases can be initialized by importing their factory function from the package.

#### SQLite3

```typescript
import { createPostgreDatabase } from 'reql-bridge';

const db = await createPostgreDatabase({
  filename: ':memory:',
  logger: 'app.sqlite3'
});

await db.createTable('my-table').run();
```

The config can contain a `logger` entry for whatever log4js category you want it to use,
and an optional `filename` entry to pass a filename to create/use as the database
(`:memory:` by default).

#### PostgreSQL

```typescript
import { createPostgreDatabase } from 'reql-bridge';

const db = await createPostgreDatabase({
  username: 'my-username',
  password: 'keyboardcat'
});

await db.createTable('my-table').run();
```

The config can contain a `logger` entry for whatever log4js category you want it to use,
a `client` entry if you want to manually pass a `node-postgres` client to it, or any of
the options for creating a Pool with `node-postgres`.

### Manipulating Databases

- close
  - database.close() -> void

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
  - array.filter(predicate | object) -> array

### Joins

- none supported

### Transformations

- map (**limited - don't use in filter/query functions**)
  - table.map(predicate) -> stream
  - selection.map(predicate) -> stream
  - stream.map(predicate) -> stream
  - array.map(predicate) -> array
- limit
  - table.limit(n) -> stream
  - selection.limit(n) -> stream
  - stream.limit(n) -> stream
  - array.limit(n) -> array
  
### Aggregation

- count
  - table.count() -> number
  - selection.count() -> number
  - stream.count() -> number
  - array.count() -> number
- distinct
  - table.distinct() -> stream
  - selection.distinct() -> stream
  - stream.distinct() -> stream
- contains
  - table.contains(item) -> boolean
  - selection.contains(item) -> boolean
  - stream.contains(item) -> boolean
  - array.contains(item) -> boolean

### Document Manipulation

- pluck
  - table.pluck(...fields) -> stream
  - selection.pluck(...fields) -> stream
  - stream.pluck(...fields) -> stream
  - array.pluck(...fields) -> array
- difference
  - array.difference(array) -> array
- () (bracket)
  - table(attribute) -> selection
  - selection(attribute) -> selection
  - stream(attribute) -> stream
  - singleSelection(attribute) -> value
  - datum(attribute) -> value

### String manipulation

***Non-standard!***

- startsWith
  - string.startsWith(string) -> boolean
- endsWith
  - string.endsWith(string) -> boolean
- substr (previously, `includes`)
  - string.substr(string) -> boolean
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

### Dates and times

Not supported - make them a number!

### Control structures

- expr(value) -> value

### The rest (unsupported)

- Geospatial commands
- Administration
