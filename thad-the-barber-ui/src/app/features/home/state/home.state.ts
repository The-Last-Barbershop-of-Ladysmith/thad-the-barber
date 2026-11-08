import { GalleryPhoto, ReviewRating, Testimonial } from '../models/home.models';
import { RequestStatus } from '../../../shared/models/request.models';

export interface SmsSignupState {
  status: RequestStatus;
  phone: string | null;
  error: string | null;
}

export interface HomeState {
  testimonials: Testimonial[];
  rating: ReviewRating | null;
  gallery: GalleryPhoto[];
  galleryStatus: RequestStatus;
  contentStatus: RequestStatus;
  /** The next open times as UTC instants; a failed refresh keeps the last ones. */
  nextTimes: string[];
  nextTimesStatus: RequestStatus;
  smsSignup: SmsSignupState;
}

export const initialHomeState: HomeState = {
  testimonials: [],
  rating: null,
  gallery: [],
  galleryStatus: RequestStatus.Idle,
  contentStatus: RequestStatus.Idle,
  nextTimes: [],
  nextTimesStatus: RequestStatus.Idle,
  smsSignup: {
    status: RequestStatus.Idle,
    phone: null,
    error: null,
  },
};
