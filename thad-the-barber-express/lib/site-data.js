var FRESH_MILLISECONDS = 10 * 60 * 1000;
var RETRY_MILLISECONDS = 60 * 1000;
var TIMEOUT_MILLISECONDS = 3000;

async function fetchJson(url) {
  var response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MILLISECONDS) });
  if (!response.ok) {
    throw new Error(url + ' answered ' + response.status);
  }
  return response.json();
}

// The shop's Square details and the reviews file, read from the API for the page's structured data. A copy younger
// than ten minutes is reused; an older one is served while a refresh runs, so a slow or down API never delays a page.
// Resolves to null until a first read succeeds, retrying at most once a minute.
function createSiteData(apiOrigin) {
  var latest = null;
  var latestAt = 0;
  var attemptedAt = 0;
  var refreshing = null;

  function refresh() {
    if (!refreshing) {
      attemptedAt = Date.now();
      refreshing = Promise.all([fetchJson(apiOrigin + '/api/shop'), fetchJson(apiOrigin + '/api/reviews')])
        .then(function(results) {
          latest = { shop: results[0], reviews: results[1] };
          latestAt = Date.now();
        })
        .catch(function() {})
        .finally(function() {
          refreshing = null;
        });
    }
    return refreshing;
  }

  return async function getSiteData() {
    if (!apiOrigin) {
      return null;
    }
    if (!latest) {
      if (Date.now() - attemptedAt > RETRY_MILLISECONDS) {
        await refresh();
      }
    } else if (Date.now() - latestAt > FRESH_MILLISECONDS) {
      refresh();
    }
    return latest;
  };
}

module.exports = { createSiteData: createSiteData };
