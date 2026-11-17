import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { AdminSignInError } from '../models/admin-sign-in-error.model';

/** What the sign-in page says for a failed config or sign-in call, by the API's problem `code`. */
export function toAdminSignInError(error: unknown): AdminSignInError {
  switch (getProblemCode(error)) {
    case ProblemCode.NotAuthorized:
      return AdminSignInError.NotAuthorized;
    case ProblemCode.InvalidIdToken:
      return AdminSignInError.InvalidToken;
    case ProblemCode.AdminUnavailable:
      return AdminSignInError.Unavailable;
    default:
      return AdminSignInError.Failed;
  }
}
