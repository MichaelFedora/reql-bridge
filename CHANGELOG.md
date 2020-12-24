# v2.3.0
- Implement LevelDB
- More fixes to static datum
  - use `__proto__` when forking
  - add some checks for null values
- remove a console.log from rethink bridge

# v2.2.1
- Bump package.json version

# v2.2.0

- Fixed 'mod' not working on any query-datum
- Fix queries not forking correctly
- Fix length command mismatch
- Fix a lot of issues with static datum
  - Breaking on `branch` after the first statement
  - Not having string commands (`startsWith`, `endsWith`, etc)
  - Breaking when doing commands without any parameters (like `len`)
- Fixed some typing issues with abstract datum and single-selection#replace
- Add RethinkDB support
- Update dependencies

# v2.1.1

- Fixed `difference` types
- Fixed `update()` not actually working (whoops)
- Fixed, when getting null from the db, returning `{ }` (which isn't null)

# v2.1

- Added `branch` and `do` to Static Datums (`expr`)
- Fixed `add` and `sub` actually being exponential in static datums
- Fix Postgres implementation so it actually works... whoops!
- Added `indexCreate`, `indexList`, and `indexDrop` to the Table object
- Updated deps to latest
- Cleaned up some SQL Queries for Streams
- Cleaned up the Static Datum definition
- Fixed not catching null values when resolving them

# v2.0

Moved from `reql-sqlite3` because we are now supporting multiple databases!

# Breaking

- Changed how Databases are initialized
  - You now import either `createSQLite3Database` or `createPostgreDatabase`
- String Datum `includes` function has been renamed to `substr` to not be confused with Array functions

# Changes

- :tada: Added PostgreSQL support! :tada:
- `expr` can now be imported by anyone to create "static" expressions, for use in filters or otherwise
- Added the ability to fork statements
  - Statements are saved to the initial variable in order to save memory and processing power in creating
  tons of new objects. The query queue will only be emptied on an action (i.e. `run`, `delete`, etc), but if
  you want to keep it then use `fork()` to return a clone and `run()` off of that instead.
- Added Array abilities to Datums (i.e. not just streams now)
  - `count`
  - `limit`
  - `difference`
  - `contains`
  - `filter`
  - `pluck`
  - `map`
- Added the ability to close Database connections (`db.close()`);

# v1.0

Initial Release
