import { LinkKind } from '../../../shared/models/link.models';

export type AnnouncementImagePosition = 'left' | 'right';

export type AnnouncementButtonVariant = 'primary' | 'secondary' | 'outlined' | 'text';

export interface AnnouncementImage {
  src: string;
  /** Empty when Thad gives no alt text, so screen readers skip the image. */
  alt: string;
  position: AnnouncementImagePosition;
}

export interface AnnouncementButton {
  label: string;
  url: string;
  kind: LinkKind;
  variant: AnnouncementButtonVariant;
}

/** An item of `content/announcements.json` in the media container, checked and ready to show. */
export interface Announcement {
  title: string;
  /** Rich text from Thad (later the admin portal's editor); Angular's sanitizer cleans it when it renders. */
  bodyHtml: string;
  /** First day it shows, `YYYY-MM-DD`. */
  startDate: string;
  /** Last day it shows, `YYYY-MM-DD`. */
  endDate: string;
  image: AnnouncementImage | null;
  buttons: AnnouncementButton[];
}

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
