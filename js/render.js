var user=null;
var token=null;
var categoryPieChart = null;
var host = "https://budget-bot.tk";

function auth(){
  return {"token": token};
}

function isNum(num){
  return !isNaN(Number(num));
}

var state = {
  "accountselinner": null,
  "expenseinner": null
};

function update_balance(elem, key) {
  var balance = prompt("Enter new balance");
  if(isNum(balance)) {
    var data = auth();
    data["account"] = key;
    data["balance"]=Number(balance);
    $.ajax({
        type: "POST",
        url: host+"/set_balance",
        data: data,
        dataType: "json",
        success: function(data) {
          console.log(data);
          if(data) {
            render_balances();
          }
        }
    });
  } else {
    alert("Not a number");
  }

}
function add_account(){
  var name = prompt("Enter account name");
  if(name.length >= 1) {
    var data = auth();
    data["account"] = name;
    data["balance"] = 0;
    $.ajax({
        type: "POST",
        url: host+"/set_balance",
        data: data,
        dataType: "json",
        success: function(data) {
          console.log(data);
          if(data) {
            render_balances();
          }
        }
    });
  } else {
    alert("Not a valid name");
  }
}

function render_balances() {
  function render_balance_response(data) {
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
        update_balance(elem, data[i][0]);
      };
    }
    document.getElementById("acct_add").onclick = add_account;
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
  };
  $.ajax({
      type: "POST",
      url: host+"/get_balances",
      data: auth(),
      dataType: "json",
      success: render_balance_response
  });
}

function render_add_expense() {
  var cats = ["Groceries",
              "Dining",
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
function update_expense(elem, key) {
  var desc = prompt("Enter new description");
  var cat = prompt("Enter new category");
  var acct = prompt("Enter new account");
  var amt = prompt("Enter new amount");
  if(amt!==null && isNum(amt) && desc && cat && acct && desc.length > 0 && cat.length > 0 && acct.length > 0) {
    var data = auth();
    data["key"] = key;
    data["description"] = desc;
    data["category"] = cat;
    data["account"] = acct;
    data["amount"] = Number(amt);
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: function(data) {
          console.log(data);
          if(data) {
            render();
          }
        }
    });
  } else {
    alert("Not valid");
  }
}

function edit_btn(text, type, datai, i){
  return "<span id='expense_update_field"+i+"'>"+text+"</span>";
}

function format_date(time) {
  var timestr = (time.getMonth()+1)+"/"+time.getDate() + "/" + time.getFullYear();
  return timestr;
}

function format_dollars(amt) {
  if(amt === "" || !isNum(amt)) {
    return "(missing)";
  } else {
    return "$"+Number(amt).toFixed(2);
  }
}

function render_expense(datai) {
  var time = dateFromTimestamp(datai[1]["timestamp"]);
  var timestr = format_date(time);
  var description = datai[1]["description"] || "(missing description)";
  var category = datai[1]["category"] || "(uncategorized)";
  var account = datai[1]["account"] || "(missing account)";
  var amount = format_dollars(datai[1]["amount"]);
  var outer = document.createElement("div");
  var line = document.createElement("div");
  var desc = document.createElement("span");
  var cat = document.createElement("span");
  var acct = document.createElement("span");
  var amt = document.createElement("span");
  outer.className = "expense-outer";
  line.className = "expense-line pure-g";
  desc.innerText = description;
  desc.className = "expense-description pure-u-lg-1-2 pure-u-1-1";
  cat.innerText = category;
  cat.className = "expense-category pure-u-lg-1-6 pure-u-1-3";
  acct.innerText = account;
  acct.className = "expense-acct pure-u-lg-1-6 pure-u-1-3";
  amt.innerText = amount;
  amt.className = "expense-amt pure-u-lg-1-6 pure-u-1-3";
  line.appendChild(desc);
  line.appendChild(cat);
  line.appendChild(acct);
  line.appendChild(amt);
  outer.appendChild(line);
  return outer;
      //text += "<tr><td>"+edit_btn(timestr,"timestamp",data[i], i)+"</td><td>"+edit_btn(desc,"description",data[i],i)+"</td><td>"+edit_btn(cat,"category",data[i],i)+"</td><td>"+edit_btn(acct,"account",data[i],i)+"</td><td class='right-align'>"+edit_btn(amt,"amount",data[i],i)+"</td><td><i class='fas fa-edit' id='expense_update"+i+"'></i><i class='fas fa-trash-alt' id='expense_delete"+i+"'></i></td></tr>"
}

function render_expense_date(clump, datestr) {
  var outer = document.createElement("div");
  var line = document.createElement("div");
  outer.className = "expense-clump";
  line.className = "expense-outer-heading";
  line.innerText = datestr;
  outer.appendChild(line);

  for(var i =0; i < clump.length; i++) {
    outer.appendChild(render_expense(clump[i]));
  }
  return outer;
}

function hash_data(data) {
  return JSON.stringify(data);
}

function dateFromTimestamp(tstmp) {
  return new Date(tstmp*1000);
}

function render_expenses() {
  function render_expenses_response(data) {
    var hash = hash_data(data);
    var update = false;
    if(hash !== state.expenseinner) {
      update = true;
      state.expenseinner = hash;
    }
    if(update) {
      var node = document.getElementById("expenses");
      var cNode = node.cloneNode(false);
      //var text = '<table class="pure-table expense-table">';
      //text += '<thead><tr><th>Time</th><th>Expense</th><th>Category</th><th>Account</th><th>Amount</th><th></th></tr></thead><tbody>';
      var prev_date = null;
      var clump = [];
      for(var i = 0; i < data.length; i++) {
        var time = dateFromTimestamp(data[i][1]["timestamp"]);
        var fmt = format_date(time);
        if(fmt !== prev_date && clump.length > 0){
          cNode.appendChild(render_expense_date(clump, prev_date));
          clump.length = 0;
        }
        prev_date = fmt;
        clump.push(data[i]);
      }
      if(clump.length > 0){
        cNode.appendChild(render_expense_date(clump, prev_date));
      }
      //text += "</tbody></table>";
      node.parentNode.replaceChild(cNode ,node);
    }
    /*for(let i = 0; i < data.length; i++) {
      let elem = document.getElementById("expense_update"+i);
      elem.onclick = function() {
        update_expense(elem, data[i][0]);
      }
    }*/
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
  }
  $.ajax({
      type: "POST",
      url: host+"/view_30days",
      data: auth(),
      dataType: "json",
      success: render_expenses_response
  });
}
function get_cat(cat_sums, cat){
  return cat_sums[cat] || 0.0;
}

function submit_expense() {
  var data = auth();
  var desc = document.getElementById("description").value;
  data["description"]=desc;
  var amt = document.getElementById("amount").value;
  if(isNum(amt)) {
    data["amount"] = amt;
  }
  var cat = document.getElementById("category").value;
  if(cat.length > 0) {
    data["category"]=cat;
  }
  var acct = document.getElementById("account-sel").value;
  if(acct && acct.length > 0) {
    data["account"]=document.getElementById("account-sel").value;
  }
  if(desc.length > 0 || amt.length > 0) {
    function submit_expense_response(data) {
      console.log(data);
      if(data) {
        render();
      }
      document.getElementById("description").value="";
      document.getElementById("amount").value="";
      document.getElementById("category").value="";
    };
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: submit_expense_response
    });
  }
}

function render() {
  render_balances();
  render_add_expense();
  render_expenses();
}

function init() {
  setup();
  render();
  setInterval(render, 20000);
}

function setup() {
  $.ajax({
      type: "POST",
      url: host+"/userid",
      data: auth(),
      dataType: "json",
      success: function(data) {
        if(data.error!==undefined) {
          console.log(data.error);
          logout();
        }
      }
  });
  document.getElementById("logoutBtn").onclick = logout;

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
      responsive: true,
      maintainAspectRatio: false,
    }
  });
  categoryPieChart.render();
}

function logout() {
  localStorage.clear();
  document.location.href="login.html";
}

function preinit() {
  user = localStorage.getItem("user");
  token = localStorage.getItem("token");
  if(user === null) {
    document.location.href = "login.html";
  } else {
    window.onload = init;
  }
}
preinit();
