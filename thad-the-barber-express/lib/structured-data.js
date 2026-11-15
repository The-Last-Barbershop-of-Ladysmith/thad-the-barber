var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var CANONICAL_LINK = /<link\b[^>]*\brel="canonical"[^>]*>/;
var HREF = /\bhref="([^"]+)"/;

function isNonEmpty(value) {
  return value !== null && value !== undefined && value !== '';
}

function withoutEmptyValues(object) {
  return Object.fromEntries(Object.entries(object).filter(function(entry) {
    return isNonEmpty(entry[1]);
  }));
}

function isUsableDay(hours) {
  return DAY_NAMES[hours.day] !== undefined && typeof hours.opens === 'string' && typeof hours.closes === 'string';
}

function hoursOf(openingHours) {
  return openingHours.filter(isUsableDay).map(function(hours) {
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_NAMES[hours.day],
      opens: hours.opens.slice(0, 5),
      closes: hours.closes.slice(0, 5),
    };
  });
}

function profileLinksOf(shop, reviews) {
  var links = [];
  if (shop.instagramUsername) {
    links.push('https://www.instagram.com/' + shop.instagramUsername);
  }
  if (shop.facebookUrl) {
    links.push(shop.facebookUrl);
  }
  if (reviews.rating && reviews.rating.url) {
    links.push(reviews.rating.url);
  }
  return links;
}

// The HairSalon (a LocalBusiness) Google reads for the shop's hours, rating and location in search results. Every
// field comes from Square (/api/shop) and the owner's reviews file (/api/reviews); a field Square doesn't hold is left
// out rather than guessed.
function buildHairSalon(shop, reviews, pageUrl) {
  var hairSalon = withoutEmptyValues({
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: shop.name,
    url: pageUrl,
    telephone: shop.phone,
    address: withoutEmptyValues({
      '@type': 'PostalAddress',
      streetAddress: shop.address.street,
      addressLocality: shop.address.city,
      addressRegion: shop.address.state,
      postalCode: shop.address.postalCode,
    }),
    openingHoursSpecification: hoursOf(shop.hours),
  });
  var sameAs = profileLinksOf(shop, reviews);
  if (sameAs.length > 0) {
    hairSalon.sameAs = sameAs;
  }
  if (reviews.rating) {
    hairSalon.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviews.rating.score,
      reviewCount: reviews.rating.count,
    };
  }
  return hairSalon;
}

// Only an indexed page has a canonical link (the UI's SeoService), so a nonprod build never gets structured data.
function canonicalUrlOf(html) {
  var link = CANONICAL_LINK.exec(html);
  var href = link ? HREF.exec(link[0]) : null;
  return href ? href[1] : null;
}

// "<" is escaped so a value can never close the script element, and a replacer function keeps "$&" and the like in a value
// from being read as replacement patterns.
function injectJsonLd(html, data) {
  var json = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace('</head>', function() {
    return '<script type="application/ld+json">' + json + '</script></head>';
  });
}

module.exports = { buildHairSalon: buildHairSalon, canonicalUrlOf: canonicalUrlOf, injectJsonLd: injectJsonLd };
