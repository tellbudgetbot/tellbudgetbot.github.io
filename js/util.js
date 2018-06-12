var host = localStorage.getItem("api_host") || "https://api.tellbudgetbot.com";
function passwordComplexityCheck(pwd) {
  if(pwd.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if(pwd.toLowerCase() == pwd || pwd.toUpperCase() == pwd) {
    return "Password must contain at least one uppercase letter and at least one lowercase letter.";
  }
  return false;
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

function plural(word1, num, word2) {
  if(num == 1) {
    return word1;
  } else {
    return word2 || (word1 + "s");
  }
}

function auth(){
  return {"token": token};
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

var submit_lock_global = null;
function submit_pending_expenses(submit_lock) {
  if(submit_lock_global && submit_lock !== submit_lock_global) {
    return;
  }
  submit_lock_global = submit_lock;
  try {
    var raw = localStorage.getItem("pending_expenses") || "[]";
    var old = JSON.parse(raw);
    if(old.length == 0) {
      submit_lock_global = null;
      return;
    }
    data = old.shift();
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: function() {
          if(data && data.error) {
            console.log(data.error);
          } else {
            localStorage.setItem("pending_expenses", JSON.stringify(old));
            submit_pending_expenses(submit_lock);
          }
        },
        error: function(r,s,e) {
          console.log(e);
          submit_lock_global = null;
        }
    });
  } catch (e) {
    console.log(e);
    submit_lock_global = null;
  }
}

function check_online(callback) {
  $.ajax({
      type: "GET",
      url: host+"/healthcheck",
      success: function(data) {
        callback(data==="true");
      },
      error: function(r,s,e) {
        callback(false);
        console.log(e);
      }
  });
}

function get_expense_data(data) {
  var desc = document.getElementById("description").value;
  data["description"]=desc;
  var amt_el = document.getElementById("amount");
  var amt = amt_el.value;
  if(amt !== "") {
    if(isDollarNum(amt)) {
      data["amount"] = parseDollarNum(amt);
    } else {
      $(amt_el).addClass("error");
      return false;
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
  var date = $("#submit-date").datepicker( "getDate" );
  if(date) {
    //TODO: timezone problems
    var noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    data["timestamp"] = noon.getTime() / 1000;
    data["timezone"] = noon.getTimezoneOffset();
  }
  return true;
}
