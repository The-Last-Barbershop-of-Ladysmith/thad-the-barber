import { toStaticMapUrl } from './static-map.utils';

describe(
  'toStaticMapUrl',
  (): void => {
    it(
      'centers and pins the encoded address, styled by the map ID',
      (): void => {
        const query: string = encodeURIComponent('12 Pretend Pl, Faketown, HI 96999-0001');

        expect(toStaticMapUrl(
          '12 Pretend Pl, Faketown, HI 96999-0001',
          'fake-key',
          'fake-map',
        )).toBe(
          'https://maps.googleapis.com/maps/api/staticmap'
          + `?center=${query}&zoom=15&size=640x480&scale=2&map_id=fake-map`
          + `&markers=color:0xe8904a%7C${query}&key=fake-key`,
        );
      },
    );

    it(
      'encodes a key or map ID that carries URL characters',
      (): void => {
        const url: string | null = toStaticMapUrl(
          '1 Fake St',
          'k&e=y',
          'm/id',
        );

        expect(url).toContain('&map_id=m%2Fid&');
        expect(url).toContain('&key=k%26e%3Dy');
      },
    );

    it.each([
      ['', 'fake-map'],
      ['fake-key', ''],
    ])(
      'has no URL without both the key and the map ID (%j, %j)',
      (apiKey: string, mapId: string): void => {
        expect(toStaticMapUrl(
          '1 Fake St',
          apiKey,
          mapId,
        )).toBeNull();
      },
    );
  },
);
