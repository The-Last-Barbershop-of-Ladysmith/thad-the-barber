var express = require('express');
var path = require('path');

var router = express.Router();

var angularDist = path.resolve(process.env.ANGULAR_DIST_PATH || path.join(__dirname, '..', 'public', 'app'));

router.use(express.static(angularDist, { redirect: false }));

// Prerendered pages are <route>/index.html; any other page gets the client-rendered shell and Angular's router.
router.get('/{*splat}', function(req, res, next) {
  if (path.extname(req.path)) {
    return next();
  }
  res.sendFile(path.join(req.path, 'index.html'), { root: angularDist }, function(err) {
    if (!err) {
      return;
    }
    if (err.status !== 404 || res.headersSent) {
      return next(err);
    }
    res.sendFile('index.csr.html', { root: angularDist });
  });
});

module.exports = router;
