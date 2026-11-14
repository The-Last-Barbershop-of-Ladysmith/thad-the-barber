import { FormControl } from '@angular/forms';
import { LOOKUP_CODE_VALIDATORS, NAME_VALIDATORS, PHONE_MASK, PHONE_VALIDATORS } from './form.validators';

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
      'accepts a number typed through the mask',
      (): void => {
        const typedThroughMask: string = PHONE_MASK.replace(/9/g, '7');
        expect(isValid(typedThroughMask)).toBe(true);
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

describe(
  'LOOKUP_CODE_VALIDATORS',
  (): void => {
    const isValid: (code: string) => boolean = (code: string): boolean => {
      return new FormControl(code, LOOKUP_CODE_VALIDATORS).valid;
    };

    it(
      'accepts 4 to 10 digits, leading zeros included',
      (): void => {
        expect(isValid('0042')).toBe(true);
        expect(isValid('1234567890')).toBe(true);
      },
    );

    it.each([
      ['an empty code', ''],
      ['one too short', '123'],
      ['one too long', '12345678901'],
      ['one with a space', '12 345'],
      ['one with a letter', '12a456'],
    ])(
      'rejects %s',
      (_description: string, code: string): void => {
        expect(isValid(code)).toBe(false);
      },
    );
  },
);
