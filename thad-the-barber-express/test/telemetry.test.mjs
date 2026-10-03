import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

var telemetry = createRequire(import.meta.url)('../lib/telemetry');

describe('startTelemetry', function() {
  it('loads nothing without a connection string', function() {
    var useAzureMonitor = vi.fn();
    expect(telemetry.startTelemetry({}, useAzureMonitor)).toBe(false);
    expect(useAzureMonitor).not.toHaveBeenCalled();
  });

  it('starts Azure Monitor with the connection string and the URL redaction', function() {
    var useAzureMonitor = vi.fn();
    var env = { APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc' };

    expect(telemetry.startTelemetry(env, useAzureMonitor)).toBe(true);

    var options = useAzureMonitor.mock.calls[0][0];
    expect(options.azureMonitorExporterOptions.connectionString).toBe('InstrumentationKey=abc');
    expect(options.spanProcessors).toEqual([telemetry.redactUrls]);
  });

  it('keeps only the http instrumentation, which traces requests', function() {
    var useAzureMonitor = vi.fn();
    telemetry.startTelemetry({ APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc' }, useAzureMonitor);

    var instrumentations = useAzureMonitor.mock.calls[0][0].instrumentationOptions;
    expect(instrumentations.http).toBeUndefined();
    Object.values(instrumentations).forEach(function(config) {
      expect(config.enabled).toBe(false);
    });
  });

  it('names the service unless App Service already did', function() {
    var env = { APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc' };
    telemetry.startTelemetry(env, vi.fn());
    expect(env.OTEL_SERVICE_NAME).toBe('thad-the-barber-express');

    var named = { APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc', OTEL_SERVICE_NAME: 'web' };
    telemetry.startTelemetry(named, vi.fn());
    expect(named.OTEL_SERVICE_NAME).toBe('web');
  });
});

describe('redactUrls', function() {
  it('drops query strings and fragments from every URL attribute', function() {
    var span = {
      attributes: {
        'url.full': 'https://site/book?name=Jo&phone=5405550100#top',
        'http.url': 'https://site/book?phone=5405550100',
        'http.target': '/book?name=Jo',
        'url.original': '/book#details',
        'url.query': 'name=Jo',
        'url.fragment': 'details',
        'url.path': '/book',
        'http.response.status_code': 404,
      },
    };

    telemetry.redactUrls.onEnd(span);

    expect(span.attributes).toEqual({
      'url.full': 'https://site/book',
      'http.url': 'https://site/book',
      'http.target': '/book',
      'url.original': '/book',
      'url.path': '/book',
      'http.response.status_code': 404,
    });
  });

  it('leaves spans without URLs alone', function() {
    var span = { attributes: { 'http.response.status_code': 200 } };
    telemetry.redactUrls.onEnd(span);
    expect(span.attributes).toEqual({ 'http.response.status_code': 200 });
  });
});

describe('recordException', function() {
  it('does nothing when no request is being traced', function() {
    expect(function() {
      telemetry.recordException(new Error('boom'));
    }).not.toThrow();
  });
});
