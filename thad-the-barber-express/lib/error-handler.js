var fs = require('fs');
var path = require('path');
var angularDist = require('./angular-dist');
var { errorPagePolicy } = require('./content-security-policy');
var { recordException, requestId } = require('./telemetry');

var shop = JSON.parse(fs.readFileSync(path.join(angularDist, 'shop.json'), 'utf8'));

// "//host" and "/\host" are links to another site, which would make "Try again" an open redirect.
var SAME_ORIGIN_PATH = /^\/(?![/\\])/;

// Renders views/error.ejs. The stack trace shows only when NODE_ENV is "development": Express treats an unset NODE_ENV
// as development, and App Service doesn't set it, so Express's own env setting can't be trusted for this.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  recordException(err);
  var status = err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status)
    .set('Content-Security-Policy', errorPagePolicy())
    .set('Cache-Control', 'no-store')
    .render('error', {
      shop: shop,
      status: status,
      requestId: requestId(),
      retryUrl: req.method === 'GET' && SAME_ORIGIN_PATH.test(req.originalUrl) ? req.originalUrl : '/',
      stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });
}

module.exports = { errorHandler };
