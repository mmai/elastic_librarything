
const query = require('./booksQueries').initClient({
    elasticsearchUrl: 'http://127.0.0.1:9200',
    elasticsearchIndex: 'librarything'
}) 

initModel().then(
  initView,
  (err) => {console.log(err)}
)

function initModel(){
  return new Promise((resolve, reject) => {
      query.getYears().then(
        (res) => {
          resolve ({
              input: {
                years: res.years
              }
            })
        }, reject)
    })
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
  Promise.all([
      query.getBoughtBooksByMonth(year),
      query.getStartedBooksByMonth(year),
      query.getFinishedBooksByMonth(year),
    ]).then((res) => {
      var buyed = res[0].bought_books_by_month;
      var total_acquired = buyed.reduce(function(acc, cur){ return acc + cur; });
      buyed.unshift('acquired');

      var started = res[1].started_books_by_month;
      var total_started = started.reduce(function(acc, cur){ return acc + cur; });
      started.unshift('started');

      var finished = res[2].finished_books_by_month;
      var total_finished = finished.reduce(function(acc, cur){ return acc + cur; });
      finished.unshift('finished');

      const avg_ratings = res[2].avg_ratings_by_month;
      let avg_rating = avg_ratings.reduce((acc, r) => acc + r) / avg_ratings.length;

      avg_rating = Math.round(100 * avg_rating) / 100;

      const ratings = res[2].ratings_by_month
      const ratings_ids = Object.keys(ratings).sort((a,b) => (a > b))
      let ratings_count = ratings_ids.map((k) => ratings[k])
      ratings_count.unshift('ratings')


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
          data: { columns: [ buyed, started, finished], type: 'bar' },
          bar: { width: { }, }
        })

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
          bar: { width: { }, }
        })



    }, function(err){
      console.log('error...');
      console.error(err);
    });
}

