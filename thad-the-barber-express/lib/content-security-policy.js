var crypto = require('crypto');

var NONCE_PLACEHOLDER = /(nonce=")CSP_NONCE(")/gi;
var STYLE_ATTRIBUTE = /\sstyle="([^"]*)"/g;
var HTML_ENTITY = /&(amp|quot|#39|lt|gt);/g;
var HTML_ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

function createNonce() {
  return crypto.randomBytes(16).toString('base64');
}

// Fills the Angular build's CSP_NONCE placeholder in ngCspNonce and every nonce attribute.
function applyNonce(html, nonce) {
  return html.replace(NONCE_PLACEHOLDER, '$1' + nonce + '$2');
}

// Prerendered pages keep style attributes from component bindings (PrimeNG's carousel). A nonce can't cover
// attributes, so the policy allows exactly these values by hash until Angular takes over and sets styles from script.
function styleAttributeHashes(html) {
  var values = new Set();
  for (var match of html.matchAll(STYLE_ATTRIBUTE)) {
    values.add(match[1].replace(HTML_ENTITY, function(entity) {
      return HTML_ENTITIES[entity];
    }));
  }
  return Array.from(values, function(value) {
    return "'sha256-" + crypto.createHash('sha256').update(value).digest('base64') + "'";
  });
}

// sources is the build's csp-sources.json: the environment's API, App Insights and media origins.
function contentSecurityPolicy(nonce, sources, styleHashes) {
  var directives = {
    'default-src': ["'self'"],
    'script-src': ["'nonce-" + nonce + "'", "'strict-dynamic'"],
    'style-src': ["'self'", "'nonce-" + nonce + "'"],
    'img-src': ["'self'", 'data:'].concat(sources['img-src'] || []),
    'connect-src': ["'self'"].concat(sources['connect-src'] || [], 'https://www.google.com/recaptcha/'),
    'frame-src': [
      'https://maps.google.com/maps',
      'https://www.google.com/maps/',
      'https://www.google.com/recaptcha/',
      'https://recaptcha.google.com/recaptcha/',
    ],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  if (styleHashes && styleHashes.length > 0) {
    directives['style-src-attr'] = ["'unsafe-hashes'"].concat(styleHashes);
  }
  return Object.entries(directives).map(function([name, values]) {
    return name + ' ' + values.join(' ');
  }).join('; ');
}

module.exports = { createNonce, applyNonce, styleAttributeHashes, contentSecurityPolicy };
