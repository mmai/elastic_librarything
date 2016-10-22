// require("babel-polyfill");

const query = require('./booksQueries') 

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

      const ratings = res[2].avg_ratings_by_month;
      let avg_rating = ratings.reduce((acc, r) => acc + r) / ratings.length;

      avg_rating = Math.round(100 * avg_rating) / 100;

      document.getElementById("summary-title").innerHTML = year;
      document.getElementById("summary-aquired").innerHTML = total_acquired;
      document.getElementById("summary-started").innerHTML = total_started;
      document.getElementById("summary-finished").innerHTML = total_finished;
      document.getElementById("summary-rating").innerHTML = avg_rating;

      var data = {
        columns: [ buyed, started, finished],
        type: 'bar'
      }

      var chart = c3.generate({
          bindto: '#chart-asf',
          axis: {
            x: {
              type: 'category',
              categories: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sept', 'oct', 'nov', 'dec']
            }
          },
          data: data,
          bar: { width: { }, }
        });
    }, function(err){
      console.log('error...');
      console.error(err);
    });
}

