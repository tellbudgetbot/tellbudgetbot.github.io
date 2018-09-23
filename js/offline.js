var user=null;
var token=null;
function logout() {
  localStorage.removeItem("token");
  document.location.href="login.html";
}

function get_accounts() {
  var accts = localStorage.getItem("accounts");
  if(accts) {
    try {
      return JSON.parse(accts);
    } catch (e) {
      console.log(e);
      return [];
    }
  } else {
    return [];
  }
}
function get_categories() {
  var cats = localStorage.getItem("categories");
  if(cats) {
    try {
      return JSON.parse(cats);
    } catch (e) {
      console.log(e);
      return [];
    }
  } else {
    return [];
  }
}

function add_pending_expense(data) {
  try {
    var raw = localStorage.getItem("pending_expenses") || "[]";
    var old = JSON.parse(raw);
    old.push(data);
    localStorage.setItem("pending_expenses", JSON.stringify(old));
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

function render_pending(){
  try {
    var raw = localStorage.getItem("pending_expenses") || "[]";
    var old = JSON.parse(raw);
    var text = "";
    if(old.length > 0) {
      text = old.length + " pending " + plural("expense",old.length) + " will be submitted when you reconnect."
    }
    document.getElementById("pending_count").innerText = text;
  } catch (e) {
    console.log(e);
  }
}

function submit_expense_offline() {
  var data = auth();
  var result = get_expense_data(data);
  if(!result) {
    return;
  }
  if(!data["timestamp"]) {
    data["timestamp"] = (new Date().getTime()) / 1000;
  }
  if(data["description"] || data["amount"]) {
    var result = add_pending_expense(data);
    var statusEl = document.getElementById("add-expense-status");
    if(result) {
      statusEl.innerText = "Saved.";
    } else {
      statusEl.innerText = "Error.";
    }
    document.getElementById("description").value="";
    document.getElementById("amount").value="";
    document.getElementById("category").value="";
    $.datepicker._clearDate($("#submit-date"));
    $(statusEl).fadeOut();
    render_pending();
  }
}

function setup() {
  document.getElementById("logoutBtn").onclick = logout;
  setInterval(function() {
    check_online(function(online){
      if(online) {
        document.location.href="index.html";
      }
    });
  }, 5000);

  $( function() {
    $( ".datepicker" ).datepicker();
  } );
  var accountsel = document.getElementById("account-sel");
  render_account_sel(accountsel, get_accounts(), []);
  $( ".category-sel" ).autocomplete({"source": get_categories()});
  render_pending();
}

function preinit() {
  user = localStorage.getItem("user");
  token = localStorage.getItem("token");
  if(user === null || token == null) {
    document.location.href = "login.html";
  } else {
    window.onload = setup;
  }
}
preinit();

