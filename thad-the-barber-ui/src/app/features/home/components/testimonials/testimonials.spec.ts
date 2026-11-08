import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Store, provideStore } from '@ngrx/store';
import { ReviewRating, Testimonial } from '../../models/home.models';
import * as HomeActions from '../../state/home.actions';
import { homeFeature } from '../../state/home.feature';
import { Testimonials } from './testimonials';

describe(
  'Testimonials',
  (): void => {
    const changeIntervalMs: number = 7000;
    const testimonials: Testimonial[] = [
      {
        id: 'first',
        quote: 'First made-up quote',
        author: 'Avery Testwell',
        source: 'Google review',
        rating: 5,
      },
      {
        id: 'second',
        quote: 'Second made-up quote',
        author: 'Jordan Fixture',
        source: 'Google review',
        rating: 4,
      },
      {
        id: 'third',
        quote: 'Third made-up quote',
        author: 'Sam Placeholder',
        source: 'Google review',
        rating: 5,
      },
    ];

    beforeEach((): void => {
      vi.useFakeTimers();
    });

    afterEach((): void => {
      vi.useRealTimers();
    });

    function render(listed: Testimonial[], rating: ReviewRating | null = null): ComponentFixture<Testimonials> {
      TestBed.configureTestingModule({ providers: [provideStore({ [homeFeature.name]: homeFeature.reducer })] });
      TestBed.inject(Store).dispatch(HomeActions.HomeContentRequestSuccess({
        content: {
          testimonials: listed,
          rating,
        },
      }));
      const fixture: ComponentFixture<Testimonials> = TestBed.createComponent(Testimonials);
      fixture.detectChanges();
      return fixture;
    }

    function shownAuthors(fixture: ComponentFixture<Testimonials>): string[] {
      return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.review.is-shown .author-name'))
        .map((author: HTMLElement): string => author.textContent.trim());
    }

    function waitOneInterval(fixture: ComponentFixture<Testimonials>): void {
      vi.advanceTimersByTime(changeIntervalMs);
      fixture.detectChanges();
    }

    it(
      'keeps every testimonial in the page and shows only the first, hiding the rest from assistive tech',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);
        const reviews: HTMLElement[] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.review'));

        expect(reviews).toHaveLength(testimonials.length);
        expect(shownAuthors(fixture)).toEqual(['Avery Testwell']);
        expect(reviews.map((review: HTMLElement): string | null => review.getAttribute('aria-hidden'))).toEqual([
          null,
          'true',
          'true',
        ]);
        expect(reviews.map((review: HTMLElement): boolean => review.hasAttribute('inert'))).toEqual([
          false,
          true,
          true,
        ]);
      },
    );

    it(
      'moves to the next testimonial each interval, and the previous one is marked as leaving',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);

        waitOneInterval(fixture);

        expect(shownAuthors(fixture)).toEqual(['Jordan Fixture']);
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('.review.is-leaving .author-name')[0]?.textContent.trim()).toBe('Avery Testwell');
      },
    );

    it(
      'wraps from the last testimonial back to the first',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);

        waitOneInterval(fixture);
        waitOneInterval(fixture);
        waitOneInterval(fixture);

        expect(shownAuthors(fixture)).toEqual(['Avery Testwell']);
      },
    );

    it(
      'stays on the same testimonial while the pointer is over the section',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);
        const inner: DebugElement = fixture.debugElement.query(By.css('.inner'));

        inner.triggerEventHandler('pointerenter');
        waitOneInterval(fixture);
        expect(shownAuthors(fixture)).toEqual(['Avery Testwell']);

        inner.triggerEventHandler('pointerleave');
        waitOneInterval(fixture);
        expect(shownAuthors(fixture)).toEqual(['Jordan Fixture']);
      },
    );

    it(
      'stops changing when paused with the button and carries on when resumed',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);
        const pauseButton: DebugElement = fixture.debugElement.query(By.css('[data-testid="testimonials-pause"]'));

        pauseButton.triggerEventHandler('click');
        fixture.detectChanges();
        waitOneInterval(fixture);
        expect(shownAuthors(fixture)).toEqual(['Avery Testwell']);

        pauseButton.triggerEventHandler('click');
        fixture.detectChanges();
        waitOneInterval(fixture);
        expect(shownAuthors(fixture)).toEqual(['Jordan Fixture']);
      },
    );

    it(
      'does not change a lone testimonial',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials.slice(0, 1));

        waitOneInterval(fixture);

        expect(shownAuthors(fixture)).toEqual(['Avery Testwell']);
      },
    );

    it(
      'shows the listing rating when the reviews file has one',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials, {
          score: 4.5,
          count: 12,
          url: null,
        });

        const rating: string = (fixture.nativeElement as HTMLElement)
          .querySelector('[data-testid="reviews-rating"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
        expect(rating).toContain('4.5');
        expect(rating).toContain('12');
      },
    );

    it(
      'shows no rating line when the reviews file has none',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render(testimonials);

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="reviews-rating"]')).toBeNull();
      },
    );

    it(
      'hides the section when there are no testimonials',
      (): void => {
        const fixture: ComponentFixture<Testimonials> = render([]);

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="testimonials"]')).toBeNull();
      },
    );
  },
);
