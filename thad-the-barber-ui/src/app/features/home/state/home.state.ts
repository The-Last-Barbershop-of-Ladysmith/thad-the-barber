import { Announcement } from '../../../core/models/announcements/announcement.model';
import { GalleryPhoto, Testimonial } from '../models/home.models';
import { RequestStatus } from '../../../shared/models/request.models';

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
  announcementsStatus: RequestStatus.Idle,
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
