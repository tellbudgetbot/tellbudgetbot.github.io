// Bulk CSV upload of credit card transactions (entirely client side).

var BULK_DUP_DAYS = 3;
var BULK_PREFIX = "*";
var bulk_state = {
  rows: [],
  uploading: false
};

// ---------- CSV parsing ----------

function bulk_detect_delimiter(text) {
  var firstLines = text.split(/\r?\n/).slice(0, 5).join("\n");
  var best = ",";
  var bestCount = 0;
  var cands = [",", ";", "\t", "|"];
  for(var i = 0; i < cands.length; i++) {
    var count = firstLines.split(cands[i]).length - 1;
    if(count > bestCount) {
      bestCount = count;
      best = cands[i];
    }
  }
  return best;
}

function bulk_parse_csv(text) {
  text = text.replace(/^﻿/, "");
  var delim = bulk_detect_delimiter(text);
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;
  for(var i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    if(inQuotes) {
      if(c === '"') {
        if(text.charAt(i+1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if(c === '"') {
      inQuotes = true;
    } else if(c === delim) {
      row.push(field);
      field = "";
    } else if(c === "\n" || c === "\r") {
      if(c === "\r" && text.charAt(i+1) === "\n") {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if(field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  var out = [];
  for(var j = 0; j < rows.length; j++) {
    var r = rows[j].map(function(f) { return f.trim(); });
    if(r.join("").length > 0) {
      out.push(r);
    }
  }
  return out;
}

// ---------- Value parsing ----------

// Returns a Date at local noon, or null.
function bulk_parse_date(str) {
  if(!str) {
    return null;
  }
  str = str.trim();
  var m, y, mo, d;
  if((m = str.match(/^(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if((m = str.match(/^(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})\b/))) {
    var a = +m[1], b = +m[2];
    y = +m[3];
    if(a > 12 && b <= 12) {
      d = a; mo = b;  // day-first
    } else {
      mo = a; d = b;  // assume US month-first
    }
  } else if((m = str.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else {
    var t = Date.parse(str);
    if(isNaN(t)) {
      return null;
    }
    var pd = new Date(t);
    y = pd.getFullYear(); mo = pd.getMonth() + 1; d = pd.getDate();
  }
  if(y < 100) {
    y += 2000;
  }
  if(mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1970 || y > 2200) {
    return null;
  }
  var date = new Date(y, mo - 1, d, 12);
  if(date.getMonth() !== mo - 1) {
    return null;
  }
  return date;
}

// Returns a number, or NaN.
function bulk_parse_amount(str) {
  if(str === undefined || str === null) {
    return NaN;
  }
  var s = String(str).trim();
  if(s.length === 0) {
    return NaN;
  }
  var neg = false;
  if(/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if(/-$/.test(s)) {
    neg = !neg;
    s = s.slice(0, -1);
  }
  if(/\bCR$/i.test(s)) {
    neg = !neg;
    s = s.replace(/\s*CR$/i, "");
  } else {
    s = s.replace(/\s*DR$/i, "");
  }
  s = s.replace(/[$€£¥\s]|USD|CAD|EUR|GBP/gi, "");
  if(s.charAt(0) === "-") {
    neg = !neg;
    s = s.substr(1);
  } else if(s.charAt(0) === "+") {
    s = s.substr(1);
  }
  // European style "1.234,56"
  if(/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  s = s.replace(/,/g, "");
  if(!/^\d*\.?\d+$/.test(s)) {
    return NaN;
  }
  var n = Number(s);
  return neg ? -n : n;
}

// ---------- Column detection ----------

function bulk_norm_header(h) {
  return (h || "").toLowerCase().replace(/[^a-z]/g, "");
}

var BULK_HEADER_PATTERNS = {
  date: ["transactiondate", "transdate", "date", "purchasedate", "posteddate", "postdate", "postingdate", "clearingdate", "settlementdate"],
  description: ["description", "merchant", "merchantname", "payee", "name", "transactiondescription", "originaldescription", "details", "narrative", "memo"],
  amount: ["amount", "amountusd", "transactionamount", "amt", "value", "billingamount"],
  debit: ["debit", "debitamount", "debits", "withdrawal", "withdrawals", "charge", "charges", "moneyout", "paidout"],
  credit: ["credit", "creditamount", "credits", "deposit", "deposits", "payment", "payments", "moneyin", "paidin"],
  category: ["category", "transactioncategory", "merchantcategory", "categoryname", "spendcategory"],
  type: ["type", "transactiontype", "debitcredit", "drcr"]
};

function bulk_find_column(headers, key, used) {
  var pats = BULK_HEADER_PATTERNS[key];
  // exact matches in priority order
  for(var p = 0; p < pats.length; p++) {
    for(var i = 0; i < headers.length; i++) {
      if(!used[i] && headers[i] === pats[p]) {
        return i;
      }
    }
  }
  // partial match
  for(var p2 = 0; p2 < pats.length; p2++) {
    if(pats[p2].length < 4) {
      continue;
    }
    for(var j = 0; j < headers.length; j++) {
      if(!used[j] && headers[j].indexOf(pats[p2]) !== -1) {
        return j;
      }
    }
  }
  return -1;
}

function bulk_map_headers(row) {
  var headers = row.map(bulk_norm_header);
  var used = {};
  var cols = {};
  var order = ["date", "amount", "debit", "credit", "category", "type", "description"];
  for(var k = 0; k < order.length; k++) {
    var idx = bulk_find_column(headers, order[k], used);
    cols[order[k]] = idx;
    if(idx >= 0) {
      used[idx] = true;
    }
  }
  return cols;
}

function bulk_has_required(cols) {
  return cols.date >= 0 && cols.description >= 0 && (cols.amount >= 0 || cols.debit >= 0 || cols.credit >= 0);
}

// Guess columns from content when there is no header row (e.g. Wells Fargo).
function bulk_guess_columns(rows) {
  var n = 0;
  for(var i = 0; i < rows.length; i++) {
    n = Math.max(n, rows[i].length);
  }
  var cols = {date: -1, description: -1, amount: -1, debit: -1, credit: -1, category: -1, type: -1};
  var sample = rows.slice(0, 50);
  var bestTextLen = 0;
  for(var c = 0; c < n; c++) {
    var dates = 0, nums = 0, textLen = 0;
    for(var r = 0; r < sample.length; r++) {
      var v = sample[r][c] || "";
      if(bulk_parse_date(v) && /\d/.test(v)) {
        dates++;
      } else if(!isNaN(bulk_parse_amount(v))) {
        nums++;
      } else {
        textLen += v.length;
      }
    }
    if(cols.date < 0 && dates > sample.length / 2) {
      cols.date = c;
    } else if(cols.amount < 0 && nums > sample.length / 2) {
      cols.amount = c;
    } else if(textLen > bestTextLen) {
      bestTextLen = textLen;
      cols.description = c;
    }
  }
  return cols;
}

// ---------- Category normalization ----------

// Checked against the transaction description before the CSV's own category.
var BULK_DESCRIPTION_RULES = [
  [/walgreens/, "Health"],
  [/\bbp\b|\bshell\b|chevron|exxon|\bmobil\b|speedway|marathon petro|citgo|sunoco|valero|texaco|\barco\b|phillips 66|conoco|wawa|sheetz|casey'?s|circle k|\bgas\b|gasoline|fuel/, "Transportation"],
  [/jewel|trader joe|whole foods|kroger|safeway|aldi\b|publix|albertsons|wegmans|\bheb\b|meijer|food lion|giant eagle|stop & shop|stop and shop|sprouts|mariano|grocer|supermarket|piggly|ralphs|vons|harris teeter|shoprite|winco|save-a-lot|fresh market/, "Groceries"],
  [/fitness/, "Fitness"],
  [/\bgarage\b|parking|\bunited\b(?! ?(health|way|states|bank))|southwest|airline|airways|\bair lines\b|jetblue|allegiant|\bdelta air|alaska air/, "Transportation"],
  [/disney|\bapple\b|peacock|netflix|hulu|\bhbo\b|spotify|youtube|paramount|prime video|crunchyroll|audible|twitch|\bsling\b|pandora|\bmax\.com/, "Entertainment"]
];

var BULK_CATEGORY_RULES = [
  [/payment|thank you|autopay/, "Miscellaneous"],
  [/grocer|supermarket|food market/, "Groceries"],
  [/restaurant|dining|food|drink|coffee|cafe|café|bar\b|fast food|eating out|takeout|bakery/, "Dining"],
  [/gas|fuel|auto|\bcars?\b|car rental|parking|toll|transport|transit|taxi|rideshare|uber|lyft|airfare|airline|\btrain|\bbus\b/, "Transportation"],
  [/utilit|phone|cable|internet|wireless|mobile|electric|water|bill/, "Utilities"],
  [/\brent\b|mortgage|housing/, "Housing"],
  [/health|medical|pharmac|drug|doctor|dental|vision|wellness|gym|hospital|personal care/, "Health"],
  [/\bpets?\b|veterinar/, "Pets"],
  [/educat|tuition|school|book/, "Education"],
  [/cloth|apparel|shoe|fashion/, "Clothing"],
  [/electronic|computer|software/, "Electronics"],
  [/home|furniture|hardware|household|garden/, "Home supplies"],
  [/office/, "Office supplies"],
  [/fitness/, "Fitness"],
  [/laundry|dry clean/, "Laundry"],
  [/entertain|movie|music|stream|recreation|hobb|sport|game|event|ticket/, "Entertainment"],
  [/income|paycheck|payroll|salary|deposit/, "Income"],
  [/shopping|merchandise|retail|department|general|other|misc|fee|interest|personal|service/, "Miscellaneous"]
];

// Never returns an empty string: falls back to Miscellaneous.
function bulk_normalize_category(raw, existing, description) {
  var desc = (description || "").toLowerCase();
  for(var d = 0; d < BULK_DESCRIPTION_RULES.length; d++) {
    if(BULK_DESCRIPTION_RULES[d][0].test(desc)) {
      return BULK_DESCRIPTION_RULES[d][1];
    }
  }
  var trimmed = (raw || "").trim();
  if(!trimmed) {
    return "Miscellaneous";
  }
  var lower = trimmed.toLowerCase();
  existing = existing || [];
  for(var i = 0; i < existing.length; i++) {
    if(String(existing[i]).toLowerCase() === lower) {
      return existing[i];
    }
  }
  for(var j = 0; j < BULK_CATEGORY_RULES.length; j++) {
    if(BULK_CATEGORY_RULES[j][0].test(lower)) {
      return BULK_CATEGORY_RULES[j][1];
    }
  }
  return trimmed;
}

// ---------- Transaction extraction ----------

function bulk_type_sign(type) {
  var t = (type || "").toLowerCase().trim();
  if(/^(debit|dr|sale|purchase|fee|charge|withdrawal)/.test(t)) {
    return 1;
  }
  if(/^(credit|cr|return|refund|payment|deposit)/.test(t)) {
    return -1;
  }
  return 0;
}

function bulk_is_payment(desc, category, type) {
  if(/payment/i.test(type || "")) {
    return true;
  }
  if(/^payment|payments? ?(and|&|\/) ?credit/i.test(category || "")) {
    return true;
  }
  return /payment.*thank|thank you.*payment|autopay|auto pay|online payment|mobile payment|payment received|epayment|^payment\b/i.test(desc || "");
}

// signMode: "auto", "positive" (purchases positive in file), "negative" (purchases negative in file)
// Returns {txns: [...], errors: [...]}. Each txn amount is positive for expenses.
function bulk_extract(text, signMode, existingCats) {
  var rows = bulk_parse_csv(text);
  var errors = [];
  if(rows.length === 0) {
    return {txns: [], errors: ["The file is empty."]};
  }
  var cols = null;
  var start = 0;
  for(var h = 0; h < Math.min(rows.length, 15); h++) {
    var c = bulk_map_headers(rows[h]);
    if(bulk_has_required(c)) {
      cols = c;
      start = h + 1;
      break;
    }
  }
  if(!cols) {
    cols = bulk_guess_columns(rows);
    start = 0;
    if(!bulk_has_required(cols)) {
      return {txns: [], errors: ["Couldn't find date, description, and amount columns in this file."]};
    }
  }

  var txns = [];
  for(var i = start; i < rows.length; i++) {
    var r = rows[i];
    var date = bulk_parse_date(r[cols.date]);
    var amt = NaN;
    var fromDebitCredit = false;
    if(cols.amount >= 0) {
      amt = bulk_parse_amount(r[cols.amount]);
    }
    if(isNaN(amt) && (cols.debit >= 0 || cols.credit >= 0)) {
      var deb = cols.debit >= 0 ? bulk_parse_amount(r[cols.debit]) : NaN;
      var cred = cols.credit >= 0 ? bulk_parse_amount(r[cols.credit]) : NaN;
      if(!isNaN(deb) || !isNaN(cred)) {
        amt = (isNaN(deb) ? 0 : Math.abs(deb)) - (isNaN(cred) ? 0 : Math.abs(cred));
        fromDebitCredit = true;
      }
    }
    if(!date || isNaN(amt)) {
      if(r.join("").length > 0) {
        errors.push("Skipped unreadable row " + (i + 1) + ": " + r.join(", "));
      }
      continue;
    }
    var desc = r[cols.description] || "";
    var rawCat = cols.category >= 0 ? (r[cols.category] || "") : "";
    var type = cols.type >= 0 ? (r[cols.type] || "") : "";
    txns.push({
      date: date,
      rawAmount: amt,
      fromDebitCredit: fromDebitCredit,
      typeSign: bulk_type_sign(type),
      description: desc,
      rawCategory: rawCat,
      type: type
    });
  }

  // Decide sign of single-amount columns.
  var flip = 1;
  if(signMode === "negative") {
    flip = -1;
  } else if(signMode === "auto") {
    var pos = 0, neg = 0;
    for(var k = 0; k < txns.length; k++) {
      var t = txns[k];
      if(t.fromDebitCredit || bulk_is_payment(t.description, t.rawCategory, t.type)) {
        continue;
      }
      if(t.rawAmount > 0) { pos++; } else if(t.rawAmount < 0) { neg++; }
    }
    if(neg > pos) {
      flip = -1;
    }
  }
  for(var m = 0; m < txns.length; m++) {
    var tx = txns[m];
    if(tx.fromDebitCredit) {
      tx.amount = tx.rawAmount;
    } else if(signMode === "auto" && tx.typeSign !== 0 && tx.rawAmount !== 0) {
      tx.amount = tx.typeSign * Math.abs(tx.rawAmount);
    } else {
      tx.amount = flip * tx.rawAmount;
    }
    tx.amount = Math.round(tx.amount * 100) / 100;
    tx.isPayment = tx.amount < 0 && bulk_is_payment(tx.description, tx.rawCategory, tx.type);
    tx.category = bulk_normalize_category(tx.rawCategory, existingCats, tx.description);
  }
  return {txns: txns, errors: errors};
}

// ---------- Duplicate detection ----------

function bulk_day_index(date) {
  return Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime() / 86400000);
}

// existing: list of {amount, timestamp(seconds)} on the target account.
// Marks txn.duplicate = true when a matching existing transaction exists.
// Each existing transaction can match at most one CSV row.
function bulk_mark_duplicates(txns, existing) {
  var pool = existing.map(function(e) {
    return {amount: Number(e.amount), day: bulk_day_index(new Date(e.timestamp * 1000)), used: false};
  });
  for(var i = 0; i < txns.length; i++) {
    var t = txns[i];
    var day = bulk_day_index(t.date);
    var best = null;
    for(var j = 0; j < pool.length; j++) {
      var p = pool[j];
      if(p.used || Math.abs(p.amount - t.amount) > 0.005) {
        continue;
      }
      var diff = Math.abs(p.day - day);
      if(diff <= BULK_DUP_DAYS && (best === null || diff < best.diff)) {
        best = {idx: j, diff: diff};
      }
    }
    t.duplicate = best !== null;
    if(best) {
      pool[best.idx].used = true;
    }
  }
}

// ---------- UI ----------

function bulk_status(msg) {
  document.getElementById("bulk-status").innerText = msg;
}

function bulk_fetch_existing(acct, txns, callback) {
  var minT = Infinity, maxT = -Infinity;
  for(var i = 0; i < txns.length; i++) {
    var t = txns[i].date.getTime();
    minT = Math.min(minT, t);
    maxT = Math.max(maxT, t);
  }
  var dt = auth();
  dt["last_change"] = "(unknown)";
  dt["start_time"] = Math.floor((minT - (BULK_DUP_DAYS + 2) * 86400000) / 1000);
  dt["end_time"] = Math.ceil((maxT + (BULK_DUP_DAYS + 2) * 86400000) / 1000);
  $.ajax({
      type: "POST",
      url: host+"/view_recent",
      data: dt,
      dataType: "json",
      success: function(data) {
        if(!data || data.error || !data.items) {
          callback(data && data.error ? data.error : "Couldn't load existing transactions.");
          return;
        }
        var existing = [];
        for(var i = 0; i < data.items.length; i++) {
          var item = data.items[i][1];
          if(item["account"] === acct && isNum(item["amount"]) && item["amount"] !== "") {
            existing.push({amount: Number(item["amount"]), timestamp: item["timestamp"]});
          }
        }
        callback(null, existing);
      },
      error: function(r,s,e) {
        console.log(e);
        callback("Network error while checking for duplicates.");
      }
  });
}

function bulk_preview() {
  if(bulk_state.uploading) {
    return;
  }
  var acct = document.getElementById("bulk-account-sel").value;
  var fileEl = document.getElementById("bulk-file");
  var signMode = document.getElementById("bulk-sign").value;
  if(!acct) {
    bulk_status("Please add an account first, then choose it above.");
    return;
  }
  if(!fileEl.files || fileEl.files.length === 0) {
    bulk_status("Please choose a CSV file.");
    return;
  }
  bulk_status("Reading file...");
  document.getElementById("bulk-preview").innerHTML = "";
  $("#bulk-upload-btn").hide();
  var reader = new FileReader();
  reader.onload = function() {
    var result = bulk_extract(reader.result, signMode, state.categories);
    if(result.txns.length === 0) {
      bulk_status(result.errors.join("\n") || "No transactions found in this file.");
      return;
    }
    bulk_status("Checking for duplicates...");
    bulk_fetch_existing(acct, result.txns, function(err, existing) {
      if(err) {
        bulk_status(err);
        return;
      }
      bulk_mark_duplicates(result.txns, existing);
      bulk_state.rows = result.txns;
      bulk_state.account = acct;
      bulk_render_preview(result.errors);
    });
  };
  reader.onerror = function() {
    bulk_status("Couldn't read the file.");
  };
  reader.readAsText(fileEl.files[0]);
}

function bulk_category_input(t) {
  var input = document.createElement("input");
  input.type = "text";
  input.className = "bulk-cat-input category-sel";
  input.value = t.category;
  input.autocomplete = "off";
  input.setAttribute("data-lpignore", "true");
  input.addEventListener("input", function() {
    t.category = input.value.trim();
  });
  input.addEventListener("blur", function() {
    t.category = input.value.trim() || "Miscellaneous";
    input.value = t.category;
  });
  $(input).autocomplete({"source": state.categories});
  return input;
}

function bulk_render_preview(errors) {
  var rows = bulk_state.rows;
  var container = document.getElementById("bulk-preview");
  container.innerHTML = "";
  var table = document.createElement("table");
  table.className = "pure-table bulk-table";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  ["", "Date", "Description", "Amount", "Category", "Status"].forEach(function(h) {
    var th = document.createElement("th");
    th.innerText = h;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  var dups = 0, payments = 0;
  for(var i = 0; i < rows.length; i++) {
    var t = rows[i];
    t.include = !t.duplicate && !t.isPayment;
    var status = "New";
    if(t.duplicate) {
      status = "Duplicate (skipped)";
      dups++;
    } else if(t.isPayment) {
      status = "Card payment (skipped)";
      payments++;
    }
    var tr = document.createElement("tr");
    if(!t.include) {
      tr.className = "bulk-skip";
    }
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = t.include;
    cb.addEventListener("change", (function(t, tr) {
      return function() {
        t.include = this.checked;
        tr.className = t.include ? "" : "bulk-skip";
        bulk_update_upload_btn();
      };
    })(t, tr));
    var cells = [cb, format_date(t.date), BULK_PREFIX + t.description, format_dollars(t.amount), bulk_category_input(t), status];
    for(var c = 0; c < cells.length; c++) {
      var td = document.createElement("td");
      if(typeof cells[c] === "string") {
        td.innerText = cells[c];
      } else {
        td.appendChild(cells[c]);
      }
      if(c === 3) {
        td.className = "bulk-amt";
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  var wrap = document.createElement("div");
  wrap.className = "bulk-table-wrap";
  wrap.appendChild(table);
  container.appendChild(wrap);
  var msg = "Found " + rows.length + " " + plural("transaction", rows.length) + ". ";
  if(dups > 0) {
    msg += dups + " already " + plural("exists", dups, "exist") + " on this account. ";
  }
  if(payments > 0) {
    msg += payments + " card " + plural("payment", payments) + " unchecked. ";
  }
  msg += "Expenses are positive and refunds/credits negative; if the signs look reversed, change the amount sign option and preview again.";
  if(errors && errors.length > 0) {
    msg += "\n" + errors.join("\n");
  }
  bulk_status(msg);
  bulk_update_upload_btn();
}

function bulk_update_upload_btn() {
  var n = 0;
  for(var i = 0; i < bulk_state.rows.length; i++) {
    if(bulk_state.rows[i].include) {
      n++;
    }
  }
  var btn = document.getElementById("bulk-upload-btn");
  btn.innerText = "Upload " + n + " " + plural("transaction", n);
  btn.disabled = n === 0 || bulk_state.uploading;
  $(btn).show();
}

function bulk_upload() {
  if(bulk_state.uploading) {
    return;
  }
  var acct = bulk_state.account;
  var todo = bulk_state.rows.filter(function(t) { return t.include; });
  if(todo.length === 0) {
    return;
  }
  bulk_state.uploading = true;
  var btn = document.getElementById("bulk-upload-btn");
  btn.disabled = true;
  var done = 0, failed = 0;
  function next() {
    if(done + failed >= todo.length) {
      bulk_state.uploading = false;
      bulk_state.rows = [];
      document.getElementById("bulk-preview").innerHTML = "";
      $(btn).hide();
      document.getElementById("bulk-file").value = "";
      bulk_status("Uploaded " + done + " " + plural("transaction", done) + "." + (failed > 0 ? " " + failed + " failed." : ""));
      render();
      return;
    }
    var t = todo[done + failed];
    var data = auth();
    data["description"] = BULK_PREFIX + t.description;
    data["amount"] = t.amount;
    data["category"] = t.category || "Miscellaneous";
    data["account"] = acct;
    data["timestamp"] = t.date.getTime() / 1000;
    data["timezone"] = t.date.getTimezoneOffset();
    bulk_status("Uploading " + (done + failed + 1) + " of " + todo.length + "...");
    $.ajax({
        type: "POST",
        url: host+"/add",
        data: data,
        dataType: "json",
        success: function(resp) {
          if(resp && resp.error) {
            console.log(resp.error);
            failed++;
          } else {
            done++;
          }
          next();
        },
        error: function(r,s,e) {
          console.log(e);
          failed++;
          next();
        }
    });
  }
  next();
}

if(typeof module !== "undefined") {
  module.exports = {
    bulk_parse_csv: bulk_parse_csv,
    bulk_parse_date: bulk_parse_date,
    bulk_parse_amount: bulk_parse_amount,
    bulk_extract: bulk_extract,
    bulk_mark_duplicates: bulk_mark_duplicates,
    bulk_normalize_category: bulk_normalize_category
  };
}
