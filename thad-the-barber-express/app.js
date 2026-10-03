var compression = require('compression');
var express = require('express');
var path = require('path');

var { securityHeaders } = require('./lib/security-headers');
var { recordException } = require('./lib/telemetry');
var healthRouter = require('./routes/health');
var indexRouter = require('./routes/index');

var app = express();

// Pages carry a per-request CSP nonce, so an ETag would only invite a cached copy with a stale one.
app.set('etag', false);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(compression());
app.use(securityHeaders(process.env.NOINDEX !== 'false'));
app.use('/', healthRouter);
app.use('/', indexRouter);

app.use(function(req, res) {
  res.sendStatus(404);
});

// error handler
app.use(function(err, req, res, next) {
  recordException(err);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
