import { LOOKUP_CODE_MAX_LENGTH, toLookupCode } from './lookup-code.utils';

describe(
  'toLookupCode',
  (): void => {
    it(
      'keeps only the digits, in the order typed',
      (): void => {
        expect(toLookupCode('a1b2 3-4')).toBe('1234');
      },
    );

    it(
      'gives nothing for nothing typed',
      (): void => {
        expect(toLookupCode('')).toBe('');
      },
    );

    it(
      'keeps the leading zeros a code can start with',
      (): void => {
        expect(toLookupCode('0042')).toBe('0042');
      },
    );

    it(
      'cuts what is pasted past the longest code',
      (): void => {
        expect(toLookupCode('1'.repeat(LOOKUP_CODE_MAX_LENGTH + 5))).toBe('1'.repeat(LOOKUP_CODE_MAX_LENGTH));
      },
    );
  },
);
