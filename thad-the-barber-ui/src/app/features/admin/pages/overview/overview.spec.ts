import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expectNoAxeViolations } from '../../../../../testing/axe';
import { Overview } from './overview';

describe(
  'Overview',
  (): void => {
    let fixture: ComponentFixture<Overview>;

    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      fixture = TestBed.createComponent(Overview);
      fixture.detectChanges();
    });

    it(
      'welcomes the admin with one page heading',
      (): void => {
        const host: HTMLElement = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('h1')).toHaveLength(1);
        expect(host.querySelector('h1')?.textContent).toContain('Welcome');
      },
    );

    it(
      'says what is coming next',
      (): void => {
        const titles: string[] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.card-title'))
          .map((title: Element): string => title.textContent);

        expect(titles).toEqual(['Announcements', 'Gallery']);
      },
    );

    it(
      'has no accessibility violations',
      async (): Promise<void> => {
        await expectNoAxeViolations(fixture.nativeElement as HTMLElement);
      },
    );
  },
);
