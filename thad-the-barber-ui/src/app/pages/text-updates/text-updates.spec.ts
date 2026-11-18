import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { shopFeature } from '../../features/shop/state/shop.feature';
import { TextUpdates } from './text-updates';

describe(
  'TextUpdates',
  (): void => {
    it(
      'shows the sign-up form and its consent wording on the page, with no click needed',
      (): void => {
        TestBed.configureTestingModule({
          providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
        });
        const fixture: ComponentFixture<TextUpdates> = TestBed.createComponent(TextUpdates);
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('[data-testid="text-updates-page"]')).not.toBeNull();
        expect(element.querySelector('[data-testid="text-updates-form"]')).not.toBeNull();
        expect(element.querySelector('label[for="text-updates-page-consent"]')?.textContent)
          .toContain('Reply STOP to opt out');
      },
    );
  },
);
