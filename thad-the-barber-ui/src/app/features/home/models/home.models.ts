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

/** One entry in `content/gallery.json`. `image` is a media key: the site loads `gallery/<image>-<size>.webp`. */
export interface GalleryPhoto {
  id: string;
  image: string;
  alt: string;
  /** The original's size; no variant is wider than `width`. */
  width: number;
  height: number;
}

/** A gallery photo with its media URLs, as the template renders it. */
export interface GalleryImage {
  id: string;
  alt: string;
  width: number;
  height: number;
  src: string;
  srcset: string;
}

export interface GalleryContent { photos: GalleryPhoto[]; }

export interface HomeContent {
  announcements: Announcement[];
  testimonials: Testimonial[];
}
