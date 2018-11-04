var user=null;
var token=null;
var categoryPieChart = null;
var ACCT_PREFIX = "__acct:";
var ALL_ACCTS = "{ALL_ACCTS}";
var NO_ACCT = "{NO_ACCT}";
var EXTRA_ACCOUNT_OPTIONS = [[ALL_ACCTS,"any account"],null,[NO_ACCT,"(no account)"]]
var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var state = {
  "last_account_change": "(unknown)",
  "last_expense_change": "(unknown)",
  "last_category_change": "(unknown)",
  "last_pie_change": "(unknown)",
  "last_goal_change": "(unknown)",
  "accounts": [],
  "categories": [],
  "userinfo": null,
  "localmode": false,
  "deleted_keys": {}
};
function getCurrentMonth() {
  return MONTH_NAMES[new Date().getMonth()];
}
function getMonthStart() {
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0,0);
  return start.getTime() / 1000.0;
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
  var key = datai[0];
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
          error: function(r,s,e) {
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
          error: function(r,s,e) {
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
        data["accountid"] = key;
        state.deleted_keys[key] = true;
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
            error: function(r,s,e) {
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
          error: function(r,s,e) {
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

function render_goal_heading() {
  var thead = document.createElement("thead");
  var tr = document.createElement("tr");
  var cat_td = document.createElement("th");
  var goal_td = document.createElement("th");
  var actual_td = document.createElement("th");
  var update_td = document.createElement("th");
  cat_td.innerText="Category";
  goal_td.innerText="Monthly Plan";
  actual_td.innerText="%s so far".replace("%s",getCurrentMonth());
  cat_td.className="category-td";
  goal_td.className="goal-td";
  actual_td.className="actual-td";
  update_td.className="update-td";
  tr.appendChild(cat_td);
  tr.appendChild(goal_td);
  tr.appendChild(actual_td);
  tr.appendChild(update_td);
  thead.appendChild(tr);
  return thead;
}

function render_goal(datai) {
  var goal = datai["amount"];
  var category = datai["category"];
  var spending = datai["spending"];
  var earning = datai["earning"];
  var actualNum = spending - earning;
  if(spending >= earning) {
    actual = format_dollars(spending - earning);
  } else if (earning > spending) {
    actual = "Earned " + format_dollars(earning - spending);
  }

  var tr = document.createElement("tr");
  var cat_td = document.createElement("td");
  var goal_td = document.createElement("td");
  var actual_td = document.createElement("td");
  var goal_inner = document.createElement("span");
  var actual_inner = document.createElement("span");
  var buttons_inner = document.createElement("span");
  var buttons_edit = document.createElement("span");
  var update_td = document.createElement("td");
  var edit_btn = make_btn("fa-edit");
  var del_btn = make_btn("fa-trash-alt");
  var save_btn = make_btn("fa-check");
  var cancel_btn = make_btn("fa-ban");
  var goal_edit = make_input();
  edit_btn.className = "btn goal-btn";
  del_btn.className = "btn goal-btn";
  save_btn.className = "btn goal-btn";
  cancel_btn.className = "btn goal-btn";
  buttons_inner.appendChild(edit_btn);
  buttons_inner.appendChild(del_btn);
  buttons_edit.appendChild(save_btn);
  buttons_edit.appendChild(cancel_btn);
  cat_td.innerText = category;
  goal_inner.innerText = format_dollars(goal);
  actual_inner.innerText = actual;
  edit_btn.addEventListener("click", function() {
    goal_edit.raw.value = format_raw_dollars(goal);
    goal_edit.className = "goal-edit";
    goal_td.replaceChild(goal_edit, goal_inner);
    update_td.replaceChild(buttons_edit, buttons_inner);
  });
  function showInner() {
    goal_td.replaceChild(goal_inner, goal_edit);
    update_td.replaceChild(buttons_inner, buttons_edit);
  }
  function setActualTdClass(currentGoal) {
    actual_td.className="actual-td";
    if(actualNum > currentGoal) {
      actual_td.className += " warning";
    }
  }
  cancel_btn.addEventListener("click", function() {
    showInner();
  });
  save_btn.addEventListener("click", function() {
    var newGoal = goal_edit.raw.value;
    if(!isDollarNum(newGoal)) {
      $(goal_edit.raw).addClass("error");
      return;
    } else {
      $(goal_edit.raw).removeClass("error");
    }
    newGoal = parseDollarNum(newGoal);
    goal_inner.innerText = format_dollars(newGoal);
    setActualTdClass(newGoal);
    showInner();
    if(Math.abs(newGoal - goal) > 0.001) {
      var data = auth();
      data["category"] = category;
      data["amount"] = newGoal;
      $.ajax({
          type: "POST",
          url: host+"/set_goal",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data && data.error) {
              alert(data.error);
            }
            render_goals();
          },
          error: function(r,s,e) {
            alert("Network error");
            console.log(e);
          }
      });
    }
  });
  del_btn.addEventListener("click", function() {
    if(confirm("Are you sure you want to delete the plan for this category?")){
      var data = auth();
      data["category"] = category;
      data["amount"] = null;
      tr.parentNode.removeChild(tr);
      $.ajax({
          type: "POST",
          url: host+"/set_goal",
          data: data,
          dataType: "json",
          success: function(data) {
            if(data && data.error) {
              alert(data.error);
            }
            render_goals();
          },
          error: function(r,s,e) {
            alert("Network error");
            console.log(e);
          }
      });
    }
  });
  cat_td.className="category-td";
  goal_td.className="goal-td";
  update_td.className="update-td";
  setActualTdClass(goal);
  goal_td.appendChild(goal_inner);
  actual_td.appendChild(actual_inner);
  update_td.appendChild(buttons_inner);
  tr.appendChild(cat_td);
  tr.appendChild(goal_td);
  tr.appendChild(actual_td);
  tr.appendChild(update_td);
  return tr;
}

//TODO: Not used
function delete_all_goals() {

}

function render_goal_response(raw_data) {
  if(raw_data.cached) {
    return;
  }
  state.last_goal_change = raw_data.last_change;
  var data = raw_data.goals;

  var node = document.getElementById("goal-content");
  var cNode = node.cloneNode(false);

  if(data.length > 0) {
    var table = document.createElement("table");
    table.className="pure-table";
    table.appendChild(render_goal_heading());
    var tbody = document.createElement("tbody");

    for(var i = 0; i < data.length; i++) {
      tbody.appendChild(render_goal(data[i]));
    }
    table.appendChild(tbody);
    cNode.appendChild(table);
  } else {
    var p = document.createElement("p");
    p.innerText = "No plans set up yet. Go ahead and add one!";
    cNode.appendChild(p);
  }
  node.parentNode.replaceChild(cNode, node);
}

function add_goal(){
  var category = document.getElementById("new-goal-cat").value;
  var amt = document.getElementById("new-goal-amt").value;
  if(!category) {
    alert("You must choose a category for the new plan.");
    return;
  }
  if(!isDollarNum(amt)){
    alert("You must enter a spending maximum.");
    return;
  }
  amt = parseDollarNum(amt);
  var data = auth();
  data["category"] = category;
  data["amount"] = amt;
  $.ajax({
      type: "POST",
      url: host+"/set_goal",
      data: data,
      dataType: "json",
      success: function(data) {
        if(data) {
          if(data.error) {
            alert(data.error);
          } else {
            document.getElementById("new-goal-cat").value = "";
            document.getElementById("new-goal-amt").value = "";
          }
          render_goals();
        }
      },
      error: function(r,s,e) {
        console.log(e);
        alert("Network error");
      }
  });
}

//TODO: Not used
function render_delete_all_goal_btn(){
  var btn = document.createElement("button");
  var p = document.createElement("div");
  btn.innerText = "Delete All Plans";
  btn.className="pure-button";
  btn.addEventListener("click", delete_all_goals);
  p.appendChild(btn);
  return p;
}

function render_goals() {
  var dt = auth();
  dt["last_change"] = state.last_goal_change;
  dt["start_time"] = getMonthStart();
  $.ajax({
      type: "POST",
      url: host+"/get_goals",
      data: dt,
      dataType: "json",
      success: function(data) {
        render_goal_response(data);
      },
      error: function(r,s,e) {
        console.log(e);
      }
  });
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
      if(!state.deleted_keys[data[i][0]]) {
        tbody.appendChild(render_account(data[i]));
      }
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
  localStorage.setItem("accounts",JSON.stringify(data));

  var options = "";
  var suggest = "";
  for(var i = 0; i < data.length; i++) {
    if(data[i][1] < 0) {
      suggest += "Suggestion: Your balance in " + data[i][1] + " is negative, which may lead to high fees and/or interest. Consider paying this debt first before saving money in other accounts.<br>"
    }
  }
  document.getElementById("warning1").innerText=suggest;
  var accountsel = document.getElementById("account-sel");
  render_account_sel(accountsel, data, []);
  accountsel = document.getElementById("account-source");
  render_account_sel(accountsel, data, []);
  accountsel = document.getElementById("account-dest");
  render_account_sel(accountsel, data, []);

  accountsel = document.getElementById("expenses-account-sel");
  var eaccountsel = render_account_sel(accountsel, data, EXTRA_ACCOUNT_OPTIONS);
  eaccountsel.onchange = expense_month_selector_changed;

  accountsel = document.getElementById("pie-account-sel");
  var paccountsel = render_account_sel(accountsel, data, EXTRA_ACCOUNT_OPTIONS);
  paccountsel.onchange = pie_month_selector_changed;
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
      error: function(r,s,e) {
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
        localStorage.setItem("categories",JSON.stringify(raw_data.categories));
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
function make_tooltip(text) {
  var btn = make_btn("fa-question-circle fa-sm");
  var sup = document.createElement("sup");
  btn.setAttribute("data-tooltip", text);
  sup.appendChild(btn);
  return sup;
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
  var select = render_account_sel(null, state.accounts, []);
  select.className = "raw-input";
  outer.appendChild(select);
  outer.raw = select;
  return outer;
}

function render_expense(datai) {
  var time = dateFromTimestamp(datai[1]["timestamp"]);
  var timestr = format_date(time);
  var key = datai[0];
  var description = datai[1]["description"] || "(no description)";
  var category = datai[1]["category_name"] || datai[1]["category"] || "(uncategorized)";
  var account = datai[1]["account_name"] || "(no account)";
  var amount = format_dollars(datai[1]["amount"]);
  var outer = document.createElement("div");
  var line = document.createElement("div");
  var desc = document.createElement("span");
  var desc_inner = document.createElement("span");
  var cat = document.createElement("span");
  var cat_info = null;
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
  var cat_info = make_tooltip("Since most of your budget items are expenses, we consider expenses to be positive and income to be negative. Don't worry, we'll handle the math.");
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
      data["key"] = key;
      state.deleted_keys[key] = true;
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
          error: function(r,s,e) {
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
    if(newCat.toLowerCase() == "income") {
      cat_inner.appendChild(cat_info);
    }
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
        error: function(r,s,e) {
          alert("Network error");
          console.log(e);
        }
    });
  });

  amt.appendChild(amt_inner);
  desc.appendChild(desc_inner);
  if(category.toLowerCase() == "income") {
    cat_inner.appendChild(cat_info);
  }
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
    if(!state.deleted_keys[clump[i][0]]) {
      outer.appendChild(render_expense(clump[i]));
    }
  }
  return outer;
}

function dateFromTimestamp(tstmp) {
  return new Date(tstmp*1000);
}

function min(a,b) {
  if(a===undefined) {
    return b;
  }
  if(b===undefined) {
    return a;
  }
  return Math.min(a,b);
}

function render_month_selector(sel, extra_lasts) {
  if(state.userinfo === null) {
    console.log("Error: no user info");
    return;
  }
  var create_time = state.userinfo.create_time;
  var earliest_time = state.userinfo.earliest_txn;
  var create_date = new Date(min(create_time,earliest_time) * 1000);
  var now = new Date();
  var cNode = null;
  var val = null;
  cNode = sel.cloneNode(false);
  val = sel.value;

  var lasts = [7,30];
  if(extra_lasts) {
    for(var i = 0; i < extra_lasts.length; i++) {
      lasts.push(extra_lasts[i]);
    }
  }
  for(var i = 0; i < lasts.length; i++) {
    var option = document.createElement("option");
    option.value = "LAST"+lasts[i];
    option.innerText = "the last " + lasts[i] + " days";
    cNode.appendChild(option);
  }

  var createMonth = create_date.getMonth();
  var createYear = create_date.getFullYear();
  var month = now.getMonth();
  var year = now.getFullYear();
  while(year > createYear || (year == createYear && month >= createMonth)) {
    var option = document.createElement("option");
    option.value = year+"-"+month;
    option.innerText = MONTH_NAMES[month] + " " + year;
    cNode.appendChild(option);

    month--;
    if(month < 0) {
      month += 12;
      year--;
    }
  }
  cNode.value = val;
  sel.parentNode.replaceChild(cNode, sel);
  return cNode;
}
function render_pie() {
  function render_pie_response(raw_data) {
    if(raw_data.cached) {
      return;
    }
    state.last_pie_change = raw_data.last_change;

    var unfiltered_data = raw_data.items;
    var acctFilter = document.getElementById("pie-account-sel").value;
    var data = applyFilters(unfiltered_data, acctFilter);

    var cat_spend = {};
    var cat_earn = {};
    var cats = [];
    for(var i = 0; i < data.length; i++) {
      if(isNum(data[i][1]["amount"])) {
        var cat = data[i][1]["category"];
        if(!cat) {
          cat = "Uncategorized";
        }
        var amt = Number(data[i][1]["amount"]);
        if(cat_spend[cat] === null || cat_spend[cat] === undefined) {
          cat_spend[cat]=0.0;
          cat_earn[cat]=0.0;
          cats.push(cat);
        }
        if(amt > 0) {
          cat_spend[cat]+=amt;
        } else if(amt < 0) {
          cat_earn[cat]-=amt;
        }
      }
    }
    cats.sort(function(a,b) {
      return cat_spend[b] - cat_spend[a];
    });
    if(get_cat(cat_spend,"Entertainment") > get_cat(cat_spend,"Groceries") + get_cat(cat_spend,"Eating out")) {
      document.getElementById("warnings").innerText = "Suggestion: Your spending on entertainment exceeds your spending on food. To save money, consider reducing entertainment expenses.";
    } else {
      document.getElementById("warnings").innerText = "";
    }
    var empty_message = "Welcome to Budget Bot! At the moment, there are no expenses for the range selected, but once you enter in some expenses, you'll be able to visualize your spending here.";
    if(categoryPieChart) {
      if(cats.length > 0) {
        categoryPieChart.data.labels.length = 0;
        categoryPieChart.data.datasets[0].data.length = 0;
        var incomes = [];
        var total_income = 0
        var total_expenses = 0;
        var only_income_cat = true;
        for(var i = 0; i < cats.length; i++) {
          if(!starts_with(cats[i],ACCT_PREFIX)) {
            if(cat_spend[cats[i]] > 0) {
              categoryPieChart.data.labels.push(cats[i]);
              categoryPieChart.data.datasets[0].data.push(cat_spend[cats[i]].toFixed(2));
              total_expenses += cat_spend[cats[i]];
            }
            if(cat_earn[cats[i]] > 0) {
              incomes.push(cats[i] + ": " + format_dollars(cat_earn[cats[i]]));
              total_income += cat_earn[cats[i]];
              if(cats[i] !== "Income") {
                only_income_cat = false;
              }
            }
          }
        }
        var income_cats = "";
        if(incomes.length > 1) {
          income_cats = " Your income can be divided into categories as follows: " + incomes.join(", ");
        } else {
          income_cats = "";
        }
        if(total_expenses > 0) {
          categoryPieChart.update();
          $("#pieChartContainer").show();
        } else {
          $("#pieChartContainer").hide();
        }
        if(total_expenses > 0 || total_income > 0) {
          document.getElementById("welcome-explore").innerText = "For this range, your income totaled " + format_dollars(total_income) + " and your spending totaled " + format_dollars(total_expenses) + "." + income_cats;
        } else {
          document.getElementById("welcome-explore").innerText = empty_message;
        }
      } else {
        $("#pieChartContainer").hide();
        document.getElementById("welcome-explore").innerText = empty_message;
      }
    }
  }
  var dt = auth();
  dt["last_change"] = state.last_pie_change;

  var sel = document.getElementById("pie-month-sel");
  get_expenses(dt, sel, render_pie_response);
}

function checkFilters(datai, acctFilter) {
  if(acctFilter === ALL_ACCTS) {
    return true;
  }
  if(acctFilter === datai["account"]) {
    return true;
  }
  if(ACCT_PREFIX + acctFilter === datai["category"]) {
    return true;
  }
  if(acctFilter === NO_ACCT && !datai["account"]) {
    return true;
  }
}

function applyFilters(unfiltered_data, acctFilter) {
  var data = [];
  for(var i = 0; i < unfiltered_data.length; i++) {
    if(checkFilters(unfiltered_data[i][1], acctFilter)) {
      data.push(unfiltered_data[i]);
    }
  }
  return data;
}

function render_expenses(callback) {
  function render_expenses_response(raw_data) {
    if(raw_data.cached) {
      return;
    }
    state.last_expense_change = raw_data.last_change;
    var unfiltered_data = raw_data.items;

    var acctFilter = document.getElementById("expenses-account-sel").value;
    var data = applyFilters(unfiltered_data, acctFilter);

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
      document.getElementById("expenses").innerText = "";
      document.getElementById("welcome-expenses").innerText = "There aren't any transactions for the range selected.";
    }
    document.getElementById("expenses").style.opacity=1;
    if(callback) {
      callback();
    }
  }
  var dt = auth();
  dt["last_change"] = state.last_expense_change;

  var sel = document.getElementById("expenses-month-sel");
  get_expenses(dt, sel, render_expenses_response);
}

function get_expenses(dt, selector, callback) {
  if(selector.value.substr(0,4) == "LAST") {
    dt["duration"] = Number(selector.value.substr(4))*3600*24;
  } else {
    var parts = selector.value.split("-");
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var start = new Date(year, month, 1);
    var end = new Date(year, month+1, 1);
    dt["start_time"] = start.getTime() / 1000;
    dt["end_time"] = end.getTime() / 1000;
  }
  $.ajax({
      type: "POST",
      url: host+"/view_recent",
      data: dt,
      dataType: "json",
      success: callback,
      error: function(r,s,e) {
        console.log(e);
      }
  });
}

function get_cat(cat_sums, cat){
  return cat_sums[cat] || 0.0;
}

function submit_expense() {
  var data = auth();
  var result = get_expense_data(data);
  if(!result) {
    return;
  }
  if(data["description"] || data["amount"]) {
    var statusEl = document.getElementById("add-expense-status");
    function submit_expense_response(data) {
      if(data && data.error) {
        alert(data.error);
      }
      render();
      document.getElementById("description").value="";
      document.getElementById("amount").value="";
      document.getElementById("category").value="";
      $.datepicker._clearDate($("#submit-date"));
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
        error: function(r,s,e) {
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
  var date = $("#transfer-date").datepicker( "getDate" );
  if(date) {
    //TODO: timezone problems
    var noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    data["timestamp"] = noon.getTime() / 1000;
    data["timezone"] = noon.getTimezoneOffset();
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
      error: function(r,s,e) {
        alert("Network error");
        console.log(e);
      }
  });
}

function expense_month_selector_changed() {
  state.last_expense_change = "(unknown)";
  document.getElementById("expenses").style.opacity=0.5;
  render_expenses(function() {
    setTimeout(function() {
      document.location.href = "#view";
    },50);
  });
  document.location.href = "#view";
}

function pie_month_selector_changed() {
  state.last_pie_change = "(unknown)";
  render_pie();
}

function render() {
  render_balances(function(){
    render_add_expense();
    render_expenses();
    render_pie();
    render_goals();
  });
  localcheck();
}

function init() {
  setup();
  render();
  setInterval(render, 20000);
}
function localcheck() {
  if(state.localmode) {
    check_online(function(online){
      if(!online) {
        document.location.href="offline.html";
      } else {
        submit_pending_expenses(Math.random());
      }
    });
  }
}
function setup() {
  localcheck();
  var dt = auth();
  dt["timezone"] = new Date().getTimezoneOffset();
  $.ajax({
      type: "POST",
      url: host+"/userinfo",
      data: dt,
      dataType: "json",
      success: function(data) {
        if(data.error!==undefined) {
          console.log(data.error);
          logout();
        } else {
          state.userinfo = data;
          var emonsel = document.getElementById("expenses-month-sel");
          emonsel = render_month_selector(emonsel);
          emonsel.onchange = expense_month_selector_changed;

          var pmonsel = document.getElementById("pie-month-sel");
          pmonsel = render_month_selector(pmonsel, [60,90,365]);
          pmonsel.onchange = pie_month_selector_changed;
        }
      },
      error: function(r,s,e) {
        console.log(e);
      }
  });
  document.getElementById("logoutBtn").onclick = logout;

  $( function() {
    $( ".datepicker" ).datepicker();
  } );

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
  localStorage.removeItem("token");
  document.location.href="login.html";
}

function preinit() {
  user = localStorage.getItem("user");
  token = localStorage.getItem("token");
  if(user === null || token == null) {
    document.location.href = "login.html";
  } else {
    if(document.location.href.indexOf("tellbudgetbot.com")===-1) {
      //local mode
      var mlink = document.getElementById("messenger-link");
      mlink.parentNode.removeChild(mlink);
      document.getElementById("connect-messenger").innerHTML = 'You can easily record your expenses just by talking to <a href="http://m.me/tellbudgetbot">Budget Bot on Messenger</a>.';
      state.localmode = true;
    } else {
      document.getElementById("messenger-link").setAttribute("data-ref",token);
    }
    window.onload = init;
  }
}
preinit();
