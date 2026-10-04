var compression = require('compression');
var express = require('express');
var path = require('path');

var { errorHandler } = require('./lib/error-handler');
var { securityHeaders } = require('./lib/security-headers');
var healthRouter = require('./routes/health');
var indexRouter = require('./routes/index');

var app = express();

// Pages carry a per-request CSP nonce, so an ETag would only invite a cached copy with a stale one.
app.set('etag', false);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// Express only caches views when NODE_ENV is "production", which App Service doesn't set.
app.set('view cache', process.env.NODE_ENV !== 'development');

app.use(compression());
app.use(securityHeaders(process.env.NOINDEX !== 'false'));
app.use('/stylesheets', express.static(path.join(__dirname, 'public', 'stylesheets')));
app.use('/', healthRouter);

// Playwright's CI run turns this on to check the error page against a real thrown error.
if (process.env.ERROR_TEST_ROUTE === 'true') {
  app.get('/_test/error', function(req) {
    var err = new Error('Forced test error');
    err.status = Number(req.query.status) || 500;
    throw err;
  });
}

app.use('/', indexRouter);

app.use(function(req, res) {
  res.sendStatus(404);
});

app.use(errorHandler);

module.exports = app;
