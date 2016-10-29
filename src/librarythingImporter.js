const _ = require('lodash');
const request = require('request');

const PromiseThrottle = require('promise-throttle');
const ProxAPI = require("proxapi");

const elasticsearch = require('elasticsearch');
const isbnResolver = require('./node-isbn');

module.exports = librarythingImporter

let elasticId = ''
let client = null
let isbn = null

function librarythingImporter({ elasticsearchIndex, elasticsearchUrl, librarythingUserId, googleApiKey }){
  client = new elasticsearch.Client({ host: elasticsearchUrl })
  elasticId = elasticsearchIndex
  isbn = isbnResolver({googleApiKey})

  return {

    initializeElastic: function initializeElastic(){
      return new Promise((resolve, reject) => {
          client.indices.exists({ index: elasticId }).then((exists) => {
              if (exists) {
                console.log("deleting");
                client.indices.delete({ index: elasticId }).then(() => {
                    console.log("going to create ", elasticId);
                    createIndex(resolve, reject)
                  }, reject)
              } else {
                    console.log("going to create ", elasticId);
                createIndex(resolve, reject)
              }
            }, reject)
        })
    },

    update: function update(librarythingUserId, limit = 50){
      console.log('updating...')
      url = `http://www.librarything.com/api_getdata.php?showDates=1&showReviews=1&reviewmax=10000&showTags=1&userid=${librarythingUserId}&booksort=entry_REV&responseType=json&max=${limit}`

      request(url, function (err, res, json) {
          console.log('fetching...')
          if (err || !res || res.statusCode >= 400) {
            err = new Error('Could not fetch url ' + url + ', with status ' + (res && res.statusCode) + '. Got error: ' + (err && err.message) + '.');
          } else {
            console.log('librarything data fetched');
            var books = JSON.parse(json).books;
            console.log('adding...')
            // var addBooksPromises = _(books).map(cleanData).map(addBook)
            // var dataBooksPromises = _(books).map(cleanData).map(addIsbnInfo)
            var addBooksPromises = _(books).map(cleanData).map(addIsbnInfo).map(addBook)
            Promise.all(addBooksPromises).then((res) => {
                console.log(res.length, "books imported")
              }, (err) => {
                console.error("Error while adding books : ",err)
              })
          }
        })
    }

  }

}

const librarythingMapping = {
  type: 'book',
  body: {
    book: {
      properties: {
        id: {type: "string", index: "not_analyzed"},
        title: {type: "string"},
        author: {type: "string"},
        author_code: {type: "string", index: "not_analyzed"},
        ISBN: {type: "string", index: "not_analyzed"},
        rating: {type: "float"},
        language_main: {type: "string", index: "not_analyzed"},
        hasreview: {type: "boolean", index: "not_analyzed"},
        review: {type: "string"},
        tags: {type: "string", index: "not_analyzed"},
        cover: {type: "string"},
        entry_date: {type: "date"},
        buy_date: {type: "date"},
        start_date: {type: "date"},
        end_date: {type: "date"},

        pageCount: {type: "integer"},
        description: {type: "string"}
      }
    }
  }
}


function createIndex(resolve, reject){
  console.log('creating index', elasticId)
  client.indices.create({ index: elasticId }).then(() => {
      client.indices.getMapping({ index: elasticId }).then((res) => {
          client.indices.putMapping(librarythingMapping).then(resolve, reject)
        }, reject)
    }, reject)
}


const promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 2,
    promiseImplementation: Promise
})

function addIsbnInfo(book_data){
  return promiseThrottle.add(addIsbnInfoP.bind(this, book_data))
}

function addIsbnInfoP(book_data){
  return new Promise((resolve, reject) => {
      isbn.resolve(book_data.ISBN, function (err, book) {
          if (err) {
            console.log('ISBN not found : ', book_data.ISBN, book_data.id)
          } else {
            // console.log(book)
            book_data['pageCount'] = book.pageCount
            book_data['description'] = book.description
            resolve(book_data);
          }
        })
    })
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
  addBookField('review', book_data.bookreview); 
  addBookField('cover', book_data.cover);
  addBookField('tags', book_data.tags);
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

function addBook(bookPromise) {
  return new Promise((resolve, reject) => {
      bookPromise.then((book) => {
        var params = {
            index: elasticId,
            type: 'book',
            id: book.id,
            body: book
          };

          elastic_proxy.call(params, {strategy: 'retry'}, function(err, results){
              if (err) {
                resolve(err)
              } else {
                resolve(results)
              }
            })
        })
    })
}

