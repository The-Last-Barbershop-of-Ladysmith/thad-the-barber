import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { shopFeature } from '../../../shop/state/shop.feature';
import { TextUpdatesDialog } from './text-updates-dialog';

interface TextUpdatesDialogPage {
  isOpen: Signal<boolean>;
}

describe(
  'TextUpdatesDialog',
  (): void => {
    let fixture: ComponentFixture<TextUpdatesDialog>;
    let page: TextUpdatesDialogPage;

    function openButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('[data-testid="text-updates-open"]');
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
      fixture = TestBed.createComponent(TextUpdatesDialog);
      page = fixture.componentInstance as unknown as TextUpdatesDialogPage;
      fixture.detectChanges();
    });

    it(
      'starts closed, with a button to open it',
      (): void => {
        expect(openButton()).not.toBeNull();
        expect(page.isOpen()).toBe(false);
        expect(document.querySelector('[data-testid="text-updates-form"]')).toBeNull();
      },
    );

    it(
      'opens the sign-up form when the button is pressed',
      async (): Promise<void> => {
        openButton()?.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(page.isOpen()).toBe(true);
        expect(document.querySelector('[data-testid="text-updates-form"]')).not.toBeNull();
      },
    );
  },
);
