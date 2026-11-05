import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe(
  'NotFound',
  (): void => {
    function render(): HTMLElement {
      const fixture: ComponentFixture<NotFound> = TestBed.createComponent(NotFound);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([])],
      });
    });

    it(
      'renders',
      (): void => {
        expect(render().querySelector('[data-testid="not-found"]')).not.toBeNull();
      },
    );

    it(
      'links to booking and the home page',
      (): void => {
        const element: HTMLElement = render();

        expect(element.querySelector('[data-testid="not-found-book"]')?.getAttribute('href')).toBe('/book');
        expect(element.querySelector('[data-testid="not-found-home"]')?.getAttribute('href')).toBe('/');
      },
    );
  },
);
