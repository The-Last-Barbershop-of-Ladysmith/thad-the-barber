import { createRequire } from 'node:module';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeDist } from './fake-dist.mjs';

var require = createRequire(import.meta.url);
var { errorPage } = require('../lib/error-page');
var fakeDist;
var app;

function appThatThrows(showDetails) {
  return express()
    .set('views', join(import.meta.dirname, '..', 'views'))
    .set('view engine', 'ejs')
    .get('/boom', function() {
      throw new Error('Kaboom at the chair');
    })
    .use(errorPage(showDetails));
}

beforeAll(function() {
  process.env.ERROR_TEST_ROUTE = 'true';
  fakeDist = createFakeDist({
    'index.html': 'home',
    '404/index.html': 'not found',
    'csp-sources.json': '{}',
  });
  app = fakeDist.app;
});

afterAll(function() {
  delete process.env.ERROR_TEST_ROUTE;
  fakeDist.cleanup();
});

describe('error page', function() {
  it('renders the themed page with the status and a request ID, no details, a strict CSP and no caching', async function() {
    var response = await request(app).get('/_test/error');
    expect(response.status).toBe(500);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('<h1>Something went wrong</h1>');
    expect(response.text).toContain('href="/brand.css"');
    expect(response.text).toMatch(/data-testid="error-request-id">[0-9a-f]{32}</);
    expect(response.text).not.toContain('Forced test error');
    expect(response.text).not.toContain('error-details');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'none'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([502, 503])('keeps a %s status', async function(status) {
    var response = await request(app).get('/_test/error?status=' + status);
    expect(response.status).toBe(status);
    expect(response.text).toContain('Error ' + status);
  });

  it('shows the error details with the stack trace in development', async function() {
    var response = await request(appThatThrows(true)).get('/boom');
    expect(response.text).toContain('data-testid="error-details"');
    expect(response.text).toContain('Error: Kaboom at the chair');
    expect(response.text).toMatch(/at .*error-page\.test\.mjs/);
  });

  it('retries the same URL, escaped', async function() {
    var response = await request(appThatThrows(false)).get('/boom?x="><script>');
    expect(response.text).toContain('href="/boom?x=%22%3E%3Cscript%3E"');
  });

  it.each(['//evil.example/%E0', '/\\evil.example/%E0'])('never retries %s, which points at another site', async function(path) {
    var response = await request(app).get(path);
    expect(response.status).toBe(400);
    expect(response.text).toContain('href="/" data-testid="error-retry"');
  });

  it('serves its stylesheet', async function() {
    var response = await request(app).get('/stylesheets/error.css');
    expect(response.status).toBe(200);
    expect(response.text).toContain('var(--p-primary-color)');
  });
});
