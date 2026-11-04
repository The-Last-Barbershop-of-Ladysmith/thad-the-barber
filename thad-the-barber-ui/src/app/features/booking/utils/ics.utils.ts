import { ManagedBooking } from '../dtos/managed-booking.dto';

/** The shop facts an appointment's calendar event shows. */
interface CalendarShop {
  name: string;
  addressLine: string | null;
  slotMinutes: number;
}

/** iCalendar lines end in CRLF (RFC 5545 §3.1). */
const LINE_BREAK: string = '\r\n';

/** Longer lines fold onto continuation lines that start with a space (RFC 5545 §3.1). */
const MAX_LINE_OCTETS: number = 75;

const encoder: TextEncoder = new TextEncoder();

/** An .ics file holding one appointment at the shop, for one slot, in UTC, with the link to change or cancel it. */
export function toIcsFile(
  booking: Pick<ManagedBooking, 'id' | 'startAt'>,
  shop: CalendarShop,
  manageLink: string,
  now: Date = new Date(),
): string {
  const startAt: Date = new Date(booking.startAt);
  const endAt: Date = new Date(startAt.getTime() + shop.slotMinutes * 60_000);
  const locationLines: string[] = shop.addressLine ? [`LOCATION:${escapeText(shop.addressLine)}`] : [];
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Thad The Barber//Booking//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@thad-the-barber`,
    `DTSTAMP:${toIcsDateTime(now)}`,
    `DTSTART:${toIcsDateTime(startAt)}`,
    `DTEND:${toIcsDateTime(endAt)}`,
    `SUMMARY:${escapeText(`Appointment at ${shop.name}`)}`,
    ...locationLines,
    `DESCRIPTION:${escapeText(`Change or cancel: ${manageLink}`)}`,
    `URL:${manageLink}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(LINE_BREAK) + LINE_BREAK;
}

/** 2026-10-03T20:30:00.000Z → "20261003T203000Z" */
function toIcsDateTime(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Backslashes, semicolons, commas and line breaks are escaped in text values (RFC 5545 §3.3.11). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds by UTF-8 octets, never splitting a character; continuation lines lose one octet to their leading space. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let part: string = '';
  let partOctets: number = 0;
  let maxOctets: number = MAX_LINE_OCTETS;
  for (const character of line) {
    const characterOctets: number = encoder.encode(character).length;
    const isPartFull: boolean = partOctets + characterOctets > maxOctets;
    if (isPartFull) {
      parts.push(part);
      part = '';
      partOctets = 0;
      maxOctets = MAX_LINE_OCTETS - 1;
    }
    part += character;
    partOctets += characterOctets;
  }
  parts.push(part);
  return parts.join(`${LINE_BREAK} `);
}
