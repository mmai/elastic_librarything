var elasticsearchUrl = 'http://127.0.0.1:9200';
var elasticsearchIndex = 'librarything';
var client = new elasticsearch.Client({
    host: elasticsearchUrl
  });


var year = 2013;
var pBuy = getBooksByMonth(year, 'buy');
var pStart = getBooksByMonth(year, 'start');
var pEnd = getBooksByMonth(year, 'end');

Promise.all([pBuy, pStart, pEnd]).then(function(res){
    var buyed = getBookData(res[0]);
    buyed.unshift('buyed');
    var started = getBookData(res[1]);
    started.unshift('started');
    var ended = getBookData(res[2]);
    ended.unshift('ended');

    var data = {
      columns: [buyed, started, ended],
      type: 'bar'
    }

    var chart = c3.generate({
        data: data,
        axis: { x: { type: 'categorized' } },
        bar: { width: { ratio: 0.3, }, }
      });
});

function getBooksByMonth(year, type){
  var request = {
      index: elasticsearchIndex,
      size: 5,
      body: {
        query: {
          range: {
          }
        },
        aggs: {
          books_by_month: {
            date_histogram: {
              field: type + "_date",
              interval: "month"
            },
            aggs: {
              rating: {
                avg: {
                  field:"rating"
                }
              }
            }
          } 
        } 
      } 
    };
    request.body.query.range[type + "_date"] = { from: year + "-01-01", to: year + "-12-31" }
    return client.search(request); 
}

function getBookData(elasticRes){
  var res = elasticRes.aggregations.books_by_month.buckets;
  var data = res.map(function(m){
      return m.doc_count
    });
  return data;
}

