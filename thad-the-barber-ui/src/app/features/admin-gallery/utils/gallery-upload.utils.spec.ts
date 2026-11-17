import { GalleryUploadProblem } from '../models/gallery-upload-problem.model';
import { MAX_PHOTO_BYTES, findUploadProblem } from './gallery-upload.utils';

function photo(type: string = 'image/jpeg', size: number = 1000): File {
  const file: File = new File(
    ['x'],
    'photo',
    { type },
  );
  Object.defineProperty(
    file,
    'size',
    { value: size },
  );
  return file;
}

describe('findUploadProblem', (): void => {
  it('lets a photo with a description go', (): void => {
    expect(findUploadProblem(photo(), 'Skin fade')).toBeNull();
    expect(findUploadProblem(photo('image/avif'), 'Café 2')).toBeNull();
  });

  it('needs a photo', (): void => {
    expect(findUploadProblem(null, 'Skin fade')).toBe(GalleryUploadProblem.NoFile);
  });

  it('refuses anything that is not a JPEG, PNG, WebP or AVIF', (): void => {
    expect(findUploadProblem(photo('image/gif'), 'Fade')).toBe(GalleryUploadProblem.NotAnImage);
    expect(findUploadProblem(photo('text/html'), 'Fade')).toBe(GalleryUploadProblem.NotAnImage);
    expect(findUploadProblem(photo(''), 'Fade')).toBe(GalleryUploadProblem.NotAnImage);
  });

  it('refuses a photo over 8 MB', (): void => {
    expect(findUploadProblem(photo('image/png', MAX_PHOTO_BYTES), 'Fade')).toBeNull();
    expect(findUploadProblem(photo('image/png', MAX_PHOTO_BYTES + 1), 'Fade')).toBe(GalleryUploadProblem.TooBig);
  });

  it('needs a description with a letter or number the file name can use, in up to 100 characters', (): void => {
    expect(findUploadProblem(photo(), '')).toBe(GalleryUploadProblem.NoDescription);
    expect(findUploadProblem(photo(), '   ')).toBe(GalleryUploadProblem.NoDescription);
    expect(findUploadProblem(photo(), '!!! ???')).toBe(GalleryUploadProblem.NoDescription);
    expect(findUploadProblem(photo(), '日本語')).toBe(GalleryUploadProblem.NoDescription);
    expect(findUploadProblem(photo(), 'a'.repeat(101))).toBe(GalleryUploadProblem.NoDescription);
    expect(findUploadProblem(photo(), 'a'.repeat(100))).toBeNull();
  });
});
