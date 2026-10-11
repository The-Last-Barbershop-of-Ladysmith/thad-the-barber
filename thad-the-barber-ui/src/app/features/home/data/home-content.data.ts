import { HomeContent } from '../models/home.models';

/** Seed testimonials from the wireframe. HomeContentService serves these until `GET /api/reviews` (#37). */
export const HOME_CONTENT: HomeContent = {
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
};
