
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

### The rest (unsupported)

- Dates and times (*make them a number*)
- Control structures
- Geospatial commands
- Administration
