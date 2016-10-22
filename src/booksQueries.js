const elasticsearchUrl = 'http://127.0.0.1:9200';
const elasticsearchIndex = 'librarything';
const client = new elasticsearch.Client({
    host: elasticsearchUrl
  });

function getBoughtBooksByMonth(year){
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
        },
      } 
    } 
  };

  return new Promise(function(resolve, reject){
      client.search(request).then(
        function(res){
          var bought_books_by_month = res.aggregations.bought_books_by_month.buckets.map(function(m){
              return m.doc_count
            });
          resolve({bought_books_by_month});
        }, reject); 
    })

}

function getStartedBooksByMonth(year){
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
        },
      } 
    } 
  };

  return new Promise(function(resolve, reject){
      client.search(request).then(
        function(res){
          var started_books_by_month = res.aggregations.started_books_by_month.buckets.map(function(m){
              return m.doc_count
            });
          resolve({started_books_by_month});
        }, reject); 
    })

}

function getFinishedBooksByMonth(year){
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
            "rating": { "avg": { "field":"rating" } }
          }
        },
      } 
    } 
  };

  return new Promise(function(resolve, reject){
      client.search(request).then(
        function(res){
          let finished_books_by_month = res.aggregations.finished_books_by_month.buckets.map(function(m){
              return m.doc_count
            });
          let avg_ratings_by_month = res.aggregations.finished_books_by_month.buckets.map((m) =>  m.rating.value);
          resolve({
              finished_books_by_month,
              avg_ratings_by_month
            });
        }, reject); 
    })

}


module.exports = {
  getBoughtBooksByMonth,
  getStartedBooksByMonth,
  getFinishedBooksByMonth,
}
