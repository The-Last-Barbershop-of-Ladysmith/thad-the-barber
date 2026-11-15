import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

var { buildHairSalon, canonicalUrlOf, injectJsonLd } = createRequire(import.meta.url)('../lib/structured-data');

var SHOP = {
  name: 'Made-Up Cuts <&> Co',
  phone: '+15550100000',
  address: { street: '1 Test Lane', city: 'Testville', state: 'ZZ', postalCode: '00000-1234' },
  hours: [
    { day: 0, opens: '09:30:00', closes: '13:00:00' },
    { day: 6, opens: '08:00:00', closes: '17:45:00' },
  ],
  instagramUsername: 'made_up_cuts',
  facebookUrl: 'https://facebook.example/made-up-cuts',
};
var REVIEWS = { testimonials: [], rating: { score: 4.7, count: 12, url: 'https://listing.example/made-up' } };
var PAGE_URL = 'https://site.example/';

describe('buildHairSalon', function() {
  it('maps Square details to a HairSalon', function() {
    var hairSalon = buildHairSalon(SHOP, REVIEWS, PAGE_URL);
    expect(hairSalon['@type']).toBe('HairSalon');
    expect(hairSalon.url).toBe(PAGE_URL);
    expect(hairSalon.telephone).toBe('+15550100000');
    expect(hairSalon.address.postalCode).toBe('00000-1234');
  });

  it('names the weekday and trims seconds from each opening time', function() {
    var hours = buildHairSalon(SHOP, REVIEWS, PAGE_URL).openingHoursSpecification;
    expect(hours).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '09:30', closes: '13:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '08:00', closes: '17:45' },
    ]);
  });

  it('lists the socials and the listing link, and the rating', function() {
    var hairSalon = buildHairSalon(SHOP, REVIEWS, PAGE_URL);
    expect(hairSalon.sameAs).toEqual([
      'https://www.instagram.com/made_up_cuts',
      'https://facebook.example/made-up-cuts',
      'https://listing.example/made-up',
    ]);
    expect(hairSalon.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.7, reviewCount: 12 });
  });

  it('leaves out what Square and the reviews file do not hold', function() {
    var bare = { ...SHOP, instagramUsername: null, facebookUrl: null, hours: [] };
    var hairSalon = buildHairSalon(bare, { testimonials: [], rating: null }, PAGE_URL);
    expect(hairSalon).not.toHaveProperty('sameAs');
    expect(hairSalon).not.toHaveProperty('aggregateRating');
    expect(hairSalon.openingHoursSpecification).toEqual([]);
  });
});

describe('canonicalUrlOf', function() {
  it('reads the canonical link', function() {
    expect(canonicalUrlOf('<head><link rel="canonical" href="https://site.example/"></head>')).toBe('https://site.example/');
  });

  it('is null on a page with no canonical link', function() {
    expect(canonicalUrlOf('<head></head>')).toBeNull();
  });
});

describe('injectJsonLd', function() {
  it('puts the data in the head and cannot be closed early by a value', function() {
    var html = injectJsonLd('<head></head><body></body>', buildHairSalon({ ...SHOP, name: '</script><b>' }, REVIEWS, PAGE_URL));
    expect(html).toMatch(/<script type="application\/ld\+json">.*<\/script><\/head>/);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});
