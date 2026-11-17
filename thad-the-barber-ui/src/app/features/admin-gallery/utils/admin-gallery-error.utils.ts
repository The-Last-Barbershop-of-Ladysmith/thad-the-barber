import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { AdminGalleryError } from '../models/admin-gallery-error.model';
import { GalleryUploadProblem } from '../models/gallery-upload-problem.model';

/** What the gallery page says for a failed call, by the API's problem `code`. */
export function toAdminGalleryError(error: unknown): AdminGalleryError {
  switch (getProblemCode(error)) {
    case ProblemCode.GalleryUnavailable:
      return AdminGalleryError.Unavailable;
    case ProblemCode.InvalidImage:
      return AdminGalleryError.InvalidImage;
    case ProblemCode.PhotoNotFound:
      return AdminGalleryError.NotFound;
    default:
      return AdminGalleryError.Failed;
  }
}

/** The error in words the owner can act on. */
export function toGalleryMessage(error: AdminGalleryError): string {
  switch (error) {
    case AdminGalleryError.Unavailable:
      return 'The gallery could not be reached. Nothing was changed. Try again in a minute.';
    case AdminGalleryError.InvalidImage:
      return 'That file could not be used. Use a JPEG, PNG, WebP or AVIF photo under 8 MB, and describe it in words.';
    case AdminGalleryError.NotFound:
      return 'That photo was already gone, so it has been taken off this page.';
    case AdminGalleryError.Failed:
      return 'That did not work. Nothing was changed. Try again.';
  }
}

/** What is wrong with a photo before it is sent, in words the owner can act on. */
export function toUploadProblemMessage(problem: GalleryUploadProblem): string {
  switch (problem) {
    case GalleryUploadProblem.NoFile:
      return 'Choose a photo to upload.';
    case GalleryUploadProblem.NotAnImage:
      return 'Use a JPEG, PNG, WebP or AVIF photo.';
    case GalleryUploadProblem.TooBig:
      return 'That photo is too big. Use one under 8 MB.';
    case GalleryUploadProblem.NoDescription:
      return 'Describe the photo in words, up to 100 characters, so everyone can enjoy it.';
  }
}
