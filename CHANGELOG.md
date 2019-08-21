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
