(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var client;
var elasticsearchIndex;

function initClient(options) {
  client = new elasticsearch.Client({
    host: options.elasticsearchUrl
  });
  elasticsearchIndex = options.elasticsearchIndex;

  return {
    getYears: getYears,
    getBoughtBooksByMonth: getBoughtBooksByMonth,
    getStartedBooksByMonth: getStartedBooksByMonth,
    getFinishedBooksByMonth: getFinishedBooksByMonth
  };
}

function queryAndTransform(query, transformFunc) {
  return new Promise(function (resolve, reject) {
    client.search(query).then(function (res) {
      resolve(transformFunc(res));
    }, reject);
  });
}

function getYears() {
  var query = {
    index: elasticsearchIndex,
    size: 0,
    body: {
      "size": 0,
      "aggs": {
        "years": {
          "date_histogram": {
            "field": "start_date",
            "interval": "year"
          },
          "aggs": {
            "years_bucket_filter": {
              "bucket_selector": {
                "buckets_path": {
                  "booksCount": "_count"
                },
                "script": {
                  "inline": "booksCount > 0",
                  "lang": "expression"
                }
              }
            }
          }
        }
      }
    }
  };

  var transformFunc = function transformFunc(res) {
    return {
      years: res.aggregations.years.buckets.map(function (y) {
        return y.key_as_string.substring(0, 4);
      })
    };
  };

  return queryAndTransform(query, transformFunc);
}

function getBoughtBooksByMonth(year) {
  var query = {
    index: elasticsearchIndex,
    size: 5,
    body: {
      "query": {
        "bool": {
          "filter": {
            "range": { "buy_date": { "from": year + "-01-01", "to": year + "-12-31" } }
          }
        }
      },
      "aggs": {
        "bought_books_by_month": {
          "date_histogram": {
            "field": "buy_date",
            "interval": "month"
          }
        }
      }
    }
  };

  var transformFunc = function transformFunc(res) {
    return {
      bought_books_by_month: res.aggregations.bought_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      })
    };
  };

  return queryAndTransform(query, transformFunc);
}

function getStartedBooksByMonth(year) {
  var query = {
    index: elasticsearchIndex,
    size: 5,
    body: {
      "query": {
        "bool": {
          "filter": {
            "range": { "start_date": { "from": year + "-01-01", "to": year + "-12-31" } }
          }
        }
      },
      "aggs": {
        "started_books_by_month": {
          "date_histogram": {
            "field": "start_date",
            "interval": "month"
          }
        }
      }
    }
  };

  var transformFunc = function transformFunc(res) {
    return {
      started_books_by_month: res.aggregations.started_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      })
    };
  };

  return queryAndTransform(query, transformFunc);
}

function getFinishedBooksByMonth(year) {
  var query = {
    index: elasticsearchIndex,
    size: 5,
    body: {
      "query": {
        "bool": {
          "filter": {
            "range": { "end_date": { "from": year + "-01-01", "to": year + "-12-31" } }
          }
        }
      },
      "aggs": {
        "finished_books_by_month": {
          "date_histogram": {
            "field": "end_date",
            "interval": "month"
          },
          "aggs": {
            "rating": { "avg": { "field": "rating" } }
          }
        },
        "ratings_by_month": {
          "terms": { "field": "rating" }
        }
      }
    }
  };

  var transformFunc = function transformFunc(res) {
    var ratings = {
      "0.5": 0,
      "1": 0,
      "1.5": 0,
      "2": 0,
      "2.5": 0,
      "3": 0,
      "3.5": 0,
      "4": 0,
      "4.5": 0,
      "5": 0
    };

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = res.aggregations.ratings_by_month.buckets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var bucket = _step.value;

        ratings[bucket.key] = bucket.doc_count;
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return {
      finished_books_by_month: res.aggregations.finished_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      }),
      avg_ratings_by_month: res.aggregations.finished_books_by_month.buckets.map(function (m) {
        return m.rating.value;
      }),
      ratings_by_month: ratings
    };
  };

  return queryAndTransform(query, transformFunc);
}

module.exports = {
  initClient: initClient
};

},{}],2:[function(require,module,exports){
'use strict';

var query = require('./booksQueries').initClient({
  elasticsearchUrl: 'http://127.0.0.1:9200',
  elasticsearchIndex: 'librarything'
});

initModel().then(initView, function (err) {
  console.log(err);
});

function initModel() {
  return new Promise(function (resolve, reject) {
    query.getYears().then(function (res) {
      resolve({
        input: {
          years: res.years
        }
      });
    }, reject);
  });
}

function initView(model) {
  //years input
  var yearsInput = document.querySelector('#years');
  while (yearsInput.firstChild) {
    yearsInput.removeChild(yearsInput.firstChild);
  }
  var elem;
  for (var i = 0, len = model.input.years.length; i < len; i++) {
    elem = document.createElement("option");
    elem.text = model.input.years[i];
    yearsInput.appendChild(elem);
  }

  yearsInput.addEventListener("change", function () {
    generateYearStats(this.value);
  }, false);
}

function generateYearStats(year) {
  Promise.all([query.getBoughtBooksByMonth(year), query.getStartedBooksByMonth(year), query.getFinishedBooksByMonth(year)]).then(function (res) {
    var buyed = res[0].bought_books_by_month;
    var total_acquired = buyed.reduce(function (acc, cur) {
      return acc + cur;
    });
    buyed.unshift('acquired');

    var started = res[1].started_books_by_month;
    var total_started = started.reduce(function (acc, cur) {
      return acc + cur;
    });
    started.unshift('started');

    var finished = res[2].finished_books_by_month;
    var total_finished = finished.reduce(function (acc, cur) {
      return acc + cur;
    });
    finished.unshift('finished');

    var avg_ratings = res[2].avg_ratings_by_month;
    var avg_rating = avg_ratings.reduce(function (acc, r) {
      return acc + r;
    }) / avg_ratings.length;

    avg_rating = Math.round(100 * avg_rating) / 100;

    var ratings = res[2].ratings_by_month;
    var ratings_ids = Object.keys(ratings).sort(function (a, b) {
      return a > b;
    });
    var ratings_count = ratings_ids.map(function (k) {
      return ratings[k];
    });
    ratings_count.unshift('ratings');

    document.getElementById("summary-title").innerHTML = year;
    document.getElementById("summary-aquired").innerHTML = total_acquired;
    document.getElementById("summary-started").innerHTML = total_started;
    document.getElementById("summary-finished").innerHTML = total_finished;
    document.getElementById("summary-rating").innerHTML = avg_rating;

    // Acquired, started, finished
    c3.generate({
      bindto: '#chart-asf',
      axis: {
        x: {
          type: 'category',
          categories: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec']
        }
      },
      data: { columns: [buyed, started, finished], type: 'bar' },
      bar: { width: {} }
    });

    // Repartition of ratings
    c3.generate({
      bindto: '#chart-ratings',
      axis: {
        x: {
          type: 'category',
          categories: ratings_ids
        }
      },
      data: { columns: [ratings_count], type: 'bar' },
      bar: { width: {} }
    });
  }, function (err) {
    console.log('error...');
    console.error(err);
  });
}

},{"./booksQueries":1}]},{},[2]);
