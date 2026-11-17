import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { AdminShopError } from '../models/admin-shop-error.model';

/** What the shop info page says for a failed call, by the API's problem `code`. */
export function toAdminShopError(error: unknown): AdminShopError {
  switch (getProblemCode(error)) {
    case ProblemCode.ShopInfoUnavailable:
      return AdminShopError.Unavailable;
    case ProblemCode.ValidationFailed:
      return AdminShopError.Invalid;
    default:
      return AdminShopError.Failed;
  }
}

/** The error in words the owner can act on. */
export function toShopMessage(error: AdminShopError): string {
  switch (error) {
    case AdminShopError.Unavailable:
      return 'The shop info could not be reached. Nothing was changed. Try again in a minute.';
    case AdminShopError.Invalid:
      return 'That notice was not accepted. Keep it to 1,000 characters.';
    case AdminShopError.Failed:
      return 'That did not work. Nothing was changed. Try again.';
  }
}
