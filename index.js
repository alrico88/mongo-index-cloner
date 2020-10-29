#!/usr/bin/env node

/* eslint-disable no-unused-vars */
const {MongoClient, Db} = require('mongodb');
const intersection = require('lodash/intersection');
const ora = require('ora');
const chalk = require('chalk');
const {program} = require('commander');
const packageJSON = require('./package.json');
const Table = require('cli-table3');

// Program args definition and parsing

program.version(packageJSON.version);
program.description('CLI program to help clone MongoDB indexes from a database to another (in the same server or not)');

program
  .requiredOption(
    '-f, --from <uri>',
    'Mongo URI to copy indexes from (ex. mongodb://localhost:27017/my_database)',
  )
  .requiredOption(
    '-t, --to <uri>',
    'Mongo URI to copy indexes to (ex. mongodb://localhost:27017/my_other_database)',
  )
  .option('-b. --background', 'Create index in background', true);

program.parse(process.argv);

// Code

/**
 * Creates a MongoClient db object
 *
 * @param {string} connection
 * @returns {Promise<Db>}
 */
async function createClient(connection) {
  const client = new MongoClient(connection, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  return client.db();
}

/**
 * Gets all collection names in db
 *
 * @param {string} connection
 * @returns {Promise<string[]>}
 */
async function getCollections(connection) {
  const db = await createClient(connection);
  const collections = await (await db.listCollections().toArray()).map((d) => d.name);
  return collections;
}

/**
 * Gets index for collection
 *
 * @param {string} connection
 * @param {string} collection
 * @returns {Promise<{key: object, name: string}[]>}
 */
async function getIndexes(connection, collection) {
  const db = await createClient(connection);
  const indexes = await db
    .collection(collection)
    .listIndexes()
    .toArray();
  return indexes;
}

/**
 * Creates index for collection
 *
 * @param {string} connection
 * @param {string} collection
 * @param {object} indexContent
 * @param {string} indexName
 * @returns {Promise<*>}
 */
async function createIndex(connection, collection, indexContent, indexName) {
  const db = await createClient(connection);
  const result = await db.collection(collection).createIndex(indexContent, {
    background: program.background,
    name: indexName,
  });
  return result;
}

async function init() {
  const {from, to} = program;
  const loadCollectionsSpinner = ora(`Getting collections from ${from} and ${to}`).start();
  const [fromCollections, toCollections] = await Promise.all([
    getCollections(from),
    getCollections(to),
  ]);

  const collectionsToDo = intersection(fromCollections, toCollections).sort();
  loadCollectionsSpinner.succeed(`Got ${collectionsToDo.length} collection(s) matching in both databases`);

  const summary = [];

  for (const collection of collectionsToDo) {
    const existingIndexes = await getIndexes(from, collection);

    const collectionSummary = {
      collection,
      indexes: [],
    };

    for (const index of existingIndexes) {
      const {name, key} = index;
      collectionSummary.indexes.push(name);

      if (name !== '_id_') {
        const spinner = ora(`Creating index ${chalk.blue(name)} in collection ${chalk.yellow(collection)}`).start();
        await createIndex(to, collection, key, name);
        spinner.succeed();
      }
    }

    summary.push(collectionSummary);
  }

  ora(`Created all ${collectionsToDo.length} collections' indexes successfully`).succeed();

  const summaryTable = new Table({
    head: ['Collection', 'No. of indexes', 'Indexes'].map((d) =>
      chalk.yellow(d)),
  });

  summary.forEach(({collection, indexes}) => {
    summaryTable.push([collection, indexes.length, indexes.join('\n')]);
  });

  // eslint-disable-next-line no-console
  console.log(summaryTable.toString());

  process.exit(0);
}

init();
