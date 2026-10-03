import {
  ActionReducer,
  createReducer,
  on,
} from '@ngrx/store';
import { HomeContent } from '../models/home.models';
import { HomeApiActions, HomePageActions } from './home.actions';
import { HomeState, initialHomeState } from './home.state';

export const homeReducer: ActionReducer<HomeState> = createReducer(
  initialHomeState,
  on(HomePageActions.stateReset, (): HomeState => initialHomeState),
  on(HomePageActions.opened, (state: HomeState): HomeState => ({ ...state, contentStatus: 'pending' })),
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
