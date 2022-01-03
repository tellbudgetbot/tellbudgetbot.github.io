$('.switcher a').click(function(){
   $('form').animate({height: "toggle", opacity: "toggle"}, 50);
});
function preinit() {
  var url = window.location.href;
  var client_id = getParameterByName("client_id", url);
  if(document.location.hash.indexOf("signup")!==-1 ||
     client_id == "alexa" ||
     client_id == "bixby") {
    $('form').animate({height: "toggle", opacity: "toggle"}, 50);
  }
  if(client_id) {
    var link_types = {
      "alexa": "Alexa",
      "messenger": "Facebook Messenger",
      "bixby": "Bixby",
      "messenger_alt": "Facebook Messenger"
    };
    var link_type = link_types[client_id] || "an external service";
    $('.link_msg').text("By continuing, you will link your Budget Bot account to " + link_type + ".");
    $('.link_msg').removeClass("hidden");
  }
}
function showVideo() {
  var outer = document.getElementById("outerVideo");
  outer.className += " visible";
  var video = document.getElementById("video");
  video.src += "&autoplay=1";
}
function login(){
  var user = document.getElementById("user2").value;
  var pass = document.getElementById("password2").value;
  $.post(host+"/login", {"user":user,"pass":pass}, function( data ) {
    if(data.error === undefined ) {
      redir(user,data);
    } else {
      alert(data.error);
    }
  },"json").fail(function() {
    alert('Network error');
  });
}
function signup(){
  var user = document.getElementById("user1").value;
  var email = document.getElementById("email1").value;
  var pass = document.getElementById("password1").value;
  var check13 = document.getElementById("check13").checked;
  var checkTOS = document.getElementById("checkTOS").checked;
  var checkEmail = document.getElementById("checkEmail").checked;
  var timezone = new Date().getTimezoneOffset();
  var check = passwordComplexityCheck(pass);
  if(check) {
    alert(check);
    return;
  }
  if(user.length < 3) {
    alert("Sorry, your username must be at least 3 letters");
    return;
  }
  if(!check13) {
    alert("Sorry, you must be at least 13 years old to sign up.");
    return;
  }
  if(!checkTOS) {
    alert("Sorry, you must agree to the Terms of Service and Privacy Policy in order to use Budget Bot.");
    return;
  }
  $.post(host+"/signup", {"user":user,"email":email,"pass":pass,"check13":check13,"checkTOS":checkTOS,"checkEmail":checkEmail,"timezone": timezone}, function( data ) {
    if(data.error === undefined) {
      redir(user,data);
    } else {
      alert(data.error)
    }
  },"json").fail(function() {
    alert('Network error');
  });
}
function startsWith(str,start){
  return str.length >= start.length && str.substr(0,start.length) == start;
}
function is_valid_redirect(redirect_uri, client_id) {
  if(client_id == "alexa") {
    var uris = ["https://pitangui.amazon.com/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT",
                "https://layla.amazon.com/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT",
                "https://alexa.amazon.co.jp/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT"];
    for(var i = 0;  i < uris.length; i++) {
      if(redirect_uri == uris[i]){
        return true;
      }
    }
  }
  if(client_id == "messenger" && startsWith(redirect_uri, "https://facebook.com/messenger_platform/account_linking/")) {
    return true;
  }
  if(client_id == "bixby" && startsWith(redirect_uri, "https://budgetbot-budgetbot.oauth.aibixby.com")) {
    return true;
  }
  return false;
}
function redir(user,data){
  localStorage.setItem("user",user);
  localStorage.setItem("userid",data.userid);
  localStorage.setItem("token",data.token);
  var url = window.location.href;
  var client_id = getParameterByName("client_id", url);
  if (client_id === "alexa"){
    var state = getParameterByName("state", url);
    var response_type = getParameterByName("response_type", url);
    var scope = getParameterByName("scope", url);
    var redirect_uri = getParameterByName("redirect_uri", url);
    if(is_valid_redirect(redirect_uri, client_id)) {
      var uri = redirect_uri+"#state="+state+"&access_token="+data.token+"&token_type=Bearer";
      localStorage.setItem("redirect_uri", uri);
      function do_redirect_alexa() {
        document.location.href = "connect.html";
      }
      $.post(host+"/alexa_event", {"token":data.token,"event":"alexa_link"}, do_redirect_alexa)
       .fail(do_redirect_alexa);
      return;
    }
  } else if(client_id == "messenger") {
    var link_token = getParameterByName("account_linking_token", url);
    var redirect_uri = getParameterByName("redirect_uri", url);
    if(is_valid_redirect(redirect_uri, client_id)) {
      document.location.href=redirect_uri + "&authorization_code="+data.token;
      return;
    }
  } else if(client_id == "messenger_alt") {
    var link_token = getParameterByName("account_linking_token", url);
    var ts = getParameterByName("ts", url);
    var recipient_id = getParameterByName("recipient_id", url);
    var page_id = getParameterByName("page_id", url);
    var msgr_host = "https://msgr.tellbudgetbot.com:444"
    function do_redirect_fb(data) {
      if(data.error === undefined) {
        window.close();
        document.write("Account linked successfully! Close this window to continue.");
      } else {
        alert(data.error)
      }
    }
    var fb_link_data = {"account_linking_token":link_token, "ts": ts, "recipient_id": recipient_id, "page_id": page_id, "authorization_code": data.token};
    var fb_link_json = JSON.stringify(fb_link_data);
    $.post(msgr_host+"/manual_link", fb_link_data, do_redirect_fb,"json").fail(function() {
      alert('Network error');
    });
    return;
  } else if(client_id == "bixby") {
    var state = getParameterByName("state", url);
    var redirect_uri = getParameterByName("redirect_uri", url);
    if(is_valid_redirect(redirect_uri, client_id)) {
      function do_redirect_bixby() {
        document.location.href=redirect_uri + "?grant_type=authorization_code&code="+data.token+"&state="+state;
      }
      $.post(host+"/bixby_event", {"token":data.token,"event":"bixby_link"}, do_redirect_bixby)
       .fail(do_redirect_bixby);
      return;
    }
  }
  document.location.href="index.html";
}
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
preinit();
