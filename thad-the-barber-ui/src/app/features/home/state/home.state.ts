import { type Announcement, type GalleryPhoto, type Testimonial } from '../models/home.models';

export type RequestStatus = 'idle' | 'pending' | 'success' | 'error';

export interface SmsSignupState {
  status: RequestStatus;
  phone: string | null;
  error: string | null;
}

export interface HomeState {
  announcements: Announcement[];
  testimonials: Testimonial[];
  gallery: GalleryPhoto[];
  contentStatus: RequestStatus;
  smsSignup: SmsSignupState;
}

export const initialHomeState: HomeState = {
  announcements: [],
  testimonials: [],
  gallery: [],
  contentStatus: 'idle',
  smsSignup: {
    status: 'idle',
    phone: null,
    error: null,
  },
};
