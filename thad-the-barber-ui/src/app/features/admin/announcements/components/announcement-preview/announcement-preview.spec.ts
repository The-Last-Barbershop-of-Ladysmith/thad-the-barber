import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../../../../testing/axe';
import { AnnouncementButtonVariant } from '../../models/announcement-button-variant.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import { AnnouncementPreview } from './announcement-preview';

describe('AnnouncementPreview', (): void => {
  let fixture: ComponentFixture<AnnouncementPreview>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(AnnouncementPreview);
    fixture.componentRef.setInput('title', 'Open late');
    fixture.componentRef.setInput('bodyHtml', '<p>Until <em>8</em></p>');
    fixture.componentRef.setInput('startDate', '2026-11-20');
    fixture.componentRef.setInput('endDate', '2026-12-26');
    fixture.componentRef.setInput('image', null);
    fixture.componentRef.setInput('buttons', []);
    fixture.detectChanges();
  });

  it('shows the title, the formatted message and the last day', (): void => {
    expect(host().querySelector('.preview-title')?.textContent).toBe('Open late');
    expect(host().querySelector('em')?.textContent).toBe('8');
    expect(host().querySelector('.eyebrow')?.textContent).toContain('Dec 26');
  });

  it('holds a place for a title not written yet, and for a last day not picked', (): void => {
    fixture.componentRef.setInput('title', '');
    fixture.componentRef.setInput('endDate', '');
    fixture.detectChanges();

    expect(host().querySelector('.preview-title')?.textContent).not.toBe('');
    expect(host().querySelector('.eyebrow')?.textContent).toContain('Pick the last day');
  });

  it('shows its buttons, naming one that has no label yet, and its photo', (): void => {
    fixture.componentRef.setInput('buttons', [
      {
        label: 'Book',
        url: '/book',
        variant: AnnouncementButtonVariant.Primary,
      },
      {
        label: '',
        url: '',
        variant: AnnouncementButtonVariant.Text,
      },
    ]);
    fixture.componentRef.setInput('image', {
      fileName: 'sign.webp',
      src: 'https://example.test/sign.webp',
      altText: 'A sign',
      position: AnnouncementImagePosition.Left,
    });
    fixture.detectChanges();

    const labels: string[] = Array.from(host().querySelectorAll('.preview-actions [pButton]'))
      .map((button: Element): string => button.textContent.trim());
    expect(labels).toEqual(['Book', 'Button']);
    expect(host().querySelector('img')?.getAttribute('alt')).toBe('A sign');
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await expectNoAxeViolations(host());
  });
});
