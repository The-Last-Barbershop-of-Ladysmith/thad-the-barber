/** Why a photo can't be uploaded yet, found in the browser before anything is sent. */
export enum GalleryUploadProblem {
  NoFile = 'no_file',
  NotAnImage = 'not_an_image',
  TooBig = 'too_big',
  NoDescription = 'no_description',
}
