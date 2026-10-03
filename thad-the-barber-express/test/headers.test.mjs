import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

var require = createRequire(import.meta.url);
var dist = mkdtempSync(join(tmpdir(), 'ttb-dist-'));
var app;

beforeAll(function() {
  mkdirSync(join(dist, '404'));
  mkdirSync(join(dist, 'assets', 'frames'), { recursive: true });
  mkdirSync(join(dist, 'media'));
  writeFileSync(join(dist, 'index.html'), '<html><body>' + 'home '.repeat(500) + '</body></html>');
  writeFileSync(join(dist, '404', 'index.html'), 'not found');
  writeFileSync(join(dist, 'main-LDA72QPD.js'), 'console.log(1);');
  writeFileSync(join(dist, 'main.js'), 'console.log(1);');
  writeFileSync(join(dist, 'media', 'primeicons-S6ICFECY.eot'), 'font');
  writeFileSync(join(dist, 'assets', 'frames', '001.avif'), 'frame');
  writeFileSync(join(dist, 'favicon.ico'), 'icon');
  writeFileSync(join(dist, 'csp-sources.json'), '{}');
  process.env.ANGULAR_DIST_PATH = dist;
  delete process.env.NOINDEX;
  app = require('../app');
});

afterAll(function() {
  rmSync(dist, { recursive: true, force: true });
});

describe('security headers', function() {
  it.each(['/', '/main-LDA72QPD.js', '/nope', '/healthz'])('are on every response, like %s', async function(path) {
    var response = await request(app).get(path);
    expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toContain('camera=()');
  });

  it('lock down files with a CSP that allows nothing', async function() {
    var response = await request(app).get('/main-LDA72QPD.js');
    expect(response.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'");
  });

  it('give pages only their nonce-based CSP', async function() {
    var response = await request(app).get('/');
    expect(response.headers['content-security-policy']).toContain("script-src 'nonce-");
    expect(response.headers['content-security-policy']).not.toContain("default-src 'none'");
  });
});

describe('noindex', function() {
  var { securityHeaders } = require('../lib/security-headers');

  function appWith(noIndex) {
    return express().use(securityHeaders(noIndex)).get('/', function(req, res) {
      res.send('ok');
    });
  }

  it('is sent when NOINDEX is anything but "false", including unset', async function() {
    var response = await request(app).get('/main-LDA72QPD.js');
    expect(response.headers['x-robots-tag']).toBe('noindex');
  });

  it('is sent outside prod', async function() {
    expect((await request(appWith(true)).get('/')).headers['x-robots-tag']).toBe('noindex');
  });

  it('is left out in prod', async function() {
    expect((await request(appWith(false)).get('/')).headers['x-robots-tag']).toBeUndefined();
  });
});

describe('cache headers', function() {
  it.each(['/main-LDA72QPD.js', '/media/primeicons-S6ICFECY.eot'])('cache hashed file %s for a year', async function(path) {
    var response = await request(app).get(path);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('cache unhashed assets for a day', async function() {
    var response = await request(app).get('/assets/frames/001.avif');
    expect(response.headers['cache-control']).toBe('public, max-age=86400');
  });

  it.each(['/main.js', '/favicon.ico'])('revalidate other unhashed file %s every time', async function(path) {
    var response = await request(app).get(path);
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('never cache pages', async function() {
    var response = await request(app).get('/');
    expect(response.headers['cache-control']).toBe('no-cache');
  });
});

describe('compression', function() {
  it('compresses pages for clients that accept it', async function() {
    var response = await request(app).get('/').set('Accept-Encoding', 'gzip');
    expect(response.headers['content-encoding']).toBe('gzip');
  });
});

describe('GET /healthz', function() {
  it('reports the version and commit, and is never cached', async function() {
    var response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({ status: 'healthy', version: 'local', commit: 'local' });
  });
});
