import { createRequire } from 'node:module';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeDist } from './fake-dist.mjs';

var SHOP = {
  name: 'Made-Up Cuts',
  phone: '+15550100000',
  address: { street: '1 Test Lane', city: 'Testville', state: 'ZZ', postalCode: '00000' },
  hours: [{ day: 3, opens: '10:00:00', closes: '18:00:00' }],
  instagramUsername: null,
  facebookUrl: null,
};
var REVIEWS = { testimonials: [], rating: { score: 5, count: 3, url: null } };
var INDEXED_HOME = '<html><head><link rel="canonical" href="https://site.example/"></head><body>home</body></html>';
var HIDDEN_HOME = '<html><head></head><body>home</body></html>';

function answerWith(shop, reviews) {
  vi.stubGlobal('fetch', vi.fn(async function(url) {
    var body = url.endsWith('/api/shop') ? shop : reviews;
    return { ok: body !== null, status: body === null ? 503 : 200, json: async function() { return body; } };
  }));
}

// The app and its cached API copy live in the require cache, so each test starts it fresh.
function forgetApp() {
  var cache = createRequire(import.meta.url).cache;
  Object.keys(cache)
    .filter(function(file) {
      return !file.includes('node_modules');
    })
    .forEach(function(file) {
      delete cache[file];
    });
}

async function homeFrom(html) {
  forgetApp();
  process.env.API_ORIGIN = 'https://api.example';
  var fakeDist = createFakeDist({
    'index.html': html,
    '404/index.html': 'not found',
    'csp-sources.json': '{}',
  });
  var response = await request(fakeDist.app).get('/');
  fakeDist.cleanup();
  return response;
}

afterEach(function() {
  vi.unstubAllGlobals();
});

describe('home page structured data', function() {
  it('is added to an indexed page from the API', async function() {
    answerWith(SHOP, REVIEWS);
    var response = await homeFrom(INDEXED_HOME);
    var json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(response.text)[1];
    expect(JSON.parse(json).name).toBe('Made-Up Cuts');
  });

  it('is left off a page with no canonical link, without calling the API', async function() {
    answerWith(SHOP, REVIEWS);
    var response = await homeFrom(HIDDEN_HOME);
    expect(response.text).not.toContain('ld+json');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is left off, and the page still served, when the API fails', async function() {
    answerWith(null, null);
    var response = await homeFrom(INDEXED_HOME);
    expect(response.status).toBe(200);
    expect(response.text).not.toContain('ld+json');
  });
});
