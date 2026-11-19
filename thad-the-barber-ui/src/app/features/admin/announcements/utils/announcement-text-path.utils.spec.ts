import { announcementTextPath } from './announcement-text-path.utils';

describe('announcementTextPath', (): void => {
  it('names the text page with the title and first day in the address', (): void => {
    expect(announcementTextPath('Open late & early', '2026-11-20'))
      .toBe('/admin/announcements/text?title=Open%20late%20%26%20early&startDate=2026-11-20');
  });
});
