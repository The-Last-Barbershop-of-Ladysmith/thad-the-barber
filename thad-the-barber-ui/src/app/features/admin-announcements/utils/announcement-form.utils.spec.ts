import { AdminAnnouncementDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AdminAnnouncementStatus } from '../models/admin-announcement-status.model';
import { AnnouncementButtonVariant } from '../models/announcement-button-variant.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';
import {
  isAllowedButtonLink,
  isEndBeforeStart,
  toAnnouncementInput,
  toFormValue,
  withAnnouncement,
} from './announcement-form.utils';

const SAVED: AdminAnnouncementDto = {
  title: 'Holiday hours',
  bodyHtml: '<p>We are <strong>closed</strong>.</p>',
  startDate: '2026-11-20',
  endDate: '2026-12-26',
  image: {
    fileName: 'hours.webp',
    altText: 'A sign',
    position: AnnouncementImagePosition.Left,
    src: 'https://example.test/announcements/hours.webp',
  },
  buttons: [
    {
      label: 'Book',
      url: '/book',
      variant: AnnouncementButtonVariant.Primary,
    },
  ],
  status: AdminAnnouncementStatus.Showing,
};

describe('toFormValue', (): void => {
  it('starts a new announcement today and runs it 30 days', (): void => {
    expect(toFormValue(null, '2026-11-17')).toEqual({
      title: '',
      message: '',
      startDate: '2026-11-17',
      endDate: '2026-12-17',
      imageAltText: '',
      imagePosition: AnnouncementImagePosition.Right,
      buttons: [],
    });
  });

  it('reads a saved announcement, with its message as text', (): void => {
    const value: ReturnType<typeof toFormValue> = toFormValue(SAVED, '2026-11-17');

    expect(value.message).toBe('We are **closed**.');
    expect(value.imageAltText).toBe('A sign');
    expect(value.imagePosition).toBe(AnnouncementImagePosition.Left);
  });
});

describe('toAnnouncementInput', (): void => {
  it('turns the message back into HTML and keeps the picture file', (): void => {
    const input: AnnouncementInputDto = toAnnouncementInput(
      {
        ...toFormValue(SAVED, '2026-11-17'),
        title: '  Holiday hours  ',
        imageAltText: ' New sign ',
      },
      SAVED.image,
    );

    expect(input.title).toBe('Holiday hours');
    expect(input.bodyHtml).toBe('<p>We are <strong>closed</strong>.</p>');
    expect(input.image).toEqual({
      fileName: 'hours.webp',
      altText: 'New sign',
      position: AnnouncementImagePosition.Left,
    });
  });

  it('has no picture when the owner removed it', (): void => {
    expect(toAnnouncementInput(toFormValue(SAVED, '2026-11-17'), null).image).toBeNull();
  });
});

describe('withAnnouncement', (): void => {
  const first: AnnouncementInputDto = toAnnouncementInput(toFormValue(SAVED, '2026-11-17'), null);
  const second: AnnouncementInputDto = { ...first, title: 'Second' };

  it('replaces the one at a place, or adds at the end', (): void => {
    const changed: AnnouncementInputDto = { ...first, title: 'Changed' };

    expect(withAnnouncement(
      [first, second],
      1,
      changed,
    ).map((item: AnnouncementInputDto): string => item.title)).toEqual([
      'Holiday hours',
      'Changed',
    ]);
    expect(withAnnouncement(
      [first],
      null,
      second,
    )).toHaveLength(2);
  });
});

describe('isEndBeforeStart', (): void => {
  it('is true only for a last day before the first', (): void => {
    expect(isEndBeforeStart('2026-11-20', '2026-11-19')).toBe(true);
    expect(isEndBeforeStart('2026-11-20', '2026-11-20')).toBe(false);
    expect(isEndBeforeStart('', '2026-11-19')).toBe(false);
  });
});

describe('isAllowedButtonLink', (): void => {
  it('accepts a site path, https, tel and mailto links, and refuses the rest', (): void => {
    expect(isAllowedButtonLink('/book')).toBe(true);
    expect(isAllowedButtonLink(' https://example.test ')).toBe(true);
    expect(isAllowedButtonLink('tel:+15550100')).toBe(true);
    expect(isAllowedButtonLink('javascript:alert(1)')).toBe(false);
    expect(isAllowedButtonLink('//evil.test')).toBe(false);
    expect(isAllowedButtonLink('')).toBe(false);
  });
});
