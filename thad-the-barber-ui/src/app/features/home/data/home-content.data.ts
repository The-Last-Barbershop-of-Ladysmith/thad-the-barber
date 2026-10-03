import { GalleryPhoto, HomeContent } from '../models/home.models';

/** Seed content from the wireframe. HomeContentService serves this until a CMS/API exists. */
export const HOME_CONTENT: HomeContent = {
  announcements: [
    {
      id: 'text-alerts',
      tag: 'Stay in the loop',
      date: 'Always on',
      title: 'Get the latest by text',
      body: 'Drop your number for openings, holiday hours and specials. No spam, just the news that matters.',
      signup: true,
    },
    {
      id: 'back-to-school',
      tag: 'Special',
      date: 'Thru Sep 30',
      title: 'Back-to-school cuts',
      body: '$5 off every kids cut through the end of September. Bring the whole crew in before the first bell.',
      imageNote: 'photo — kid in the chair',
      link: { label: 'Book a kids cut', route: '/book' },
    },
    {
      id: 'thanksgiving',
      tag: 'Hours',
      date: 'Nov 27',
      title: 'Closed Thanksgiving Day',
      body: 'The shop is closed Thursday so the family can eat. Extended hours Friday and Saturday to catch everyone up.',
    },
    {
      id: 'hot-towel',
      tag: 'New',
      date: 'Oct 2026',
      title: 'Hot towel beard trims',
      body: 'Now on the menu: a full hot towel beard trim with a straight-razor line-up. Add it to any cut.',
      imageNote: 'photo — hot towel beard trim',
      link: { label: 'Book a trim', route: '/book' },
    },
  ],
  testimonials: [
    {
      id: 'meaghan',
      quote: 'The absolute best barber around. He is so precise with his work. Wouldn’t take my boys to anyone else!!',
      author: 'Meaghan Morini',
      source: 'Google review',
      rating: 5,
    },
    {
      id: 'chris',
      quote: 'Best Barber you will find! Always consistent and you will never leave unhappy.',
      author: 'Chris Bennett',
      source: 'Google review',
      rating: 5,
    },
    {
      id: 'kip',
      quote:
        'Great environment, hidden gem… I will go back again and again. It’s been a long time since I found a barber to cut my hair the way he does.',
      author: 'Kip Hilleary',
      source: 'Google review',
      rating: 5,
    },
    {
      id: 'kenneth',
      quote: 'Professional experience and atmosphere.',
      author: 'Kenneth Fleece',
      source: 'Google review',
      rating: 5,
    },
  ],
  gallery: Array.from(
    { length: 15 },
    (_: unknown, i: number): GalleryPhoto => {
      const n: string = String(i + 1).padStart(2, '0');
      return { src: `assets/gallery/cut-${n}.webp`, alt: `Haircut ${i + 1}` };
    },
  ),
};
