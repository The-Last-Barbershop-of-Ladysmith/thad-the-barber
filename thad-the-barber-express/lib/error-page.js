var { recordException, requestId } = require('./telemetry');

// The page has no inline code: its stylesheet, brand.css from the Angular build and the logo are all same-origin.
var ERROR_PAGE_POLICY = "default-src 'none'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

// showDetails adds the stack trace; app.js passes it only when NODE_ENV is "development".
function errorPage(showDetails) {
  return function(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
    recordException(err);
    var status = err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status)
      .set('Content-Security-Policy', ERROR_PAGE_POLICY)
      .set('Cache-Control', 'no-store')
      .render('error', {
        status: status,
        requestId: requestId(),
        retryUrl: req.method === 'GET' ? req.originalUrl : '/',
        stack: showDetails ? err.stack : null,
      });
  };
}

module.exports = { errorPage };
