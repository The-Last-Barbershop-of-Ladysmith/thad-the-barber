import { ActionReducer, createReducer, on } from '@ngrx/store';
import { Announcement } from '../../../core/models/announcements/announcement.model';
import { GalleryPhoto, HomeContent } from '../models/home.models';
import * as HomeActions from './home.actions';
import { HomeState, initialHomeState } from './home.state';
import { RequestStatus } from '../../../shared/models/request.models';

export const homeReducer: ActionReducer<HomeState> = createReducer(
  initialHomeState,
  on(HomeActions.HomeStateReset, (): HomeState => initialHomeState),
  // Saved storage content may be outdated (a deleted announcement or photo) or in an older shape, so it never renders.
  on(
    HomeActions.HomePageOpen,
    (state: HomeState): HomeState => ({
      ...state,
      contentStatus: RequestStatus.Pending,
      announcements: [],
      announcementsStatus: RequestStatus.Pending,
      gallery: [],
      galleryStatus: RequestStatus.Pending,
    }),
  ),
  on(
    HomeActions.HomeContentRequestSuccess,
    (state: HomeState, { content }: { content: HomeContent; }): HomeState => ({
      ...state,
      ...content,
      contentStatus: RequestStatus.Success,
    }),
  ),
  on(
    HomeActions.HomeContentRequestFailure,
    (state: HomeState): HomeState => ({ ...state, contentStatus: RequestStatus.Error }),
  ),
  on(
    HomeActions.AnnouncementsRequestSuccess,
    (state: HomeState, { announcements }: { announcements: Announcement[]; }): HomeState => ({
      ...state,
      announcements,
      announcementsStatus: RequestStatus.Success,
    }),
  ),
  on(
    HomeActions.AnnouncementsRequestFailure,
    (state: HomeState): HomeState => ({ ...state, announcementsStatus: RequestStatus.Error }),
  ),
  on(
    HomeActions.GalleryRequestSuccess,
    (state: HomeState, { photos }: { photos: GalleryPhoto[]; }): HomeState => ({
      ...state,
      gallery: photos,
      galleryStatus: RequestStatus.Success,
    }),
  ),
  on(
    HomeActions.GalleryRequestFailure,
    (state: HomeState): HomeState => ({ ...state, galleryStatus: RequestStatus.Error }),
  ),
  on(
    HomeActions.SmsSignupRequest,
    (state: HomeState, { phone }: { phone: string; }): HomeState => ({
      ...state,
      smsSignup: {
        status: RequestStatus.Pending,
        phone,
        error: null,
      },
    }),
  ),
  on(
    HomeActions.SmsSignupRequestSuccess,
    (state: HomeState, { phone }: { phone: string; }): HomeState => ({
      ...state,
      smsSignup: {
        status: RequestStatus.Success,
        phone,
        error: null,
      },
    }),
  ),
  on(
    HomeActions.SmsSignupRequestFailure,
    (state: HomeState, { error }: { error: string; }): HomeState => ({
      ...state,
      smsSignup: {
        ...state.smsSignup,
        status: RequestStatus.Error,
        error,
      },
    }),
  ),
);
