import { PhoneLinks } from '../models/phone-links.model';

const US_NUMBER: RegExp = /^\+1(\d{3})(\d{3})(\d{4})$/;

/** "+15406212143" → "(540) 621-2143" plus its tel: and sms: links; a non-US number shows as given. */
export function toPhoneLinks(e164: string): PhoneLinks {
  const match: RegExpExecArray | null = US_NUMBER.exec(e164);
  const display: string = match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
  return {
    display,
    tel: `tel:${e164}`,
    sms: `sms:${e164}`,
  };
}

/** "(540) 555-0123" → "+15405550123": the API takes US numbers in E.164 (BR-09). */
export function toE164(usNumber: string): string {
  return `+1${usNumber.replace(/\D/g, '')}`;
}
