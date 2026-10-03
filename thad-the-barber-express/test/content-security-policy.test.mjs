import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

var csp = createRequire(import.meta.url)('../lib/content-security-policy');
var sources = {
  'connect-src': ['https://api.example.com', 'https://centralus-2.in.applicationinsights.azure.com'],
  'img-src': ['https://media.example.com'],
};

function directive(policy, name) {
  var found = policy.split('; ').find(function(part) {
    return part.startsWith(name + ' ');
  });
  return found ? found.split(' ').slice(1) : [];
}

describe('content security policy', function() {
  it('creates a different 128-bit nonce each time', function() {
    var nonces = new Set(Array.from({ length: 50 }, csp.createNonce));
    expect(nonces.size).toBe(50);
    nonces.forEach(function(nonce) {
      expect(Buffer.from(nonce, 'base64')).toHaveLength(16);
    });
  });

  it('fills every nonce placeholder, including ngCspNonce', function() {
    var html = '<app-root ngcspnonce="CSP_NONCE"></app-root><script nonce="CSP_NONCE"></script><p>CSP_NONCE</p>';
    expect(csp.applyNonce(html, 'abc')).toBe('<app-root ngcspnonce="abc"></app-root><script nonce="abc"></script><p>CSP_NONCE</p>');
  });

  it('allows scripts and styles only by nonce', function() {
    var policy = csp.contentSecurityPolicy('abc', sources);
    expect(directive(policy, 'script-src')).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
    expect(directive(policy, 'style-src')).toEqual(["'self'", "'nonce-abc'"]);
    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
  });

  it("connects to the build's origins and reCAPTCHA", function() {
    expect(directive(csp.contentSecurityPolicy('abc', sources), 'connect-src')).toEqual([
      "'self'",
      'https://api.example.com',
      'https://centralus-2.in.applicationinsights.azure.com',
      'https://www.google.com/recaptcha/',
    ]);
  });

  it("loads images from the build's media host", function() {
    expect(directive(csp.contentSecurityPolicy('abc', sources), 'img-src')).toEqual(["'self'", 'data:', 'https://media.example.com']);
  });

  it('blocks framing, plugins and base or form hijacking', function() {
    var policy = csp.contentSecurityPolicy('abc', sources);
    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
  });

  it('allows style attributes only when the page has them, by hash', function() {
    var hashes = csp.styleAttributeHashes('<div style="color: red"></div><p style="color: red"></p>');
    // sha256 of "color: red", base64
    expect(hashes).toEqual(["'sha256-NerDAUWfwD31YdZHveMrq0GLjsNFMwxLpZl0dPUeCcw='"]);
    expect(directive(csp.contentSecurityPolicy('abc', sources, hashes), 'style-src-attr')).toEqual(["'unsafe-hashes'"].concat(hashes));
    expect(directive(csp.contentSecurityPolicy('abc', sources, []), 'style-src-attr')).toEqual([]);
  });

  it('hashes style attributes as the browser reads them, after entity decoding', function() {
    // sha256 of 'content: "a"', base64
    expect(csp.styleAttributeHashes('<i style="content: &quot;a&quot;"></i>')).toEqual(["'sha256-zjXjT0SWbrdip2Jv1iDlKGPfvI5lRNm7iSoS9kdyvoA='"]);
  });
});
