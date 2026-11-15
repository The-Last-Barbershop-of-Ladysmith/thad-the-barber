var express = require('express');
var fs = require('fs');
var path = require('path');
var angularDist = require('../lib/angular-dist');
var structuredData = require('../lib/structured-data');

var router = express.Router();

// Prod allows everything and names its sitemap, at the address the prerendered home page gives itself. Anywhere else
// (NOINDEX, as in lib/security-headers.js) crawlers are told to stay out.
function robotsTxt(isNoIndex, homeHtml) {
  if (isNoIndex) {
    return 'User-agent: *\nDisallow: /\n';
  }
  var lines = ['User-agent: *', 'Allow: /'];
  var homeUrl = structuredData.canonicalUrlOf(homeHtml);
  if (homeUrl) {
    lines.push('Sitemap: ' + new URL('/sitemap.xml', homeUrl).href);
  }
  return lines.join('\n') + '\n';
}

// The build never changes while the server runs, so the home page is read once.
var homeHtml = fs.readFileSync(path.join(angularDist, 'index.html'), 'utf8');

router.get('/robots.txt', function(req, res) {
  res.type('text/plain').set('Cache-Control', 'no-cache').send(robotsTxt(process.env.NOINDEX !== 'false', homeHtml));
});

module.exports = router;
module.exports.robotsTxt = robotsTxt;
