var helmet = require('helmet');

var PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
].join(', ');

// Every response gets a CSP that allows nothing, so a file opened directly (an SVG, say) can't run anything. Pages
// replace it with their nonce-based policy (routes/index.js). NOINDEX is an App Service setting, "false" only in prod;
// anywhere else, including local runs, search engines are told to stay away.
function securityHeaders(noIndex) {
  var headers = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
  return function(req, res, next) {
    res.set('Permissions-Policy', PERMISSIONS_POLICY);
    if (noIndex) {
      res.set('X-Robots-Tag', 'noindex');
    }
    headers(req, res, next);
  };
}

module.exports = { securityHeaders };
