import { linkKind } from './link.utils';
import { LinkKind } from '../models/link.models';

describe(
  'linkKind',
  (): void => {
    it(
      'routes paths on this site in the app',
      (): void => {
        expect(linkKind('/book')).toBe(LinkKind.Internal);
        expect(linkKind('/#visit')).toBe(LinkKind.Internal);
        expect(linkKind('/')).toBe(LinkKind.Internal);
      },
    );

    it(
      'treats protocol-relative paths as other sites, not this one',
      (): void => {
        expect(linkKind('//other.test/book')).toBeNull();
        expect(linkKind('/\\other.test/book')).toBeNull();
      },
    );

    it(
      'opens https links in a new tab and hands phone and mail links to the device',
      (): void => {
        expect(linkKind('HTTPS://example.test/menu')).toBe(LinkKind.External);
        expect(linkKind('tel:+15550100000')).toBe(LinkKind.Device);
        expect(linkKind('mailto:owner@example.test')).toBe(LinkKind.Device);
      },
    );

    it(
      'rejects anything else',
      (): void => {
        expect(linkKind('http://example.test')).toBeNull();
        expect(linkKind('javascript:alert(1)')).toBeNull();
        expect(linkKind('book')).toBeNull();
        expect(linkKind('')).toBeNull();
      },
    );
  },
);
