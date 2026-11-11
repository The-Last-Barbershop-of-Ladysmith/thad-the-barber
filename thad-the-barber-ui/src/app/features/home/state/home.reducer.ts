import { ActionReducer, createReducer, on } from '@ngrx/store';
import * as HomeActions from './home.actions';
import { HomeState, initialHomeState } from './home.state';
import { RequestStatus } from '../../../shared/models/request.models';

export const homeReducer: ActionReducer<HomeState> = createReducer(
  initialHomeState,
  on(HomeActions.HomeStateReset, (): HomeState => initialHomeState),
  on(
    HomeActions.NextTimesRequestSuccess,
    (state: HomeState, { startAts }: { startAts: string[]; }): HomeState => ({
      ...state,
      nextTimes: startAts,
      nextTimesStatus: RequestStatus.Success,
    }),
  ),
  on(
    HomeActions.NextTimesRequestFailure,
    (state: HomeState): HomeState => ({ ...state, nextTimesStatus: RequestStatus.Error }),
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
