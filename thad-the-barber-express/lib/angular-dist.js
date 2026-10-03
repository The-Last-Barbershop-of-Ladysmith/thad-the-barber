var path = require('path');

// The Angular build Express serves, with the csp-sources.json, brand.css and shop.json its post-build hook writes.
// Tests point ANGULAR_DIST_PATH at a fake build.
module.exports = path.resolve(process.env.ANGULAR_DIST_PATH || path.join(__dirname, '..', 'public', 'app', 'thad-the-barber-ui'));
