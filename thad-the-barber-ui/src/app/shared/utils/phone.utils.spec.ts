import { toE164, toPhoneLinks } from './phone.utils';

describe(
  'toPhoneLinks',
  (): void => {
    it(
      'formats a US number and links it',
      (): void => {
        expect(toPhoneLinks('+15550100142')).toEqual({
          display: '(555) 010-0142',
          tel: 'tel:+15550100142',
          sms: 'sms:+15550100142',
        });
      },
    );

    it(
      'shows a non-US number as given',
      (): void => {
        expect(toPhoneLinks('+442079460000').display).toBe('+442079460000');
      },
    );
  },
);

describe(
  'toE164',
  (): void => {
    it(
      'keeps only the digits after +1',
      (): void => {
        expect(toE164('(555) 010-0142')).toBe('+15550100142');
      },
    );
  },
);
