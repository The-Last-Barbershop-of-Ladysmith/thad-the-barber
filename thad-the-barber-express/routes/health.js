var express = require('express');
var fs = require('fs');
var path = require('path');

var router = express.Router();

// build-info.json is written by the build workflow; local runs have none.
function readBuildInfo() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build-info.json'), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { version: 'local', commit: 'local' };
    }
    throw err;
  }
}

var buildInfo = readBuildInfo();

// Same shape as the API's GET /api/health, so deploy checks read both the same way.
router.get('/healthz', function(req, res) {
  res.set('Cache-Control', 'no-store').json({ status: 'healthy', version: buildInfo.version, commit: buildInfo.commit });
});

module.exports = router;
