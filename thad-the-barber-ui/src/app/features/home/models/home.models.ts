export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  source: string;
  rating: number;
}

/** An image in the media container's `gallery/` folder, with alt text from its file name. */
export interface GalleryPhoto {
  src: string;
  alt: string;
}

export interface HomeContent { testimonials: Testimonial[]; }
