var crypto = require('crypto');
var { trace } = require('@opentelemetry/api');

var URL_ATTRIBUTES = ['url.full', 'http.url', 'http.target', 'url.original'];
var QUERY_ATTRIBUTES = ['url.query', 'url.fragment'];

// BR-23: names and phone numbers never reach telemetry. Express only sees page and file URLs, so the risk is a query
// string or fragment carrying one; they're dropped before export.
var redactUrls = {
  onStart: function() {},
  onEnd: function(span) {
    URL_ATTRIBUTES.forEach(function(name) {
      if (typeof span.attributes[name] === 'string') {
        span.attributes[name] = span.attributes[name].replace(/[?#].*$/, '');
      }
    });
    QUERY_ATTRIBUTES.forEach(function(name) {
      delete span.attributes[name];
    });
  },
  forceFlush: function() {
    return Promise.resolve();
  },
  shutdown: function() {
    return Promise.resolve();
  },
};

// Must run before express or http is required, so the http instrumentation can patch them. App Service sets
// APPLICATIONINSIGHTS_CONNECTION_STRING; without it (local runs, tests) nothing loads.
function startTelemetry(env, useAzureMonitor) {
  var connectionString = env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    return false;
  }
  env.OTEL_SERVICE_NAME ||= 'thad-the-barber-express';
  (useAzureMonitor || require('@azure/monitor-opentelemetry').useAzureMonitor)({
    azureMonitorExporterOptions: { connectionString: connectionString },
    spanProcessors: [redactUrls],
    instrumentationOptions: {
      azureSdk: { enabled: false },
      mongoDb: { enabled: false },
      mySql: { enabled: false },
      postgreSql: { enabled: false },
      redis: { enabled: false },
      redis4: { enabled: false },
      bunyan: { enabled: false },
      winston: { enabled: false },
    },
  });
  return true;
}

// The request itself is already traced with its status (404s included); this attaches the error as an exception.
function recordException(err) {
  trace.getActiveSpan()?.recordException(err);
}

// Shown on the error page for support. With telemetry on it's the trace ID, which App Insights calls the operation ID.
function requestId() {
  return trace.getActiveSpan()?.spanContext().traceId ?? crypto.randomBytes(16).toString('hex');
}

module.exports = { redactUrls, startTelemetry, recordException, requestId };
