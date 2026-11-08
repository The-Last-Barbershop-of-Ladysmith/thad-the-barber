import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

var fontPreload = createRequire(import.meta.url)('../lib/font-preload');
var LEGACY = '<link rel="preload" as="font" crossorigin="anonymous" href="/media/icons-ABCD1234.eot?#iefix">';
var HREFS = ['/media/display-latin-ABCD1234.woff2', '/media/body-latin-EFGH5678.woff2'];
var LINKS = '<link rel="preload" as="font" type="font/woff2" crossorigin href="/media/display-latin-ABCD1234.woff2">'
  + '<link rel="preload" as="font" type="font/woff2" crossorigin href="/media/body-latin-EFGH5678.woff2">';

describe('font preloads', function() {
  it('swaps the legacy font preload for the fonts the page uses, in the same place', function() {
    var html = '<head><title>t</title>' + LEGACY + '<style></style></head>';
    expect(fontPreload.applyFontPreloads(html, HREFS)).toBe('<head><title>t</title>' + LINKS + '<style></style></head>');
  });

  it('keeps the other preloads', function() {
    var other = '<link rel="preload" as="image" href="/media/hero.avif">';
    expect(fontPreload.applyFontPreloads('<head>' + other + LEGACY + '</head>', HREFS)).toBe('<head>' + other + LINKS + '</head>');
  });

  it('puts the links at the end of the head on a page with no legacy preload', function() {
    var html = '<head><title>t</title></head><body></body>';
    expect(fontPreload.applyFontPreloads(html, HREFS)).toBe('<head><title>t</title>' + LINKS + '</head><body></body>');
  });
});
