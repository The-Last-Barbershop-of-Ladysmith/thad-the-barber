import { createRequire } from 'node:module';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeDist } from './fake-dist.mjs';

var CANONICAL_HOME = '<html><head><link rel="canonical" href="https://fake-shop.example/"></head><body>home</body></html>';
var fakeDist;
var robotsTxt;

beforeAll(function() {
  fakeDist = createFakeDist({
    'index.html': CANONICAL_HOME,
    '404/index.html': 'not found',
    'csp-sources.json': '{}',
    'sitemap.xml': '<urlset/>',
  });
  robotsTxt = createRequire(import.meta.url)('../routes/robots').robotsTxt;
});

afterAll(function() {
  fakeDist.cleanup();
  delete process.env.NOINDEX;
});

describe('robots.txt', function() {
  it('disallows everything outside prod, with no sitemap', function() {
    var text = robotsTxt(true, CANONICAL_HOME);
    expect(text).toContain('Disallow: /\n');
    expect(text).not.toContain('Sitemap');
  });

  it('allows everything in prod and points to the sitemap on the home page address', function() {
    var text = robotsTxt(false, CANONICAL_HOME);
    expect(text).toContain('Allow: /');
    expect(text).not.toContain('Disallow');
    expect(text).toContain('Sitemap: https://fake-shop.example/sitemap.xml');
  });

  it('leaves the sitemap line out when the home page has no canonical address', function() {
    expect(robotsTxt(false, '<html><body>home</body></html>')).not.toContain('Sitemap');
  });

  it('is served as plain text, disallowing everything unless NOINDEX is "false"', async function() {
    delete process.env.NOINDEX;
    var response = await request(fakeDist.app).get('/robots.txt');
    expect(response.type).toBe('text/plain');
    expect(response.text).toContain('Disallow: /');
  });

  it('is served allowing everything when NOINDEX is "false"', async function() {
    process.env.NOINDEX = 'false';
    var response = await request(fakeDist.app).get('/robots.txt');
    expect(response.text).toContain('Allow: /');
  });
});

describe('sitemap.xml', function() {
  it('is served from the build', async function() {
    var response = await request(fakeDist.app).get('/sitemap.xml');
    expect(response.status).toBe(200);
    expect(response.text).toBe('<urlset/>');
  });
});
