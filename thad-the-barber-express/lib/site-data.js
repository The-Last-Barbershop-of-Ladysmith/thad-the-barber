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

async function fetchReviews(apiOrigin) {
  try {
    return await fetchJson(apiOrigin + '/api/reviews');
  } catch (error) {
    console.error('Structured data: reading reviews failed:', error.message);
    return { testimonials: [], rating: null };
  }
}

// The shop's Square details and the reviews file, read from the API for the page's structured data. A copy younger
// than ten minutes is reused; an older one is served while a refresh runs. Until a first read succeeds the page waits
// for it (at most 3 seconds, shared by requests that arrive meanwhile) and a failed read is retried at most once a
// minute, so a down API costs one slow request a minute and the page goes out without structured data. The shop is
// required; with no reviews file the markup just has no rating.
function createSiteData(apiOrigin) {
  var latest = null;
  var latestAt = 0;
  var attemptedAt = 0;
  var refreshing = null;

  function refresh() {
    if (!refreshing) {
      attemptedAt = Date.now();
      refreshing = Promise.all([fetchJson(apiOrigin + '/api/shop'), fetchReviews(apiOrigin)])
        .then(function(results) {
          latest = { shop: results[0], reviews: results[1] };
          latestAt = Date.now();
        })
        .catch(function(error) {
          console.error('Structured data: reading the shop failed:', error.message);
        })
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
      if (refreshing || Date.now() - attemptedAt > RETRY_MILLISECONDS) {
        await refresh();
      }
    } else if (Date.now() - latestAt > FRESH_MILLISECONDS) {
      refresh();
    }
    return latest;
  };
}

module.exports = { createSiteData: createSiteData };
