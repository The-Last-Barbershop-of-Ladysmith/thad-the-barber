import { GalleryPhoto, Testimonial } from '../models/home.models';
import { RequestStatus } from '../../../shared/models/request.models';

export interface SmsSignupState {
  status: RequestStatus;
  phone: string | null;
  error: string | null;
}

export interface HomeState {
  testimonials: Testimonial[];
  gallery: GalleryPhoto[];
  galleryStatus: RequestStatus;
  contentStatus: RequestStatus;
  smsSignup: SmsSignupState;
}

export const initialHomeState: HomeState = {
  testimonials: [],
  gallery: [],
  galleryStatus: RequestStatus.Idle,
  contentStatus: RequestStatus.Idle,
  smsSignup: {
    status: RequestStatus.Idle,
    phone: null,
    error: null,
  },
};
