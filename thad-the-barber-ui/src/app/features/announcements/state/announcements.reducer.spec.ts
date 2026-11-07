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
      shownIndex: 0,
    };

    it(
      'marks a requested load pending',
      (): void => {
        const state: AnnouncementsState = announcementsReducer(
          initialAnnouncementsState,
          AnnouncementsActions.AnnouncementsRequest(),
        );

        expect(state).toEqual({
          announcements: [],
          loadStatus: RequestStatus.Pending,
          shownIndex: 0,
        });
      },
    );

    it(
      'replaces the announcements with the loaded ones',
      (): void => {
        const before: AnnouncementsState = {
          announcements: [{ ...TEST_ANNOUNCEMENT, title: 'Made-up older post' }],
          loadStatus: RequestStatus.Pending,
          shownIndex: 0,
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

    it(
      'remembers which announcement is shown, and keeps it when the announcements load again',
      (): void => {
        const shown: AnnouncementsState = announcementsReducer(
          loaded,
          AnnouncementsActions.AnnouncementShown({ index: 2 }),
        );
        const reloaded: AnnouncementsState = announcementsReducer(
          shown,
          AnnouncementsActions.AnnouncementsRequestSuccess({ announcements: [TEST_ANNOUNCEMENT] }),
        );

        expect(shown.shownIndex).toBe(2);
        expect(reloaded.shownIndex).toBe(2);
      },
    );
  },
);
