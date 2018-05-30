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
