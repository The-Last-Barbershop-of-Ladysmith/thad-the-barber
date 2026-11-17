import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { AdminAnnouncementsError } from '../models/admin-announcements-error.model';

/** What the announcements pages say for a failed call, by the API's problem `code`. */
export function toAdminAnnouncementsError(error: unknown): AdminAnnouncementsError {
  switch (getProblemCode(error)) {
    case ProblemCode.AnnouncementsUnavailable:
      return AdminAnnouncementsError.Unavailable;
    case ProblemCode.InvalidImage:
      return AdminAnnouncementsError.InvalidImage;
    case ProblemCode.ValidationFailed:
      return AdminAnnouncementsError.Invalid;
    default:
      return AdminAnnouncementsError.Failed;
  }
}
