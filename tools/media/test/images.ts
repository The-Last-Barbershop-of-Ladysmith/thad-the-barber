import sharp from 'sharp';

// libvips' cache keeps written files open, and Windows can't delete open files, so temp folders couldn't be cleaned up.
sharp.cache(false);

export interface TestImage {
  width: number;
  height: number;
  /** EXIF orientation; 6 means the camera was turned 90°, so the shown image is height × width. */
  orientation?: number;
}

/** Writes a flat-color JPEG carrying EXIF (orientation, camera model) and GPS tags, like a phone photo. */
export async function writeTestJpeg(path: string, image: TestImage): Promise<void> {
  await sharp({
    create: {
      width: image.width,
      height: image.height,
      channels: 3,
      background: '#8a5a2b',
    },
  })
    .jpeg()
    .withExif({
      IFD0: { Model: 'Test Camera 9000' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '12/1 34/1 56/1' },
    })
    .withMetadata({ orientation: image.orientation ?? 1 })
    .toFile(path);
}
