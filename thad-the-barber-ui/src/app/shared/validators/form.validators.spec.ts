import { FormControl } from '@angular/forms';
import { NAME_VALIDATORS, PHONE_VALIDATORS } from './form.validators';

describe(
  'PHONE_VALIDATORS',
  (): void => {
    const isValid: (phone: string) => boolean = (phone: string): boolean => {
      return new FormControl(phone, PHONE_VALIDATORS).valid;
    };

    it(
      'accepts the p-inputmask output',
      (): void => {
        expect(isValid('(555) 010-0142')).toBe(true);
      },
    );

    it(
      'rejects an empty value',
      (): void => {
        expect(isValid('')).toBe(false);
      },
    );

    it(
      'rejects a number that is not fully typed',
      (): void => {
        expect(isValid('(555) 010-01')).toBe(false);
      },
    );

    it(
      'rejects digits without the mask',
      (): void => {
        expect(isValid('5550100142')).toBe(false);
      },
    );

    it(
      'rejects letters inside the mask',
      (): void => {
        expect(isValid('(abc) 010-0142')).toBe(false);
      },
    );
  },
);

describe(
  'NAME_VALIDATORS',
  (): void => {
    const isValid: (name: string) => boolean = (name: string): boolean => {
      return new FormControl(name, NAME_VALIDATORS).valid;
    };

    it(
      'accepts a two-character name',
      (): void => {
        expect(isValid('Jo')).toBe(true);
      },
    );

    it(
      'accepts a name with inner spaces',
      (): void => {
        expect(isValid('Mary Ann')).toBe(true);
      },
    );

    it(
      'rejects an empty name',
      (): void => {
        expect(isValid('')).toBe(false);
      },
    );

    it(
      'rejects one character',
      (): void => {
        expect(isValid('J')).toBe(false);
      },
    );

    it(
      'rejects one character padded with spaces',
      (): void => {
        expect(isValid('  J  ')).toBe(false);
      },
    );

    it(
      'rejects only spaces',
      (): void => {
        expect(isValid('     ')).toBe(false);
      },
    );
  },
);
