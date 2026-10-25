import { TEST_ANNOUNCEMENT } from '../../../../testing/test-announcement';
import { RequestStatus } from '../../../shared/models/request.models';
import * as AnnouncementsActions from './announcements.actions';
import { announcementsReducer } from './announcements.reducer';
import { AnnouncementsState, initialAnnouncementsState } from './announcements.state';

describe(
  'announcements reducer',
  (): void => {
    const loaded: AnnouncementsState = {
      announcements: [TEST_ANNOUNCEMENT],
      loadStatus: RequestStatus.Success,
    };

    it(
      'marks a requested load pending',
      (): void => {
        const state: AnnouncementsState = announcementsReducer(
          initialAnnouncementsState,
          AnnouncementsActions.AnnouncementsRequest(),
        );

        expect(state).toEqual({ announcements: [], loadStatus: RequestStatus.Pending });
      },
    );

    it(
      'replaces the announcements with the loaded ones',
      (): void => {
        const before: AnnouncementsState = {
          announcements: [{ ...TEST_ANNOUNCEMENT, title: 'Made-up older post' }],
          loadStatus: RequestStatus.Pending,
        };

        const state: AnnouncementsState = announcementsReducer(
          before,
          AnnouncementsActions.AnnouncementsRequestSuccess({ announcements: [TEST_ANNOUNCEMENT] }),
        );

        expect(state).toEqual(loaded);
      },
    );

    it(
      'marks a failed load, so the section and its links hide',
      (): void => {
        const state: AnnouncementsState = announcementsReducer(
          initialAnnouncementsState,
          AnnouncementsActions.AnnouncementsRequestFailure(),
        );

        expect(state.loadStatus).toBe(RequestStatus.Error);
      },
    );
  },
);
