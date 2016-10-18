var elasticsearchUrl = 'http://127.0.0.1:9200';
var elasticsearchIndex = 'librarything';
var client = new elasticsearch.Client({
    host: elasticsearchUrl
  });

var model = initModel();
initView(model);

function initModel(){
  var year = 2006;
  var to = (new Date()).getFullYear()
  var years = [];
  while (year < to){
    years.push(year);
    year += 1;
  }
  
  return {
    input: {
      years: years
    }
  };
}

function initView(model){
  //years input
  var yearsInput = document.querySelector('#years');
  while (yearsInput.firstChild) {
    yearsInput.removeChild(yearsInput.firstChild);
  }
  var elem;
  for (var i=0, len = model.input.years.length; i < len ; i++){
    elem = document.createElement("option"); 
    elem.text = model.input.years[i]
    yearsInput.appendChild(elem)
  }

  yearsInput.addEventListener("change", function(){
      generateYearStats(this.value);
    }, false);
}


function generateYearStats(year){
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
        columns: [ buyed, started, ended],
        type: 'bar'
      }

      var chart = c3.generate({
          axis: {
            x: {
              type: 'category',
              categories: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec']
            }
          },
          data: data,
          bar: { width: { }, }
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

}
