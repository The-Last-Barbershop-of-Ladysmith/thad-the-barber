// Angular's build preloads the first file of each critical @font-face, which for PrimeIcons is the legacy .eot that no
// current browser uses. It competes for bandwidth with the fonts the page does use.
var LEGACY_FONT_PRELOAD = /<link rel="preload" as="font"[^>]*\.eot[^>]*>/;

// Swaps that preload for preloads of the fonts the page uses (font-preloads.json, written by the UI's post-build hook,
// since the file names are hashed). The client-rendered app shell has no such preload, so its links go at the end of
// the head.
function applyFontPreloads(html, fontHrefs) {
  var links = fontHrefs.map(function(href) {
    return '<link rel="preload" as="font" type="font/woff2" crossorigin href="' + href + '">';
  }).join('');
  if (LEGACY_FONT_PRELOAD.test(html)) {
    return html.replace(LEGACY_FONT_PRELOAD, links);
  }
  return html.replace('</head>', links + '</head>');
}

module.exports = { applyFontPreloads: applyFontPreloads };
