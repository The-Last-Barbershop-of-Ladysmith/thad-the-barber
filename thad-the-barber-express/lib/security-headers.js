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

// Pages send their own nonce-based CSP (routes/index.js), so helmet's is off. NOINDEX is an App Service setting,
// "false" only in prod; anywhere else, including local runs, search engines are told to stay away.
function securityHeaders(noIndex) {
  var headers = helmet({
    contentSecurityPolicy: false,
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
