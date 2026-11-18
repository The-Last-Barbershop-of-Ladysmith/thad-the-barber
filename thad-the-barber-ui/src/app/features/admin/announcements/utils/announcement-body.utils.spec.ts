import { bodyHtmlToText, hasUnsupportedMarkup, textToBodyHtml } from './announcement-body.utils';

describe('textToBodyHtml', (): void => {
  it('makes a paragraph of each blank-line block and keeps single line breaks', (): void => {
    expect(textToBodyHtml('First line\nsecond line\n\nNext paragraph')).toBe(
      '<p>First line<br>second line</p><p>Next paragraph</p>',
    );
  });

  it('turns **bold**, *italic* and links into their tags', (): void => {
    expect(textToBodyHtml('**Closed** on *Monday*. [Book](/book) or [call](tel:+15550100)')).toBe(
      '<p><strong>Closed</strong> on <em>Monday</em>. <a href="/book">Book</a> or <a href="tel:+15550100">call</a></p>',
    );
  });

  it('escapes anything typed as markup, so no other tag can be made', (): void => {
    expect(textToBodyHtml('<script>alert(1)</script> & "x"')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>',
    );
  });

  it('leaves a link with another scheme as plain text', (): void => {
    expect(textToBodyHtml('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
  });

  it('is empty for blank text', (): void => {
    expect(textToBodyHtml('  \n\n ')).toBe('');
  });
});

describe('bodyHtmlToText', (): void => {
  it('reads the markup the form makes back into text', (): void => {
    const text: string = 'First **bold** and *italic*\nline two\n\n[Book](/book) & more';

    expect(bodyHtmlToText(textToBodyHtml(text))).toBe(text);
  });

  it('keeps the words of markup it does not know and drops the tags', (): void => {
    expect(bodyHtmlToText('<h2>Hours</h2><ul><li>Mon</li></ul>')).toBe('HoursMon');
  });
});

describe('hasUnsupportedMarkup', (): void => {
  it('accepts what the form can make', (): void => {
    expect(hasUnsupportedMarkup('<p>Hi <strong>you</strong><br><a href="/book">Book</a></p>')).toBe(false);
  });

  it('finds a list or heading, which saving would flatten', (): void => {
    expect(hasUnsupportedMarkup('<p>Hi</p><ul><li>One</li></ul>')).toBe(true);
    expect(hasUnsupportedMarkup('<h2>Hi</h2>')).toBe(true);
  });
});
