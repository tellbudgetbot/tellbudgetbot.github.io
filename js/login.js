$('.message a').click(function(){
   $('form').animate({height: "toggle", opacity: "toggle"}, "slow");
});
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
    console.log('Error');
  });
}
function signup(){
  var user = document.getElementById("user1").value;
  var email = document.getElementById("email1").value;
  var pass = document.getElementById("password1").value;
  var check13 = document.getElementById("check13").checked;
  var checkTOS = document.getElementById("checkTOS").checked;
  var checkEmail = document.getElementById("checkEmail").checked;
  if(check) {
    alert(check);
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
  $.post(host+"/signup", {"user":user,"email":email,"pass":pass,"check13":check13,"checkTOS":checkTOS,"checkEmail":checkEmail}, function( data ) {
    if(data.error === undefined) {
      redir(user,data);
    } else {
      alert(data.error)
    }
  },"json").fail(function() {
    console.log('Error');
  });
}
function startsWith(str,start){
  return str.length >= start.length && str.substr(0,start.length) == start;
}
function is_valid_redirect(redirect_uri) {
  var uris = ["https://pitangui.amazon.com/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT",
              "https://layla.amazon.com/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT",
              "https://alexa.amazon.co.jp/spa/skill/account-linking-status.html?vendorId=M1MY1UQEEEFTLT"];
  for(var i = 0;  i < uris.length; i++) {
    if(redirect_uri == uris[i]){
      return true;
    }
  }
  if(startsWith(redirect_uri, "https://facebook.com/messenger_platform/account_linking/")) {
    return true;
  }
  return false;
}
function redir(user,data){
  localStorage.setItem("user",user);
  localStorage.setItem("userid",data.userid);
  localStorage.setItem("token",data.token);
  if(window.location.search.indexOf("alexa")!==-1){
		var url = window.location.href;
		var state = getParameterByName("state", url);
		var client_id = getParameterByName("client_id", url);
		var response_type = getParameterByName("response_type", url);
		var scope = getParameterByName("scope", url);
		var redirect_uri = getParameterByName("redirect_uri", url);
    if(client_id == "alexa" && is_valid_redirect(redirect_uri)) {
      var uri = redirect_uri+"#state="+state+"&access_token="+data.token+"&token_type=Bearer";
      localStorage.setItem("redirect_uri", uri);
      function do_redirect() {
        document.location.href = "connect.html";
      }
      $.post(host+"/alexa_event", {"token":data.token,"event":"alexa_link"}, do_redirect)
       .fail(do_redirect);
      return;
    }
  } else if(window.location.search.indexOf("messenger")!==-1) {
		var url = window.location.href;
		var link_token = getParameterByName("account_linking_token", url);
		var client_id = getParameterByName("client_id", url);
		var redirect_uri = getParameterByName("redirect_uri", url);
    if(client_id == "messenger" && is_valid_redirect(redirect_uri)) {
      document.location.href=redirect_uri + "&authorization_code="+data.token;
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
