import { toIcsFile } from './ics.utils';

const MANAGE_LINK: string =
  'https://site.example/book/manage/made-up-booking#t=Made-up_Token-That-Is-Long-Enough-To-Need-Folding-1234567890';

const booking: { id: string; startAt: string; } = { id: 'made-up-booking', startAt: '2026-10-03T20:30:00Z' };

interface TestShop {
  name: string;
  addressLine: string | null;
  slotMinutes: number;
}

const shop: TestShop = {
  name: 'Made-Up Fades, Inc; "Café"',
  addressLine: '12 Pretend Pl, Faketown, HI 96999-0001',
  slotMinutes: 45,
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
      'holds the appointment from its start for one slot, in UTC, with the link to change or cancel it',
      (): void => {
        const lines: string[] = unfold(toIcsFile(
          booking,
          shop,
          MANAGE_LINK,
          NOW,
        ));

        expect(lines).toContain('BEGIN:VEVENT');
        expect(lines).toContain('UID:made-up-booking@thad-the-barber');
        expect(lines).toContain('DTSTAMP:20261001T120000Z');
        expect(lines).toContain('DTSTART:20261003T203000Z');
        expect(lines).toContain('DTEND:20261003T211500Z');
        expect(lines).toContain(`DESCRIPTION:Change or cancel: ${MANAGE_LINK}`);
        expect(lines).toContain(`URL:${MANAGE_LINK}`);
        expect(lines.at(-1)).toBe('');
      },
    );

    it(
      'escapes commas and semicolons in text',
      (): void => {
        const lines: string[] = unfold(toIcsFile(
          booking,
          shop,
          MANAGE_LINK,
          NOW,
        ));

        expect(lines).toContain('SUMMARY:Appointment at Made-Up Fades\\, Inc\\; "Café"');
        expect(lines).toContain('LOCATION:12 Pretend Pl\\, Faketown\\, HI 96999-0001');
      },
    );

    it(
      'leaves the location out when the shop has none',
      (): void => {
        const icsFile: string = toIcsFile(
          booking,
          { ...shop, addressLine: null },
          MANAGE_LINK,
          NOW,
        );

        expect(icsFile).not.toContain('LOCATION');
      },
    );

    it(
      'ends every line in CRLF and folds none past 75 octets',
      (): void => {
        const icsFile: string = toIcsFile(
          booking,
          { ...shop, name: `${'é'.repeat(60)} Made-Up Fades` },
          MANAGE_LINK,
          NOW,
        );
        const lines: string[] = icsFile.split('\r\n');

        expect(icsFile).not.toMatch(/[^\r]\n/);
        for (const line of lines) {
          expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
        }
        expect(unfold(icsFile)).toContain(`SUMMARY:Appointment at ${'é'.repeat(60)} Made-Up Fades`);
      },
    );
  },
);
