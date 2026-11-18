import { MAX_PHOTO_EDGE_PX, shrinkPhoto } from './photo-shrink.utils';

describe('shrinkPhoto', (): void => {
  const original: File = new File(
    [new Uint8Array(5_000_000)],
    'phone photo.JPG',
    { type: 'image/jpeg' },
  );
  let drawn: { width: number; height: number; } | null;
  let closed: boolean;
  let encoded: { type: string; size: number; };

  function stubBrowser(sourceWidth: number, sourceHeight: number): void {
    vi.stubGlobal('createImageBitmap', (): Promise<ImageBitmap> => Promise.resolve({
      width: sourceWidth,
      height: sourceHeight,
      close: (): void => {
        closed = true;
      },
    }));
    vi.stubGlobal('OffscreenCanvas', class {
      constructor(public width: number, public height: number) {}

      getContext(): { drawImage: () => void; } {
        return {
          drawImage: (): void => {
            drawn = {
              width: this.width,
              height: this.height,
            };
          },
        };
      }

      convertToBlob(): Promise<Blob> {
        return Promise.resolve(new Blob([new Uint8Array(encoded.size)], { type: encoded.type }));
      }
    });
  }

  beforeEach((): void => {
    drawn = null;
    closed = false;
    encoded = {
      type: 'image/webp',
      size: 400_000,
    };
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('draws a big photo no longer than the limit, keeping its shape, and sends it as a smaller WebP', async (): Promise<void> => {
    stubBrowser(4000, 3000);

    const shrunk: File = await shrinkPhoto(original);

    expect(drawn).toEqual({
      width: MAX_PHOTO_EDGE_PX,
      height: 1800,
    });
    expect(closed).toBe(true);
    expect(shrunk.type).toBe('image/webp');
    expect(shrunk.name).toBe('phone photo.webp');
    expect(shrunk.size).toBe(400_000);
  });

  it('never enlarges a small photo, and keeps the original when recompressing does not make it smaller', async (): Promise<void> => {
    stubBrowser(800, 600);
    encoded.size = 6_000_000;

    expect(await shrinkPhoto(original)).toBe(original);
    expect(drawn).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('shrinks a small photo that recompresses smaller', async (): Promise<void> => {
    stubBrowser(800, 600);

    expect((await shrinkPhoto(original)).type).toBe('image/webp');
  });

  it('keeps the original when the browser cannot make WebP', async (): Promise<void> => {
    stubBrowser(4000, 3000);
    encoded.type = 'image/png';

    expect(await shrinkPhoto(original)).toBe(original);
  });

  it('keeps the original when the browser cannot draw the file', async (): Promise<void> => {
    vi.stubGlobal('createImageBitmap', (): Promise<ImageBitmap> => Promise.reject(new Error('cannot decode')));
    vi.stubGlobal('OffscreenCanvas', class {
      readonly isUnused: boolean = true;
    });

    expect(await shrinkPhoto(original)).toBe(original);
  });

  it('keeps the original in a browser without the drawing tools', async (): Promise<void> => {
    vi.stubGlobal('createImageBitmap', undefined);

    expect(await shrinkPhoto(original)).toBe(original);
  });
});
