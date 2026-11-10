import { BackdropVariant } from './backdrop-variant';
import { CLIP_COUNT, FRAMES_PER_CLIP, frameInClip, frameUrl, keyframeUrls } from './backdrop.frames';

const RETIMED_CLIP: number = 0;
const LINEAR_CLIP: number = 4;

describe('backdrop frames', (): void => {
  describe('frameUrl', (): void => {
    it('builds a zero-padded path inside the variant folder', (): void => {
      expect(frameUrl(
        BackdropVariant.Phone,
        2,
        7,
      )).toBe('assets/backdrop/phone/frames/c3/007.avif');
    });

    it('points the last frame of the last clip at a stored file number', (): void => {
      expect(frameUrl(
        BackdropVariant.Desktop,
        CLIP_COUNT - 1,
        FRAMES_PER_CLIP - 1,
      ))
        .toBe('assets/backdrop/desktop/frames/c6/060.avif');
    });
  });

  describe('keyframeUrls', (): void => {
    it('lists one still per clip boundary', (): void => {
      const urls: string[] = keyframeUrls(BackdropVariant.Desktop);

      expect(urls).toHaveLength(CLIP_COUNT + 1);
      expect(urls[0]).toBe('assets/backdrop/desktop/keys/k1.avif');
      expect(urls[CLIP_COUNT]).toBe('assets/backdrop/desktop/keys/k7.avif');
    });

    it('keeps every still inside the chosen variant folder', (): void => {
      const urls: string[] = keyframeUrls(BackdropVariant.Phone);

      expect(urls.every((url: string): boolean => url.startsWith('assets/backdrop/phone/keys/'))).toBe(true);
    });
  });

  describe('frameInClip', (): void => {
    it('plays a clip without measured motion linearly across the stored frames', (): void => {
      expect(frameInClip(LINEAR_CLIP, 0)).toBe(0);
      expect(frameInClip(LINEAR_CLIP, 0.5)).toBe((FRAMES_PER_CLIP - 1) / 2);
      expect(frameInClip(LINEAR_CLIP, 1)).toBe(FRAMES_PER_CLIP - 1);
    });

    it('starts a retimed clip on its first frame and ends it on its last stored frame', (): void => {
      expect(frameInClip(RETIMED_CLIP, 0)).toBe(0);
      expect(frameInClip(RETIMED_CLIP, 1)).toBeCloseTo(FRAMES_PER_CLIP - 1, 5);
    });

    it('never moves backwards as progress grows in a retimed clip', (): void => {
      let previous: number = -1;
      for (let step: number = 0; step <= 200; step++) {
        const frame: number = frameInClip(RETIMED_CLIP, step / 200);

        expect(frame).toBeGreaterThanOrEqual(previous);
        previous = frame;
      }
    });

    it('stays inside the stored frames even when progress overshoots', (): void => {
      expect(frameInClip(RETIMED_CLIP, 1.5)).toBeLessThanOrEqual(FRAMES_PER_CLIP - 1);
    });
  });
});
