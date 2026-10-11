import {
  ActionReducer,
  createReducer,
  on,
} from '@ngrx/store';
import {
  Announcement,
  GalleryPhoto,
  HomeContent,
} from '../models/home.models';
import { HomeApiActions, HomePageActions } from './home.actions';
import { HomeState, initialHomeState } from './home.state';

export const homeReducer: ActionReducer<HomeState> = createReducer(
  initialHomeState,
  on(HomePageActions.stateReset, (): HomeState => initialHomeState),
  // Saved storage content may be outdated (a deleted announcement or photo) or in an older shape, so it never renders.
  on(
    HomePageActions.opened,
    (state: HomeState): HomeState => ({
      ...state,
      contentStatus: 'pending',
      announcements: [],
      gallery: [],
    }),
  ),
  on(
    HomeApiActions.contentLoaded,
    (state: HomeState, { content }: { content: HomeContent; }): HomeState => ({
      ...state,
      ...content,
      contentStatus: 'success',
    }),
  ),
  on(HomeApiActions.contentLoadFailed, (state: HomeState): HomeState => ({ ...state, contentStatus: 'error' })),
  on(
    HomeApiActions.announcementsLoaded,
    (state: HomeState, { announcements }: { announcements: Announcement[]; }): HomeState =>
      ({ ...state, announcements }),
  ),
  on(
    HomeApiActions.galleryLoaded,
    (state: HomeState, { photos }: { photos: GalleryPhoto[]; }): HomeState => ({ ...state, gallery: photos }),
  ),
  on(
    HomePageActions.smsSignupSubmitted,
    (state: HomeState, { phone }: { phone: string; }): HomeState => ({
      ...state,
      smsSignup: {
        status: 'pending',
        phone,
        error: null,
      },
    }),
  ),
  on(
    HomeApiActions.smsSignupSucceeded,
    (state: HomeState, { phone }: { phone: string; }): HomeState => ({
      ...state,
      smsSignup: {
        status: 'success',
        phone,
        error: null,
      },
    }),
  ),
  on(
    HomeApiActions.smsSignupFailed,
    (state: HomeState, { error }: { error: string; }): HomeState => ({
      ...state,
      smsSignup: {
        ...state.smsSignup,
        status: 'error',
        error,
      },
    }),
  ),
);
