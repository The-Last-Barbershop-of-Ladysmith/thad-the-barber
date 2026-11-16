import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldError } from './field-error';

describe(
  'FieldError',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<FieldError> = TestBed.createComponent(FieldError);
      fixture.componentRef.setInput('errorId', 'made-up-error');
      fixture.componentRef.setInput('text', 'Made-up problem text');
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it(
      'is an alert with the given ID, so a field can point to it and a screen reader announces it',
      (): void => {
        const message: HTMLElement | null = render().querySelector('p-message');

        expect(message?.id).toBe('made-up-error');
        expect(message?.getAttribute('role')).toBe('alert');
      },
    );

    it(
      'shows an icon next to the text, so the error is not told by color alone',
      (): void => {
        const host: HTMLElement = render();

        expect(host.querySelector('.p-message-icon')).not.toBeNull();
        expect(host.textContent).toContain('Made-up problem text');
      },
    );
  },
);
