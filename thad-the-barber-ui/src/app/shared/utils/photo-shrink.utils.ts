/** The longest side a photo keeps, in pixels: plenty for the site's widest photo, at a fraction of a phone's 12 MB. */
export const MAX_PHOTO_EDGE_PX: number = 2400;

const SHRUNK_TYPE: string = 'image/webp';
const SHRUNK_QUALITY: number = 0.85;

/**
 * Makes a photo light enough for the site before it is sent: no longer than `MAX_PHOTO_EDGE_PX` on its longest side
 * (never enlarged) and recompressed as WebP, which keeps transparency. The owner can't be expected to compress photos
 * by hand, and the API stores what it is sent, so visitors would otherwise load a phone's full-size original.
 * Anything this can't do (an old browser, a format the browser can't draw, a result that is no smaller) sends the
 * original unchanged, and the API's own limit still applies.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
    return file;
  }
  try {
    const bitmap: ImageBitmap = await createImageBitmap(file);
    const scale: number = Math.min(1, MAX_PHOTO_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas: OffscreenCanvas = new OffscreenCanvas(
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    const context: OffscreenCanvasRenderingContext2D | null = canvas.getContext('2d');
    if (context === null) {
      bitmap.close();
      return file;
    }
    context.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    bitmap.close();
    const shrunk: Blob = await canvas.convertToBlob({
      type: SHRUNK_TYPE,
      quality: SHRUNK_QUALITY,
    });
    const isSmaller: boolean = shrunk.size < file.size;
    if (shrunk.type !== SHRUNK_TYPE || (scale === 1 && !isSmaller)) {
      return file;
    }
    return new File(
      [shrunk],
      `${file.name.replace(/\.[^.]*$/, '')}.webp`,
      {
        type: SHRUNK_TYPE,
        lastModified: file.lastModified,
      },
    );
  } catch {
    return file;
  }
}
