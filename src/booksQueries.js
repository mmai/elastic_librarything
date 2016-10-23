var client
var elasticsearchIndex

function initClient(options) {
  client = new elasticsearch.Client({
      host: options.elasticsearchUrl
  })
  elasticsearchIndex = options.elasticsearchIndex

  return {
    getYears,
    getBoughtBooksByMonth,
    getStartedBooksByMonth,
    getFinishedBooksByMonth,
  }

}


function queryAndTransform(query, transformFunc){
  return new Promise((resolve, reject) => {
      client.search(query).then(
        (res) => {
          resolve(transformFunc(res))
        } , reject
      ) 
    })
}


function getYears(){
  const query = {
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
  }

  const transformFunc =( (res) => ({
          years: res.aggregations.years.buckets.map( 
            (y) => y.key_as_string.substring(0, 4)
          )
        }))

  return queryAndTransform( query, transformFunc) 
}

function getBoughtBooksByMonth(year){
  const query = {
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
  }

  const transformFunc = ( (res) => (
      {
        bought_books_by_month: res.aggregations.bought_books_by_month.buckets.map( (m) => m.doc_count )
      }
    ))

  return queryAndTransform( query, transformFunc) 

}

function getStartedBooksByMonth(year){
  const query = {
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

  const transformFunc = ( (res) => (
      {
        started_books_by_month: res.aggregations.started_books_by_month.buckets.map( (m) => m.doc_count )
      }
    ))

  return queryAndTransform( query, transformFunc) 
}

function getFinishedBooksByMonth(year){
  const query = {
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
        "ratings_by_month": {
          "terms": { "field": "rating" }
        }
      } 
    } 
  }

  const transformFunc = ( (res) => {
      let ratings = {
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
      }

      for (let bucket of res.aggregations.ratings_by_month.buckets){
        ratings[bucket.key] = bucket.doc_count
      } 

      return {
        finished_books_by_month: res.aggregations.finished_books_by_month.buckets.map( (m) => m.doc_count ),
        avg_ratings_by_month: res.aggregations.finished_books_by_month.buckets.map( (m) => m.rating.value ),
        ratings_by_month: ratings
      }
    })

  return queryAndTransform( query, transformFunc) 
}

module.exports = {
  initClient
} 
