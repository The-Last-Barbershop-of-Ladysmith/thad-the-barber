import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

var dist = mkdtempSync(join(tmpdir(), 'ttb-dist-'));
var app;

// Stands in for the Angular server bundle, which decides each page's body and status.
var fakeServer = `
export async function reqHandler(req, res, next) {
  if (req.url === '/skip') {
    return next();
  }
  res.statusCode = req.url === '/missing' ? 404 : 200;
  res.end('rendered ' + req.url);
}
`;

beforeAll(function() {
  mkdirSync(join(dist, 'browser', 'assets'), { recursive: true });
  mkdirSync(join(dist, 'server'));
  writeFileSync(join(dist, 'browser', 'index.html'), 'prerendered home');
  writeFileSync(join(dist, 'browser', 'assets', 'app.css'), 'body {}');
  writeFileSync(join(dist, 'server', 'server.mjs'), fakeServer);
  process.env.ANGULAR_DIST_PATH = dist;
  app = createRequire(import.meta.url)('../app');
});

afterAll(function() {
  rmSync(dist, { recursive: true, force: true });
});

describe('page routes', function() {
  it('lets Angular render the home page', async function() {
    var response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('rendered /');
  });

  it('passes on the status Angular sets', async function() {
    var response = await request(app).get('/missing');
    expect(response.status).toBe(404);
    expect(response.text).toBe('rendered /missing');
  });

  it('falls through to a bare 404 when Angular has no page', async function() {
    var response = await request(app).get('/skip');
    expect(response.status).toBe(404);
  });

  it('serves static files', async function() {
    var response = await request(app).get('/assets/app.css');
    expect(response.status).toBe(200);
  });

  it('never serves the raw HTML files', async function() {
    var response = await request(app).get('/index.html');
    expect(response.status).toBe(404);
    expect(response.text).not.toBe('prerendered home');
  });

  it('returns a bare 404 for missing files', async function() {
    var response = await request(app).get('/assets/missing.css');
    expect(response.status).toBe(404);
    expect(response.text).not.toContain('rendered');
  });
});
