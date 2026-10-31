import { CalendarEvent } from '../models/calendar-event.model';
import { toIcsFile } from './ics.utils';

const MANAGE_LINK: string =
  'https://site.example/book/manage/made-up-booking#t=Made-up_Token-That-Is-Long-Enough-To-Need-Folding-1234567890';

const event: CalendarEvent = {
  uid: 'made-up-booking@thad-the-barber',
  startAt: '2026-10-03T20:30:00Z',
  durationMinutes: 45,
  title: 'Appointment at Made-Up Fades, Inc; "Café"',
  location: '12 Pretend Pl, Faketown, HI 96999-0001',
  description: `Change or cancel: ${MANAGE_LINK}`,
  url: MANAGE_LINK,
};

const NOW: Date = new Date('2026-10-01T12:00:00.123Z');

/** The file's lines with folded ones joined back, as a calendar app reads them. */
function unfold(icsFile: string): string[] {
  return icsFile.replace(/\r\n /g, '').split('\r\n');
}

describe(
  'toIcsFile',
  (): void => {
    it(
      'holds one event from the start for its length, in UTC',
      (): void => {
        const lines: string[] = unfold(toIcsFile(event, NOW));

        expect(lines).toContain('BEGIN:VEVENT');
        expect(lines).toContain('UID:made-up-booking@thad-the-barber');
        expect(lines).toContain('DTSTAMP:20261001T120000Z');
        expect(lines).toContain('DTSTART:20261003T203000Z');
        expect(lines).toContain('DTEND:20261003T211500Z');
        expect(lines).toContain(`URL:${MANAGE_LINK}`);
        expect(lines.at(-1)).toBe('');
      },
    );

    it(
      'escapes commas and semicolons in text',
      (): void => {
        const lines: string[] = unfold(toIcsFile(event, NOW));

        expect(lines).toContain('SUMMARY:Appointment at Made-Up Fades\\, Inc\\; "Café"');
        expect(lines).toContain('LOCATION:12 Pretend Pl\\, Faketown\\, HI 96999-0001');
      },
    );

    it(
      'leaves the location out when the shop has none',
      (): void => {
        const icsFile: string = toIcsFile({ ...event, location: null }, NOW);

        expect(icsFile).not.toContain('LOCATION');
      },
    );

    it(
      'ends every line in CRLF and folds none past 75 octets',
      (): void => {
        const icsFile: string = toIcsFile({ ...event, title: `${'é'.repeat(60)} Made-Up Fades` }, NOW);
        const lines: string[] = icsFile.split('\r\n');

        expect(icsFile).not.toMatch(/[^\r]\n/);
        for (const line of lines) {
          expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
        }
        expect(unfold(icsFile)).toContain(`SUMMARY:${'é'.repeat(60)} Made-Up Fades`);
      },
    );
  },
);
