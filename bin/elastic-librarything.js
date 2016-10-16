const request = require('request');
const _ = require('lodash');
const meow = require("meow")
const elasticsearch = require('elasticsearch');
const ProxAPI = require("proxapi");

const librarythingMapping = {
  type: 'book',
  body: {
    book: {
      properties: {
        id: {type: "string"},
        title: {type: "string"},
        author: {type: "string"},
        author_code: {type: "string"},
        ISBN: {type: "string"},
        rating: {type: "float"},
        language_main: {type: "string"},
        hasreview: {type: "boolean"},
        cover: {type: "string"},
        entry_date: {type: "date"},
        buy_date: {type: "date"},
        start_date: {type: "date"},
        end_date: {type: "date"}
      }
    }
  }
}

const cli = meow(`
  Usage
  $ elastic-librarything <librarythingUserId>

  Options
  --reset Rebuild database
  --url=<elasticsearch url>  (default 'librarything')
  --index=<elasticsearch index> (default 'http://localhost:9200')
  `)

let elasticsearchIndex = cli.flags.hasOwnProperty("index") ? cli.flags['index'] : 'librarything'
let elasticsearchUrl = cli.flags.hasOwnProperty("url") ? cli.flags['url'] : 'http://localhost:9200'
let needReset = cli.flags.hasOwnProperty("reset")
let librarythingUserId = cli.input.length == 0  ? null : cli.input[0]

if (librarythingUserId === null){
  throw("missing parameter : Librarything username ")
}

const client = new elasticsearch.Client({
    host: elasticsearchUrl,
    // requestTimeout: 3000,
  // log: 'trace'
});

//Main
if (needReset){
  initializeElastic().then(() => {
      update(librarythingUserId);
    }, (err) => {console.error(err)} 
  )
} else {
  update(librarythingUserId);
}
  

function initializeElastic(){
  return new Promise((resolve, reject) => {
      client.indices.exists({ index: elasticsearchIndex }).then((exists) => {
          if (exists) {
            console.log("deleting");
            client.indices.delete({ index: elasticsearchIndex }).then(() => {
                createIndex(resolve, reject)
              }, reject)
          } else {
            createIndex(resolve, reject)
          }
        }, reject)
    })
}

function createIndex(resolve, reject){
  console.log('creating index')
  client.indices.create({ index: elasticsearchIndex }).then(() => {
      client.indices.getMapping({ index: elasticsearchIndex }).then((res) => {
          console.log('creating mapping')
          client.indices.putMapping(librarythingMapping).then(resolve, reject)
        }, reject)
    }, reject)
}

function update(librarythingUserId){
  console.log('updating...')
  url = 'http://www.librarything.com/api_getdata.php?showDates=1&userid='+librarythingUserId+'&booksort=entry_REV&responseType=json&max=100000';

  request(url, function (err, res, json) {
      console.log('fetching...')
      if (err || !res || res.statusCode >= 400) {
        err = new Error('Could not fetch url ' + url + ', with status ' + (res && res.statusCode) + '. Got error: ' + (err && err.message) + '.');
      } else {
        console.log('librarything data fetched');
        var books = JSON.parse(json).books;
        // console.log(_(books).map(cleanData));
        console.log('adding...')
        // var addBooksPromises = _(books).map(cleanData).map(addBook)
        var addBooksPromises = _(books).map(cleanData).map(addBook)
        Promise.all(addBooksPromises).then((res) => {
            console.log(res.length, "books imported")
          }, (err) => {
            console.error("Error while adding books : ",err)
          })
      }
    });
}


function cleanData(book_data){
  startDate = undefined;
  endDate = undefined;
  if (book_data.startfinishdates){
    startDate = book_data.startfinishdates[0].started_stamp;
    endDate = book_data.startfinishdates[0].finished_stamp;
  }

  var book = {}; 
  addBookField('id', book_data.book_id);
  addBookField('title', book_data.title);
  addBookField('author', book_data.author_lf);
  addBookField('author_code', book_data.author_code);
  addBookField('ISBN', book_data.ISBN);
  addBookField('publicationdate', book_data.publicationdate);
  addBookField('rating', book_data.rating);
  addBookField('language_main', book_data.language_main);
  addBookField('language_secondary', book_data.language_secondary);
  addBookField('language_original', book_data.language_original);
  addBookField('hasreview', book_data.hasreview);
  addBookField('cover', book_data.cover);
  addBookField('entry_date', book_data.entry_stamp, formatDate);
  addBookField('buy_date', book_data.dateacquired_stamp, formatDate);
  addBookField('start_date', startDate, formatDate);
  addBookField('end_date', endDate, formatDate);

  function addBookField(field, value, transform){
    transform = transform || _.identity
    if (value != undefined) {
      book[field] = transform(value);
    }
  }

  return book;
};

function formatDate(timestamp){
  return (new Date(timestamp * 1000)).toJSON();
}

var elastic_proxy = new ProxAPI({
  retryDelay: 3, //On tente la requête toutes les 3s
  translate: function(params, proxy_callback){ 
    client.index( params ).then((response) => {
        console.log("inserted: " + response._id)
        proxy_callback(null, response, { quota: false });
      }, (error) => {
        var err = error
        if (error.displayName == 'RequestTimeout'){
          status = { quota: true}
          err = null
        } 
        proxy_callback(err, {}, status);
      })
  }
});

function addBook(book) {
  var params = {
      index: elasticsearchIndex,
      type: 'book',
      id: book.id,
      body: book
    };

  return new Promise((resolve, reject) => {
      elastic_proxy.call(params, {strategy: 'retry'}, function(err, results){
          if (err) {
            resolve(err)
          } else {
            resolve(results)
          }
        })
    })
}

