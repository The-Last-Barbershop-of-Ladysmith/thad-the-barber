import {
  Announcement,
  GalleryPhoto,
  Testimonial,
} from '../models/home.models';

export type RequestStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SmsSignupState {
  status: RequestStatus;
  phone: string | null;
  error: string | null;
}

export interface HomeState {
  announcements: Announcement[];
  announcementsStatus: RequestStatus;
  testimonials: Testimonial[];
  gallery: GalleryPhoto[];
  galleryStatus: RequestStatus;
  contentStatus: RequestStatus;
  smsSignup: SmsSignupState;
}

export const initialHomeState: HomeState = {
  announcements: [],
  announcementsStatus: 'idle',
  testimonials: [],
  gallery: [],
  galleryStatus: 'idle',
  contentStatus: 'idle',
  smsSignup: {
    status: 'idle',
    phone: null,
    error: null,
  },
};
