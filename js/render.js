var user=null;
var pass=null;
var categoryPieChart = null;
var host = "https://budget-bot.tk";

function auth(){
  return "user="+user+"&pass="+pass;
}

function isNum(num){
  return !isNaN(Number(num));
}

var state = {
  "accountselinner": null,
  "expenseinner": null
};

function render_balances() {
  $.getJSON(host+"/get_balances?"+auth(), function(data) {
    var text = '<table class="pure-table">';
    text += '<thead><tr><th>Account</th><th>Balance</th><th></th></tr></thead><tbody>';
    for(var i = 0; i < data.length; i++) {
      text += "<tr><td>"+data[i][0]+"</td><td>"+data[i][1]+"</td><td><button class='pure-button' id='acct_update"+i+"'>Update</button></td></tr>";
    }
    text += "</tbody></table>";
    text += "<p><button class='pure-button' id='acct_add'>Add Account</button></p>";
    document.getElementById("balances").innerHTML = text;
    for(let i = 0; i < data.length; i++) {
      let elem = document.getElementById("acct_update"+i);
      elem.onclick = function() {
        var balance = prompt("Enter new balance");
        if(isNum(balance)) {
          $.getJSON(host+"/set_balance?account="+encodeURIComponent(data[i][0])+"&balance="+Number(balance)+"&"+auth(), function(data) {
            console.log(data);
            if(data) {
              render_balances();
            }
          });
        } else {
          alert("Not a number");
        }
      };
    }
    document.getElementById("acct_add").onclick = function() {
        var name = prompt("Enter account name");
        if(name.length >= 1) {
          $.getJSON(host+"/set_balance?account="+encodeURIComponent(name)+"&balance=0&"+auth(), function(data) {
            console.log(data);
            if(data) {
              render_balances();
            }
          });
        } else {
          alert("Not a valid name");
        }
    };
    var options = "";
    var suggest = "";
    for(var i = 0; i < data.length; i++) {
      options += '<option value="'+data[i][0]+'">'+data[i][0]+"</option>";
      if(data[i][1] < 0) {
        suggest += "Suggestion: Your balance in " + data[i][0] + " is negative, which may lead to high fees and/or interest. Consider paying this debt first before saving money in other accounts.<br>"
      }
    }
    document.getElementById("warning1").innerHTML=suggest;
    var accountsel = document.getElementById("account-sel");
    if(state.accountselinner!==options) {
      accountsel.innerHTML=options;
      state.accountselinner=options;
    }
  });
}

function render_add_expense() {
  var cats = ["Groceries",
              "Eating out",
              "Electronics",
              "Entertainment",
              "Health",
              "Home supplies",
              "Housing",
              "Income",
              "Interest",
              "Laundry",
              "Office supplies",
              "Education",
              "Transportation",
              "Transfer",
              "Miscellaneous"];
  $( "#category" ).autocomplete({
    source: cats
  });
}

function render_expenses() {
  $.getJSON(host+"/view_30days?"+auth(), function(data) {
    var text = '<table class="pure-table">';
    text += '<thead><tr><th>Time</th><th>Expense</th><th>Category</th><th>Account</th><th>Amount</th><th></th></tr></thead><tbody>';
    for(var i = 0; i < data.length; i++) {
      var time = new Date(data[i][1]["timestamp"]*1000);
      var timestr = (time.getMonth()+1)+"/"+time.getDate()+"/"+time.getFullYear() + " " + time.getHours()+":"+time.getMinutes();
      var desc = data[i][1]["description"] || "(missing)";
      var cat = data[i][1]["category"] || "(missing)";
      var acct = data[i][1]["account"] || "(missing)";
      var amt = data[i][1]["amount"] || "(missing)";
      text += "<tr><td>"+timestr+"</td><td>"+desc+"</td><td>"+cat+"</td><td>"+acct+"</td><td>"+amt+"</td><td><button class='pure-button' id='expense_update"+i+"'>Update</button></td></tr>";
    }
    text += "</tbody></table>";
    var update = false;
    if(text !== state.expenseinner) {
      update = true;
      state.expenseinner = text;
      document.getElementById("expenses").innerHTML = text;
    }
    for(let i = 0; i < data.length; i++) {
      let elem = document.getElementById("expense_update"+i);
      elem.onclick = function() {
        var desc = prompt("Enter new description");
        var cat = prompt("Enter new category");
        var acct = prompt("Enter new account");
        var amt = prompt("Enter new amount");
        if(isNum(amt) && desc.length > 0 && cat.length > 0 && acct.length > 0) {
          $.getJSON(host+"/add?key="+data[i][0]+"&description="+encodeURIComponent(desc)+"&category="+encodeURIComponent(cat)+"&account="+encodeURIComponent(acct)+"&amount="+Number(amt)+"&"+auth(), function(data) {
            console.log(data);
            if(data) {
              render();
            }
          });
        } else {
          alert("Not valid");
        }
      }
    }
    if(update) {
      var cat_sums = {};
      var cats = [];
      for(var i = 0; i < data.length; i++) {
        if(isNum(data[i][1]["amount"])) {
          var cat = data[i][1]["category"];
          if(!cat) {
            cat = "Uncategorized";
          }
          var amt = Number(data[i][1]["amount"]);
          if(cat_sums[cat] === null || cat_sums[cat] === undefined) {
            cat_sums[cat]=0.0;
            cats.push(cat);
          }
          cat_sums[cat]+=amt;
        }
      }
      if(get_cat(cat_sums,"Entertainment") > get_cat(cat_sums,"Groceries") + get_cat(cat_sums,"Eating out")) {
        document.getElementById("warnings").innerText = "Suggestion: Your spending on entertainment exceeds your spending on food. To save money, consider reducing entertainment expenses.";
      } else {
        document.getElementById("warnings").innerText = "";
      }
      //categoryPieChart.options.data[0].dataPoints.length = 0;
      categoryPieChart.data.labels.length = 0;
      categoryPieChart.data.datasets[0].data.length = 0;
      for(var i = 0; i < cats.length; i++) {
        //categoryPieChart.options.data[0].dataPoints.push({y: cat_sums[cats[i]], label:cats[i]});
        categoryPieChart.data.labels.push(cats[i]);
        categoryPieChart.data.datasets[0].data.push(cat_sums[cats[i]]);
      }
      categoryPieChart.update();
    }
  });
}
function get_cat(cat_sums, cat){
  return cat_sums[cat] || 0.0;
}

function submit_expense() {
  var desc = document.getElementById("description").value;
  var params = "?description="+ encodeURIComponent(desc);
  var amt = document.getElementById("amount").value;
  if(isNum(amt)) {
    params += "&amount="+Number(amt);
  }
  params += "&category="+encodeURIComponent(document.getElementById("category").value);
  params += "&account="+encodeURIComponent(document.getElementById("account-sel").value);
  if(desc.length > 0 || amt.length > 0) {
    $.getJSON(host+"/add"+params+"&"+auth(), function(data) {
      console.log(data);
      if(data) {
        render_balances();
      }
      document.getElementById("description").value="";
      document.getElementById("amount").value="";
      document.getElementById("category").value="";
    });
  }
}

function render() {
  render_balances();
  render_add_expense();
  render_expenses();
}

function init() {
  user = localStorage.getItem("user");
  pass = localStorage.getItem("pass");
  if(user === null) {
    document.location.href = "login.html";
  } else {
    setup();
    render();
    setInterval(render, 20000);
  }
}

function setup() {
  $.getJSON(host+"/userid?"+auth(), function(data) {
    document.getElementById("security").innerText = data;
  });

  var ctx = document.getElementById("pieChart").getContext('2d');
  categoryPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: [],
        datasets: [{
            label: 'Spending',
            data: [],
            backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)',
                'rgb(153, 102, 255)',
                'rgb(255, 159, 64)',
                'rgb(0,0,255)',
                'rgb(255,0,0)',
                'rgb(0,255,0)',
                'rgb(255,255,0)',
                'rgb(0,255,255)',
                'rgb(255,0,255)'
            ],
            /*borderColor: [
                'rgba(255,99,132,1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1*/
        }]
    },
    options: {
      responsive: false
    }
  });
  categoryPieChart.render();
}

window.onload = init;
