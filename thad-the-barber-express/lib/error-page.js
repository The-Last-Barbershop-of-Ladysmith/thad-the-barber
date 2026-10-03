var { errorPagePolicy } = require('./content-security-policy');
var { recordException, requestId } = require('./telemetry');

var policy = errorPagePolicy();
// "//host" and "/\host" are links to another site, which would make "Try again" an open redirect.
var SAME_ORIGIN_PATH = /^\/(?![/\\])/;

function errorPage(showDetails) {
  return function(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
    recordException(err);
    var status = err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status)
      .set('Content-Security-Policy', policy)
      .set('Cache-Control', 'no-store')
      .render('error', {
        status: status,
        requestId: requestId(),
        retryUrl: req.method === 'GET' && SAME_ORIGIN_PATH.test(req.originalUrl) ? req.originalUrl : '/',
        stack: showDetails ? err.stack : null,
      });
  };
}

module.exports = { errorPage };
