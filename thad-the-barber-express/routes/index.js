var express = require('express');
var path = require('path');
var { pathToFileURL } = require('url');

var router = express.Router();

var angularDist = path.resolve(process.env.ANGULAR_DIST_PATH || path.join(__dirname, '..', 'public', 'app'));
var angularServer;

router.use(express.static(path.join(angularDist, 'browser'), { index: false, redirect: false }));

// Angular's engine decides every page: prerendered, client shell, or server-rendered with its own status (404s too).
router.use(function(req, res, next) {
  if (path.extname(req.path)) {
    return next();
  }
  angularServer ??= import(pathToFileURL(path.join(angularDist, 'server', 'server.mjs')).href);
  angularServer
    .then(function(server) {
      return server.reqHandler(req, res, next);
    })
    .catch(next);
});

module.exports = router;
