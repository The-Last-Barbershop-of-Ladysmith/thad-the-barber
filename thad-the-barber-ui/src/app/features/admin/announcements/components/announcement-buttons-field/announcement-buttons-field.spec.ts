import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../../../../testing/axe';
import { AdminAnnouncementButtonDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementButtonVariant } from '../../models/announcement-button-variant.model';
import { AnnouncementButtonsField } from './announcement-buttons-field';

const BOOK: AdminAnnouncementButtonDto = {
  label: 'Book',
  url: '/book',
  variant: AnnouncementButtonVariant.Primary,
};

describe('AnnouncementButtonsField', (): void => {
  let fixture: ComponentFixture<AnnouncementButtonsField>;
  let changes: AdminAnnouncementButtonDto[][];

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function click(testId: string): void {
    host().querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.click();
    fixture.detectChanges();
  }

  function open(buttons: AdminAnnouncementButtonDto[], isSubmitted: boolean = false): void {
    fixture.componentRef.setInput('buttons', buttons);
    fixture.componentRef.setInput('isSubmitted', isSubmitted);
    fixture.detectChanges();
  }

  beforeEach((): void => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(AnnouncementButtonsField);
    changes = [];
    fixture.componentInstance.buttonsChange.subscribe((buttons: AdminAnnouncementButtonDto[]): void => {
      changes.push(buttons);
    });
  });

  it('adds a blank primary button', (): void => {
    open([]);

    click('add-button');

    expect(changes[0]).toEqual([
      {
        label: '',
        url: '',
        variant: AnnouncementButtonVariant.Primary,
      },
    ]);
  });

  it('stops offering to add at four buttons', (): void => {
    open([
      BOOK,
      BOOK,
      BOOK,
      BOOK,
    ]);

    expect(host().querySelector('[data-testid="add-button"]')).toBeNull();
  });

  it('removes a button only after a second click', (): void => {
    open([BOOK, { ...BOOK, label: 'Call' }]);

    click('remove-button');
    expect(changes).toHaveLength(0);

    click('confirm-remove-button');
    expect(changes[0]?.map((button: AdminAnnouncementButtonDto): string => button.label)).toEqual(['Call']);
  });

  it('calls out a half-filled button only once saving was tried', (): void => {
    open([{ ...BOOK, url: 'javascript:alert(1)' }]);
    expect(host().querySelector('[data-testid="button-error"]')).toBeNull();

    open([{ ...BOOK, url: 'javascript:alert(1)' }], true);
    expect(host().querySelector('[data-testid="button-error"]')).not.toBeNull();
  });

  it('has no accessibility violations', async (): Promise<void> => {
    open([BOOK]);

    await expectNoAxeViolations(host());
  });
});
