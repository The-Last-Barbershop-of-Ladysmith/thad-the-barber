import { addDays, fromIsoDate, toIsoDate } from '../../../../shared/utils/date.utils';
import { linkKind } from '../../../../shared/utils/link.utils';
import { AdminAnnouncementDto, AdminAnnouncementImageDto } from '../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../dtos/announcements-save-request.dto';
import { AnnouncementFormValue } from '../models/announcement-form-value.model';
import { AnnouncementImagePosition } from '../models/announcement-image-position.model';
import { bodyHtmlToText, textToBodyHtml } from './announcement-body.utils';

/** A new announcement ends 30 days after it starts, so the board never fills with old news. */
export const DEFAULT_RUN_DAYS: number = 30;

export const MAX_BUTTONS: number = 4;

/** The form's starting value: the saved announcement, or a blank one that starts `today` and runs 30 days. */
export function toFormValue(item: AdminAnnouncementDto | null, today: string): AnnouncementFormValue {
  if (item === null) {
    return {
      title: '',
      message: '',
      startDate: today,
      endDate: toIsoDate(addDays(fromIsoDate(today), DEFAULT_RUN_DAYS)),
      imageAltText: '',
      imagePosition: AnnouncementImagePosition.Right,
      buttons: [],
    };
  }
  return {
    title: item.title,
    message: bodyHtmlToText(item.bodyHtml),
    startDate: item.startDate,
    endDate: item.endDate,
    imageAltText: item.image?.altText ?? '',
    imagePosition: item.image?.position ?? AnnouncementImagePosition.Right,
    buttons: item.buttons,
  };
}

/** The form back to what the API saves; the picture stays the one it had unless the owner removed it (`image` null). */
export function toAnnouncementInput(
  value: AnnouncementFormValue,
  image: AdminAnnouncementImageDto | null,
): AnnouncementInputDto {
  return {
    title: value.title.trim(),
    bodyHtml: textToBodyHtml(value.message),
    startDate: value.startDate,
    endDate: value.endDate,
    image: image === null
      ? null
      : {
        fileName: image.fileName,
        altText: value.imageAltText.trim(),
        position: value.imagePosition,
      },
    buttons: value.buttons.map((button: AdminAnnouncementDto['buttons'][number]): typeof button => ({
      label: button.label.trim(),
      url: button.url.trim(),
      variant: button.variant,
    })),
  };
}

/** The saved list with `input` in place of the one at `index`, or added at the end when `index` is null. */
export function withAnnouncement(
  inputs: readonly AnnouncementInputDto[],
  index: number | null,
  input: AnnouncementInputDto,
): AnnouncementInputDto[] {
  if (index === null) {
    return [...inputs, input];
  }
  return inputs.map((existing: AnnouncementInputDto, place: number): AnnouncementInputDto =>
    place === index ? input : existing);
}

/** The last day can't be before the first (ISO days sort as text). Blank days are for the required check to catch. */
export function isEndBeforeStart(startDate: string, endDate: string): boolean {
  return startDate !== '' && endDate !== '' && endDate < startDate;
}

/** A button link is a site path, https, tel: or mailto:, the same as the API accepts. */
export function isAllowedButtonLink(url: string): boolean {
  return linkKind(url.trim()) !== null;
}
