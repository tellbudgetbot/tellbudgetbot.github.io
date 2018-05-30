var user=null;
var token=null;
var categoryPieChart = null;
var ACCT_PREFIX="__acct:";

var state = {
  "last_account_change": "(unknown)",
  "last_expense_change": "(unknown)",
  "last_category_change": "(unknown)",
  "accounts": [],
  "categories": []
};

function auth(){
  return {"token": token};
}
function parseDollarNum(num) {
  var sign = 1;
  if(num.length == 0){
    return NaN;
  }
  if(num.charAt(0)=="-") {
    num = num.substr(1);
    sign = -1;
  }
  if(num.charAt(0)=="$") {
    num = num.substr(1);
  }
	num = num.replace(/,/g,"");
  if(num.length == 0) {
    return NaN;
  }
  return sign * Number(num);
}
function isNum(num){
  return !isNaN(Number(num));
}
function isDollarNum(num) {
  return !isNaN(parseDollarNum(num));
}
function starts_with(str,pref){
  return str.length >= pref.length && str.substr(0,pref.length) == pref;
}


function update_balance(elem, key) {
  var balance = prompt("Enter new balance");
  if(isDollarNum(balance)) {
    var data = auth();
    data["account"] = key;
    data["balance"] = parseDollarNum(balance);
    $.ajax({
        type: "POST",
        url: host+"/set_balance",
        data: data,
        dataType: "json",
        success: function(data) {
          if(data && data.error) {
            alert(data.error);
          }
          render_balances();
        },
        error: function(e) {
          alert("Network error");
          console.log(e);
        }
    });
  } else {
    alert("Not a number");
  }

}
function render_account_heading() {
  var thead = document.createElement("thead");
  var tr = document.createElement("tr");
  var acct_td = document.createElement("th");
  var balance_td = document.createElement("th");
  var update_td = document.createElement("th");
  acct_td.innerText="Account";
  balance_td.innerText="Balance";
  acct_td.className="account-td";
  balance_td.className="balance-td";
  update_td.className="update-td";
  tr.appendChild(acct_td);
  tr.appendChild(balance_td);
  tr.appendChild(update_td);
  thead.appendChild(tr);
  return thead;
}

function render_account(datai) {
  var tr = document.createElement("tr");
  var acct_td = document.createElement("td");
  var balance_td = document.createElement("td");
  var acct_inner = document.createElement("span");
  var balance_inner = document.createElement("span");
  var buttons_inner = document.createElement("span");
  var buttons_edit = document.createElement("span");
  var update_td = document.createElement("td");
  var edit_btn = make_btn("fa-edit");
  var del_btn = make_btn("fa-trash-alt");
  var save_btn = make_btn("fa-check");
  var cancel_btn = make_btn("fa-ban");
  var acct_edit = make_input();
  var balance_edit = make_input();
  edit_btn.className = "btn account-edit-btn";
  del_btn.className = "btn account-del-btn";
  save_btn.className = "btn account-save-btn";
  cancel_btn.className = "btn account-cancel-btn";
  buttons_inner.appendChild(edit_btn);
  buttons_inner.appendChild(del_btn);
  buttons_edit.appendChild(save_btn);
  buttons_edit.appendChild(cancel_btn);
  acct_inner.innerText = datai[1];
  balance_inner.innerText = format_dollars(datai[2]);
  edit_btn.addEventListener("click", function() {
    balance_edit.raw.value = format_raw_dollars(datai[2]);
    acct_edit.raw.value = datai[1] || "";
    balance_edit.className = "account-edit account-amt-edit";
    acct_edit.className = "account-edit";
    balance_td.replaceChild(balance_edit, balance_inner);
    acct_td.replaceChild(acct_edit, acct_inner);
    update_td.replaceChild(buttons_edit, buttons_inner);
  });
  function showInner() {
    balance_td.replaceChild(balance_inner, balance_edit);
    acct_td.replaceChild(acct_inner, acct_edit);
    update_td.replaceChild(buttons_inner, buttons_edit);
  }
  cancel_btn.addEventListener("click", function() {
    showInner();
  });
  save_btn.addEventListener("click", function() {
    var newBalance = balance_edit.raw.value;
    var newAcct = acct_edit.raw.value;
    if(!isDollarNum(newBalance)) {
      $(balance_edit.raw).addClass("error");
      return;
    } else {
      $(balance_edit.raw).removeClass("error");
    }
    newBalance = parseDollarNum(newBalance);
    balance_inner.innerText = format_dollars(newBalance);
    acct_inner.innerText = newAcct;
    showInner();
    if(Math.abs(newBalance - datai[2]) > 0.001) {
      var data = auth();
      data["accountid"] = datai[0];
      data["balance"] = newBalance;
      $.ajax({
          type: "POST",
          url: host+"/set_balance",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data && data.error) {
              alert(data.error);
            }
            render_balances();
          },
          error: function(e) {
            alert("Network error");
            console.log(e);
          }
      });
    }
    if(newAcct != datai[1]) {
      var data = auth();
      data["accountid"] = datai[0];
      data["accountname"] = newAcct;
      $.ajax({
          type: "POST",
          url: host+"/update_account",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data && data.error) {
              alert(data.error);
            }
            render_balances();
          },
          error: function(e) {
            alert("Network error");
            console.log(e);
          }
      });
    }
  });
  del_btn.addEventListener("click", function() {
    if(confirm("CAUTION: Are you sure you want to delete this account? All budget items currently filed to this account will no longer be associated with it.")) {
      if(confirm("Please confirm that you want to delete the following account: " + datai[1])) {
        var data = auth();
        data["accountid"] = datai[0];
        tr.parentNode.removeChild(tr);
        $.ajax({
            type: "POST",
            url: host+"/delete_account",
            data: data,
            dataType: "json",
            success: function(data) {
              if(data && data.error) {
                alert(data.error);
              }
              render();
            },
            error: function(e) {
              alert("Network error");
              console.log(e);
            }
        });
      }
    }
  });
  acct_td.className="account-td";
  balance_td.className="balance-td";
  update_td.className="update-td";
  acct_td.appendChild(acct_inner);
  balance_td.appendChild(balance_inner);
  update_td.appendChild(buttons_inner);
  tr.appendChild(acct_td);
  tr.appendChild(balance_td);
  tr.appendChild(update_td);
  return tr;
}

function render_add_account_btn(){
  var btn = document.createElement("button");
  function add_account(){
    if(btn.disabled) {
      return;
    }
    var name = prompt("Enter account name");
    if(name && name.length >= 1) {
      btn.disabled = true;
      var data = auth();
      data["account"] = name;
      data["balance"] = 0;
      $.ajax({
          type: "POST",
          url: host+"/add_account",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data) {
              if(data.error) {
                alert(data.error);
              }
              render_balances(function() {
                btn.disabled = false;
              });
              render();
            }
          },
          error: function(e) {
            console.log(e);
            alert("Network error");
            btn.disabled = false;
          }
      });
    }
  }
  var p = document.createElement("p");
  btn.innerText = "Add Account";
  btn.className="pure-button";
  btn.addEventListener("click", add_account);
  p.appendChild(btn);
  return p;
}

function render_account_sel(accountsel, accounts){
  var cNode = null;
  var val = null;
  if(accountsel) {
    cNode = accountsel.cloneNode(false);
    val = accountsel.value;
  } else {
    cNode = document.createElement("select");
  }
  var isValid = false;
  for(var i = 0; i < accounts.length; i++) {
    var option = document.createElement("option");
    option.value = accounts[i][0];
    if(accounts[i][0] == val) {
      isValid = true;
    }
    option.innerText = accounts[i][1];
    cNode.appendChild(option);
  }
  if(accounts.length > 0) {
    $(cNode).show();
  } else {
    $(cNode).hide();
  }
  if(val && isValid) {
    cNode.value = val;
  }
  if(accountsel) {
    accountsel.parentNode.replaceChild(cNode, accountsel);
  }
  return cNode;
}

function render_balance_response(raw_data) {
  if(raw_data.cached) {
    return;
  }
  state.last_account_change = raw_data.last_change;
  var data = raw_data.accounts;

  var node = document.getElementById("balance-content");
  var cNode = node.cloneNode(false);

  if(data.length > 0) {
    var table = document.createElement("table");
    table.className="pure-table";
    table.appendChild(render_account_heading());
    var tbody = document.createElement("tbody");

    for(var i = 0; i < data.length; i++) {
      tbody.appendChild(render_account(data[i]));
    }
    table.appendChild(tbody);
    cNode.appendChild(table);
  } else {
    var p = document.createElement("p");
    p.innerText = "No accounts yet. Go ahead and add one!";
    cNode.appendChild(p);
  }
  cNode.appendChild(render_add_account_btn());
  node.parentNode.replaceChild(cNode, node);

  state.accounts = data;

  var options = "";
  var suggest = "";
  for(var i = 0; i < data.length; i++) {
    if(data[i][1] < 0) {
      suggest += "Suggestion: Your balance in " + data[i][1] + " is negative, which may lead to high fees and/or interest. Consider paying this debt first before saving money in other accounts.<br>"
    }
  }
  document.getElementById("warning1").innerText=suggest;
  var accountsel = document.getElementById("account-sel");
  render_account_sel(accountsel, data);
  accountsel = document.getElementById("account-source");
  render_account_sel(accountsel, data);
  accountsel = document.getElementById("account-dest");
  render_account_sel(accountsel, data);
};

function render_balances(callback) {
  var dt = auth();
  dt["last_change"] = state.last_account_change;
  $.ajax({
      type: "POST",
      url: host+"/get_balances",
      data: dt,
      dataType: "json",
      success: function(data) {
        render_balance_response(data);
        if(callback) {
          callback(data);
        }
      },
      error: function(e) {
        console.log(e);
      }
  });
}

function render_add_expense() {
  var dt = auth();
  dt["last_change"] = state.last_category_change;
  $.ajax({
      type: "POST",
      url: host+"/list_categories",
      data: dt,
      dataType: "json",
      success: function(raw_data) {
        if(raw_data.cached) {
          return;
        }
        state.last_category_change = raw_data.last_change;
        state.categories = raw_data.categories;
        $( ".category-sel" ).autocomplete({"source": raw_data.categories});
      }
  });
}

function edit_btn(text, type, datai, i){
  return "<span id='expense_update_field"+i+"'>"+text+"</span>";
}

function format_date(time) {
  var timestr = (time.getMonth()+1)+"/"+time.getDate() + "/" + time.getFullYear();
  return timestr;
}

function sign(num, text) {
  return num >=0 ? text : "("+text+")";
}

function format_dollars(amt) {
  if(amt === "" || !isNum(amt)) {
    return "(missing)";
  } else {
    var num = Number(amt);
    return sign(num, "$"+Math.abs(num).toFixed(2));
  }
}
function format_raw_dollars(amt) {
  if(amt === "" || !isNum(amt)) {
    return "";
  } else {
    return Number(amt).toFixed(2);
  }
}

function make_btn(type) {
  var icon = document.createElement("i");
  var outer = document.createElement("span");
  icon.className = "fas " + type;
  outer.appendChild(icon);
  return outer;
}
function make_input() {
  var input = document.createElement("input");
  var outer = document.createElement("div");
  input.className = "raw-input";
  input.type="text";
  input.autocomplete="off";
  input.setAttribute("data-lpignore", "true");
  outer.appendChild(input);
  outer.raw = input;
  return outer;
}
function make_account_sel() {
  var outer = document.createElement("div");
  var select = render_account_sel(null, state.accounts);
  select.className = "raw-input";
  outer.appendChild(select);
  outer.raw = select;
  return outer;
}

function render_expense(datai) {
  var time = dateFromTimestamp(datai[1]["timestamp"]);
  var timestr = format_date(time);
  var description = datai[1]["description"] || "(missing description)";
  var category = datai[1]["category_name"] || datai[1]["category"] || "(uncategorized)";
  var account = datai[1]["account_name"] || "(missing account)";
  var amount = format_dollars(datai[1]["amount"]);
  var outer = document.createElement("div");
  var line = document.createElement("div");
  var desc = document.createElement("span");
  var desc_inner = document.createElement("span");
  var cat = document.createElement("span");
  var cat_inner = document.createElement("span");
  var acct = document.createElement("span");
  var acct_inner = document.createElement("span");
  var amt = document.createElement("span");
  var amt_inner = document.createElement("span");
  var desc_edit = make_input();
  var cat_edit = make_input();
  var acct_edit = make_account_sel();
  var amt_edit = make_input();
  var btns = document.createElement("span");
  var btns_inner = document.createElement("span");
  var btns_edit = document.createElement("span");
  var edit = make_btn("fa-edit");
  var del = make_btn("fa-trash-alt");
  var save = make_btn("fa-check");
  var cancel = make_btn("fa-ban");
  outer.className = "expense-outer";
  line.className = "expense-line pure-g";
  desc_inner.innerText = description;
  desc.className = "expense-description pure-u-lg-9-24 pure-u-18-24";
  amt_inner.innerText = amount;
  amt_inner.className="expense-amt-inner";
  amt.className = "expense-amt pure-u-lg-3-24 pure-u-6-24";
  cat_inner.innerText = category;
  cat.className = "expense-category pure-u-lg-5-24 pure-u-9-24";
  acct_inner.innerText = account;
  acct.className = "expense-acct pure-u-lg-5-24 pure-u-11-24";
  btns.className = "expense-btns pure-u-lg-2-24 pure-u-4-24";
  btns_inner.className="expense-btns-inner";
  edit.className = "btn edit-btn";
  del.className = "btn del-btn";
  save.className = "btn save-btn";
  cancel.className = "btn cancel-btn";

  edit.addEventListener("click", function() {
    amt_edit.raw.value = format_raw_dollars(datai[1]["amount"]);
		amt_edit.raw.placeholder = "Amount";
    cat_edit.raw.value = datai[1]["category_name"] || datai[1]["category"] || "";
		cat_edit.raw.placeholder = "Category";
    acct_edit.raw.value = datai[1]["account"] || "";
		acct_edit.raw.placeholder = "Account";
    desc_edit.raw.value = datai[1]["description"] || "";
		desc_edit.raw.placeholder = "Description";
    $( cat_edit.raw ).autocomplete({"source": state.categories});
    amt_edit.className = "expense-edit expense-amt-edit";
    cat_edit.className = "expense-edit category-sel";
    acct_edit.className = "expense-edit";
    desc_edit.className = "expense-edit";
    amt.replaceChild(amt_edit, amt_inner);
    desc.replaceChild(desc_edit, desc_inner);
    acct.replaceChild(acct_edit, acct_inner);
    cat.replaceChild(cat_edit, cat_inner);
    btns.replaceChild(btns_edit, btns_inner);
  });
  del.addEventListener("click", function() {
    if(confirm("Are you sure you want to delete this budget item?")) {
      var data = auth();
      data["key"] = datai[0];
      outer.parentNode.removeChild(outer);
      $.ajax({
          type: "POST",
          url: host+"/delete",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data && data.error) {
              alert(data.error);
            }
            render();
          },
          error: function(e) {
            alert("Network error");
            console.log(e);
          }
      });
    }
  });
  function showInner() {
    amt.replaceChild(amt_inner, amt_edit);
    desc.replaceChild(desc_inner, desc_edit);
    acct.replaceChild(acct_inner, acct_edit);
    cat.replaceChild(cat_inner, cat_edit);
    btns.replaceChild(btns_inner, btns_edit);
  }
  cancel.addEventListener("click", function() {
    showInner();
  });
  save.addEventListener("click", function() {
    var newAmt = amt_edit.raw.value;
    var newDesc = desc_edit.raw.value;
    var newCat = cat_edit.raw.value;
    var newAcct = acct_edit.raw.value;
    if(!isDollarNum(newAmt)) {
      $(amt_edit.raw).addClass("error");
      return;
    } else {
      $(amt_edit.raw).removeClass("error");
    }
    newAmt = parseDollarNum(newAmt);
    amt_inner.innerText = format_dollars(newAmt);
    desc_inner.innerText = newDesc;
    cat_inner.innerText = newCat;
    var idx = acct_edit.raw.selectedIndex;
    if(idx >= 0) {
      acct_inner.innerText = acct_edit.raw.options[acct_edit.raw.selectedIndex].text;
    }
    showInner();
    var data = auth();
    data["key"] = datai[0];
    data["description"] = newDesc;
    data["category"] = newCat;
    data["account"] = newAcct;
    data["amount"] = newAmt;
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: function(data) {
          if(data && data.error) {
            alert(data.error);
          }
          render();
        },
        error: function(e) {
          alert("Network error");
          console.log(e);
        }
    });
  });

  amt.appendChild(amt_inner);
  desc.appendChild(desc_inner);
  cat.appendChild(cat_inner);
  acct.appendChild(acct_inner);
  btns_inner.appendChild(edit);
  btns_inner.appendChild(del);
  btns_edit.appendChild(save);
  btns_edit.appendChild(cancel);
  btns.appendChild(btns_inner);
  line.appendChild(desc);
  line.appendChild(amt);
  line.appendChild(cat);
  line.appendChild(acct);
  line.appendChild(btns);
  outer.appendChild(line);
  return outer;
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

function dateFromTimestamp(tstmp) {
  return new Date(tstmp*1000);
}

function render_expenses() {
  function render_expenses_response(raw_data) {
    if(raw_data.cached) {
      return;
    }
    state.last_expense_change = raw_data.last_change;
    var data = raw_data.items;

    if(data.length > 0) {
      document.getElementById('welcome-expenses').innerText="";
      var node = document.getElementById("expenses");
      var cNode = node.cloneNode(false);
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
      node.parentNode.replaceChild(cNode ,node);
    } else {
        document.getElementById("welcome-expenses").innerText = "Once you enter in some expenses, they'll appear here.";

    }

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
    if(categoryPieChart) {
      if(cats.length > 0) {
        $("#pieChartContainer").show();
        categoryPieChart.data.labels.length = 0;
        categoryPieChart.data.datasets[0].data.length = 0;
        for(var i = 0; i < cats.length; i++) {
          if(cat_sums[cats[i]] > 0 && !starts_with(cats[i],ACCT_PREFIX)) {
            categoryPieChart.data.labels.push(cats[i]);
            categoryPieChart.data.datasets[0].data.push(cat_sums[cats[i]].toFixed(2));
          }
        }
        categoryPieChart.update();
        document.getElementById("welcome-explore").innerText = "";
      } else {
        $("#pieChartContainer").hide();
        document.getElementById("welcome-explore").innerText = "Welcome to Budget Bot! Once you enter in some expenses, you'll be able to visualize your spending here.";
      }
    }
  }
  var dt = auth();
  dt["last_change"] = state.last_expense_change;
  $.ajax({
      type: "POST",
      url: host+"/view_all",
      data: dt,
      dataType: "json",
      success: render_expenses_response,
      error: function(e) {
        console.log(e);
      }
  });
}
function get_cat(cat_sums, cat){
  return cat_sums[cat] || 0.0;
}

function submit_expense() {
  var data = auth();
  var desc = document.getElementById("description").value;
  data["description"]=desc;
	var amt_el = document.getElementById("amount");
  var amt = amt_el.value;
	if(amt !== "") {
		if(isDollarNum(amt)) {
			data["amount"] = parseDollarNum(amt);
		} else {
			$(amt_el).addClass("error");
			return;
		}
	}
	$(amt_el).removeClass("error");
  var cat = document.getElementById("category").value;
  if(cat.length > 0) {
    data["category"]=cat;
  }
  var acct = document.getElementById("account-sel").value;
  if(acct && acct.length > 0) {
    data["account"]=document.getElementById("account-sel").value;
  }
  if(desc.length > 0 || amt.length > 0) {
		var statusEl = document.getElementById("add-expense-status");
    function submit_expense_response(data) {
      if(data && data.error) {
        alert(data.error);
      }
      render();
      document.getElementById("description").value="";
      amt_el.value="";
      document.getElementById("category").value="";
			statusEl.innerText = "Submitted.";
			$(statusEl).fadeOut();
    };
		$(statusEl).show();
		statusEl.innerText = "Submitting...";
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: submit_expense_response,
        error: function(e) {
          alert("Network error");
          console.log(e);
        }
    });
  }
}

function submit_transfer() {
  var data = auth();
  data["description"] = "Transfer";
	var amt_el = document.getElementById("transfer-amount");
  var amt = amt_el.value;
	if(isDollarNum(amt)) {
		data["amount"] = parseDollarNum(amt);
	} else {
		$(amt_el).addClass("error");
		return;
	}
	$(amt_el).removeClass("error");
  var cat = document.getElementById("account-dest").value;
  if(cat && cat.length > 0) {
    data["category"]=ACCT_PREFIX+cat;
  } else {
		return;
	}
  var acct = document.getElementById("account-source").value;
  if(acct && acct.length > 0) {
    data["account"]=document.getElementById("account-source").value;
  } else {
		return;
	}
	var statusEl = document.getElementById("add-transfer-status");
	function submit_transfer_response(data) {
		if(data && data.error) {
			alert(data.error);
		}
		render();
		amt_el.value="";
		statusEl.innerText = "Submitted.";
		$(statusEl).fadeOut();
	};
	$(statusEl).show();
	statusEl.innerText = "Submitting...";
	$.ajax({
			type: "POST",
			url: host+"/add",
			data: data,
			dataType: "json",
			success: submit_transfer_response,
			error: function(e) {
				alert("Network error");
				console.log(e);
			}
	});
}

function render() {
  render_balances(function(){
    render_add_expense();
    render_expenses();
  });
}

function init() {
  setup();
  render();
  setInterval(render, 10000);
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
      },
      error: function(e) {
        console.log(e);
      }
  });
  document.getElementById("logoutBtn").onclick = logout;

  try {
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
          }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      }
    });
    categoryPieChart.render();
  } catch (e) {
    console.log(e);
  }
}

function logout() {
  localStorage.clear();
  document.location.href="login.html";
}

function preinit() {
  user = localStorage.getItem("user");
  token = localStorage.getItem("token");
  if(user === null || token == null) {
    document.location.href = "login.html";
  } else {
    document.getElementById("messenger-link").setAttribute("data-ref",token);
    window.onload = init;
  }
}
preinit();

var user=null;
