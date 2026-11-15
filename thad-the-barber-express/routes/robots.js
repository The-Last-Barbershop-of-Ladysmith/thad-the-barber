var express = require('express');
var fs = require('fs');
var path = require('path');
var angularDist = require('../lib/angular-dist');
var { isNoIndex } = require('../lib/security-headers');
var structuredData = require('../lib/structured-data');

var router = express.Router();

// Prod allows everything and names its sitemap, at the address the prerendered home page gives itself. Anywhere else
// (see isNoIndex) crawlers are told to stay out.
function robotsTxt(isNoIndexed, sitemapUrl) {
  if (isNoIndexed) {
    return 'User-agent: *\nDisallow: /\n';
  }
  var lines = ['User-agent: *', 'Allow: /'];
  if (sitemapUrl) {
    lines.push('Sitemap: ' + sitemapUrl);
  }
  return lines.join('\n') + '\n';
}

// The build never changes while the server runs, so the address is read once.
var homeUrl = structuredData.canonicalUrlOf(fs.readFileSync(path.join(angularDist, 'index.html'), 'utf8'));
var sitemapUrl = homeUrl ? new URL('/sitemap.xml', homeUrl).href : null;

router.get('/robots.txt', function(req, res) {
  res.type('text/plain').set('Cache-Control', 'no-cache').send(robotsTxt(isNoIndex(), sitemapUrl));
});

module.exports = router;
module.exports.robotsTxt = robotsTxt;
