# mongo-index-cloner

### Description

A CLI program to clone indexes from a MongoDB database to another. Databases can be in the same server or in a different one.

This utility clones all indexes _en masse_ of the collections found both in the origin database and the destination database. Collections must already exist, and have the same names.

More options will be added over time.

### Usage

Usage: `mongo-index-cloner [options]`

```
Options:
  -V, --version     output the version number
  -f, --from <uri>  Mongo URI to copy indexes from (ex. mongodb://localhost:27017/my_database)
  -t, --to <uri>    Mongo URI to copy indexes to (ex. mongodb://localhost:27017/my_other_database)
  -b. --background  Create index in background (default: true)
  -h, --help        display help for command
```

### Example

```bash
mongo-index-cloner -f mongodb://localhost:27017/origin_database -t mongodb://remote_host:27017/destination_database
```
