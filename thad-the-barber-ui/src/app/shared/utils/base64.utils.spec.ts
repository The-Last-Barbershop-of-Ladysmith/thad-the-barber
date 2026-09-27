import { decodeBase64, encodeBase64 } from './base64.utils';

describe(
  'base64 utils',
  (): void => {
    it(
      'matches btoa for plain ASCII',
      (): void => {
        expect(encodeBase64('{"a":1}')).toBe(btoa('{"a":1}'));
      },
    );

    it(
      'round-trips text outside Latin-1, which plain btoa rejects',
      (): void => {
        const text: string = 'That booking didn’t go through — 10:30 AM';
        expect(decodeBase64(encodeBase64(text))).toBe(text);
      },
    );
  },
);
