var express = require('express');
var fs = require('fs');
var path = require('path');
var angularDist = require('../lib/angular-dist');
var csp = require('../lib/content-security-policy');

var router = express.Router();

var cspSources = JSON.parse(fs.readFileSync(path.join(angularDist, 'csp-sources.json'), 'utf8'));
var cspHeader = process.env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

// Client-rendered routes, served the app shell with a 200. Prerendered pages need no entry: their file is the route.
// #58: once /book is prerendered, remove it here.
var clientRoutes = new Set(['/book']);

var ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
var ONE_DAY_SECONDS = 24 * 60 * 60;
// Angular's output hashing names files like main-LDA72QPD.js or media/primeicons-S6ICFECY.eot.
var HASHED_FILE = /-[A-Z0-9]{8}\.[a-z0-9]+$/;

// Hashed files never change under their name. Unhashed images and frames under assets/ can wait a day for an update;
// anything else unhashed (favicon, a development build's main.js) is checked on every use.
function cacheControl(res, filePath) {
  if (HASHED_FILE.test(path.basename(filePath))) {
    res.set('Cache-Control', 'public, max-age=' + ONE_YEAR_SECONDS + ', immutable');
  } else if (path.relative(angularDist, filePath).split(path.sep)[0] === 'assets') {
    res.set('Cache-Control', 'public, max-age=' + ONE_DAY_SECONDS);
  } else {
    res.set('Cache-Control', 'no-cache');
  }
}

var serveStatic = express.static(angularDist, { index: false, redirect: false, setHeaders: cacheControl });

// HTML only goes out through sendPage, which fills in the CSP nonce; the raw files carry a placeholder.
router.use(function(req, res, next) {
  if (path.extname(req.path) === '.html' || req.path === '/csp-sources.json') {
    return next();
  }
  serveStatic(req, res, next);
});

function loadPage(file) {
  var html = fs.readFileSync(path.join(angularDist, file), 'utf8');
  return { html: html, styleHashes: csp.styleAttributeHashes(html) };
}

function routeOf(file) {
  var dir = path.dirname(file);
  return dir === '.' ? '/' : '/' + dir.split(path.sep).join('/');
}

// The build never changes while the server runs, so every page is read and hashed once.
var pages = new Map(fs.readdirSync(angularDist, { recursive: true })
  .filter(function(file) {
    return path.basename(file) === 'index.html' && routeOf(file) !== '/404';
  })
  .map(function(file) {
    return [routeOf(file), loadPage(file)];
  }));
var appShell = fs.existsSync(path.join(angularDist, 'index.csr.html')) ? loadPage('index.csr.html') : null;
var notFoundPage = loadPage(path.join('404', 'index.html'));

// Every HTML response gets a fresh nonce and the matching header, and is never cached, which would replay a nonce.
function sendPage(res, status, page) {
  var nonce = csp.createNonce();
  res.removeHeader('Content-Security-Policy');
  res.status(status)
    .set(cspHeader, csp.contentSecurityPolicy(nonce, cspSources, page.styleHashes))
    .set('Cache-Control', 'no-cache')
    .type('html')
    .send(csp.applyNonce(page.html, nonce));
}

router.get('/{*splat}', function(req, res, next) {
  if (path.extname(req.path)) {
    return next();
  }
  var route = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  if (pages.has(route)) {
    return sendPage(res, 200, pages.get(route));
  }
  if (appShell && clientRoutes.has(route)) {
    return sendPage(res, 200, appShell);
  }
  sendPage(res, 404, notFoundPage);
});

module.exports = router;
