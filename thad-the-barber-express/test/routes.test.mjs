import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeDist } from './fake-dist.mjs';

var fakeDist;
var app;

function page(name) {
  return '<html><body><app-root ngcspnonce="CSP_NONCE"></app-root><script nonce="CSP_NONCE"></script>' + name + '</body></html>';
}

function headerNonce(response) {
  return /'nonce-([^']+)'/.exec(response.headers['content-security-policy'])[1];
}

beforeAll(function() {
  fakeDist = createFakeDist({
    'index.html': page('home'),
    'index.csr.html': page('shell'),
    '404/index.html': page('not found'),
    'assets/app.css': 'body {}',
    'csp-sources.json': JSON.stringify({
      'connect-src': ['https://api.example.com'],
      'img-src': ['https://media.example.com'],
    }),
  });
  app = fakeDist.app;
});

afterAll(function() {
  fakeDist.cleanup();
});

describe('pages', function() {
  it('serves a prerendered page', async function() {
    var response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('home');
  });

  it.each(['/book', '/book/'])('serves the app shell for the client route %s', async function(path) {
    var response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.text).toContain('shell');
  });

  // /_test/error only exists with ERROR_TEST_ROUTE=true (error-page.test.mjs).
  it.each(['/nope', '/book/extra', '/404', '/../../etc', '/_test/error'])('serves the not-found page with a 404 for %s', async function(path) {
    var response = await request(app).get(path);
    expect(response.status).toBe(404);
    expect(response.text).toContain('not found');
  });

  it('never serves the raw HTML files or the CSP sources', async function() {
    for (var path of ['/index.html', '/index.csr.html', '/404/index.html', '/csp-sources.json']) {
      var response = await request(app).get(path);
      expect(response.status, path).toBe(404);
      expect(response.text, path).not.toContain('CSP_NONCE');
    }
  });
});

describe('page CSP', function() {
  it('fills every placeholder with the nonce from the header', async function() {
    var response = await request(app).get('/');
    var nonce = headerNonce(response);
    expect(response.text).not.toContain('CSP_NONCE');
    expect(response.text).toContain('ngcspnonce="' + nonce + '"');
    expect(response.text).toContain('<script nonce="' + nonce + '">');
  });

  it('uses a new nonce for every request, on every page type', async function() {
    var nonces = new Set();
    for (var path of ['/', '/', '/book', '/nope']) {
      nonces.add(headerNonce(await request(app).get(path)));
    }
    expect(nonces.size).toBe(4);
  });

  it('is never cached', async function() {
    var response = await request(app).get('/');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers.etag).toBeUndefined();
  });

  it('takes its API and media origins from the build', async function() {
    var policy = (await request(app).get('/')).headers['content-security-policy'];
    expect(policy).toContain("connect-src 'self' https://api.example.com");
    expect(policy).toContain("img-src 'self' data: https://media.example.com");
  });
});

describe('static files', function() {
  it('serves them', async function() {
    var response = await request(app).get('/assets/app.css');
    expect(response.status).toBe(200);
  });

  it('returns a bare 404 for missing ones', async function() {
    var response = await request(app).get('/assets/missing.css');
    expect(response.status).toBe(404);
    expect(response.text).not.toContain('not found</body>');
  });
});
