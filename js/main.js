(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var elasticsearchUrl = 'http://127.0.0.1:9200';
var elasticsearchIndex = 'librarything';
var client = new elasticsearch.Client({
  host: elasticsearchUrl
});

function getBoughtBooksByMonth(year) {
  var request = {
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

  return new Promise(function (resolve, reject) {
    client.search(request).then(function (res) {
      var bought_books_by_month = res.aggregations.bought_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      });
      resolve({ bought_books_by_month: bought_books_by_month });
    }, reject);
  });
}

function getStartedBooksByMonth(year) {
  var request = {
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

  return new Promise(function (resolve, reject) {
    client.search(request).then(function (res) {
      var started_books_by_month = res.aggregations.started_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      });
      resolve({ started_books_by_month: started_books_by_month });
    }, reject);
  });
}

function getFinishedBooksByMonth(year) {
  var request = {
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
        }
      }
    }
  };

  return new Promise(function (resolve, reject) {
    client.search(request).then(function (res) {
      var finished_books_by_month = res.aggregations.finished_books_by_month.buckets.map(function (m) {
        return m.doc_count;
      });
      var avg_ratings_by_month = res.aggregations.finished_books_by_month.buckets.map(function (m) {
        return m.rating.value;
      });
      resolve({
        finished_books_by_month: finished_books_by_month,
        avg_ratings_by_month: avg_ratings_by_month
      });
    }, reject);
  });
}

module.exports = {
  getBoughtBooksByMonth: getBoughtBooksByMonth,
  getStartedBooksByMonth: getStartedBooksByMonth,
  getFinishedBooksByMonth: getFinishedBooksByMonth
};

},{}],2:[function(require,module,exports){
'use strict';

// require("babel-polyfill");

var query = require('./booksQueries');

var model = initModel();
initView(model);

function initModel() {
  var year = 2006;
  var to = new Date().getFullYear();
  var years = [];
  while (year < to) {
    years.push(year);
    year += 1;
  }

  return {
    input: {
      years: years
    }
  };
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

    var ratings = res[2].avg_ratings_by_month;
    var avg_rating = ratings.reduce(function (acc, r) {
      return acc + r;
    }) / ratings.length;

    avg_rating = Math.round(100 * avg_rating) / 100;

    document.getElementById("summary-title").innerHTML = year;
    document.getElementById("summary-aquired").innerHTML = total_acquired;
    document.getElementById("summary-started").innerHTML = total_started;
    document.getElementById("summary-finished").innerHTML = total_finished;
    document.getElementById("summary-rating").innerHTML = avg_rating;

    var data = {
      columns: [buyed, started, finished],
      type: 'bar'
    };

    var chart = c3.generate({
      bindto: '#chart-asf',
      axis: {
        x: {
          type: 'category',
          categories: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec']
        }
      },
      data: data,
      bar: { width: {} }
    });
  }, function (err) {
    console.log('error...');
    console.error(err);
  });
}

},{"./booksQueries":1}]},{},[2]);
