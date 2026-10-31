import { CalendarEvent } from '../models/calendar-event.model';

/** iCalendar lines end in CRLF (RFC 5545 §3.1). */
const LINE_BREAK: string = '\r\n';

/** Longer lines fold onto continuation lines that start with a space (RFC 5545 §3.1). */
const MAX_LINE_OCTETS: number = 75;

const encoder: TextEncoder = new TextEncoder();

/** An .ics file holding one appointment, in UTC, for "Add to calendar". */
export function toIcsFile(event: CalendarEvent, now: Date = new Date()): string {
  const startAt: Date = new Date(event.startAt);
  const endAt: Date = new Date(startAt.getTime() + event.durationMinutes * 60_000);
  const locationLines: string[] = event.location ? [`LOCATION:${escapeText(event.location)}`] : [];
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Thad The Barber//Booking//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsDateTime(now)}`,
    `DTSTART:${toIcsDateTime(startAt)}`,
    `DTEND:${toIcsDateTime(endAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...locationLines,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
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
