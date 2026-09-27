export interface Announcement {
  id: string;
  tag: string;
  date: string;
  title: string;
  body: string;
  /** Show the text-alert sign-up form in this slide. */
  signup?: boolean;
  /** Placeholder caption until real photography exists. */
  imageNote?: string;
  imageUrl?: string;
  link?: {
    label: string;
    route: string;
    fragment?: string;
  };
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  source: string;
  rating: number;
}

export interface GalleryPhoto {
  src: string;
  alt: string;
}

export interface HomeContent {
  announcements: Announcement[];
  testimonials: Testimonial[];
  gallery: GalleryPhoto[];
}
