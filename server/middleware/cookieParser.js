const parseCookies = (req, res, next) => {
  // get request header cookie 
  var headerCookies = req.get('Cookie');
  req.cookies = {};
  
  if (headerCookies) {
    // cookieStringArray = split header cookie string by ';'
    var cookieStringArray = headerCookies.split(';');
    // for each cookie in cookieStringArray
    for (var cookie of cookieStringArray) {
      cookie = cookie.trim();
      var [key, value] = cookie.split('=');
      req.cookies[key] = value;
    }
  }
  // req.cookies = {}
  next();
};

module.exports = parseCookies;