import { ProblemCode } from '../../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../../shared/utils/problem.utils';
import { AnnouncementTextError } from '../models/announcement-text-error.model';

/** What the announcement text page says for a failed call, by the API's problem `code`. */
export function toAnnouncementTextError(error: unknown): AnnouncementTextError {
  switch (getProblemCode(error)) {
    case ProblemCode.TextsUnavailable:
      return AnnouncementTextError.Unavailable;
    case ProblemCode.AlreadyTexted:
      return AnnouncementTextError.AlreadyTexted;
    case ProblemCode.ValidationFailed:
      return AnnouncementTextError.Invalid;
    default:
      return AnnouncementTextError.Failed;
  }
}

/** The same failures in words the owner can act on. */
export function toAnnouncementTextMessage(error: AnnouncementTextError): string {
  switch (error) {
    case AnnouncementTextError.Unavailable:
      return 'Texts are not switched on yet, or could not be saved. Nothing was sent. Try again in a minute.';
    case AnnouncementTextError.AlreadyTexted:
      return 'This announcement was already texted, so it will not go out twice.';
    case AnnouncementTextError.Invalid:
      return 'That message was not accepted. Check that it is not empty and is under 480 characters.';
    case AnnouncementTextError.Failed:
      return 'That did not work. Nothing was sent. Try again.';
  }
}
