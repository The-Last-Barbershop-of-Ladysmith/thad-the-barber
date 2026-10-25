import { Announcement } from '../app/core/models/announcements/announcement.model';

/** A made-up announcement running all of October 2026, for specs that fake today's date inside it. */
export const TEST_ANNOUNCEMENT: Announcement = {
  title: 'Made-up special',
  bodyHtml: '<p>Test body</p>',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  image: null,
  buttons: [],
};
