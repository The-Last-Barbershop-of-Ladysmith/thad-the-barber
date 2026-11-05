import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitledPage } from './titled-page';

@Component({
  imports: [TitledPage],
  template: `
    <app-titled-page eyebrow="Test eyebrow" heading="Test heading">
      <p pageSubtitle data-testid="subtitle">Test subtitle</p>
      <p data-testid="body">Test body</p>
    </app-titled-page>
  `,
})
class PlainTitleHost {}

@Component({
  imports: [TitledPage],
  template: `
    <app-titled-page>
      <span pageEyebrow data-testid="eyebrow">Projected eyebrow</span>
      <h1 pageHeading data-testid="heading">Projected heading</h1>
    </app-titled-page>
  `,
})
class ProjectedTitleHost {}

describe(
  'TitledPage',
  (): void => {
    function render(host: typeof PlainTitleHost | typeof ProjectedTitleHost): HTMLElement {
      const fixture: ComponentFixture<PlainTitleHost | ProjectedTitleHost> = TestBed.createComponent(host);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it(
      'puts the eyebrow, heading and subtitle in the title band and the rest below it',
      (): void => {
        const element: HTMLElement = render(PlainTitleHost);
        const band: Element | null = element.querySelector('.title-band');

        expect(band?.querySelector('.eyebrow')?.textContent).toBe('Test eyebrow');
        expect(band?.querySelector('h1')?.textContent).toBe('Test heading');
        expect(band?.querySelector('[data-testid="subtitle"]')).not.toBeNull();
        expect(band?.querySelector('[data-testid="body"]')).toBeNull();
        expect(element.querySelector('.page-body [data-testid="body"]')).not.toBeNull();
      },
    );

    it(
      'puts a photo behind the title band',
      (): void => {
        const photo: Element | null = render(PlainTitleHost).querySelector('.title-band [data-testid="title-band-photo"]');

        expect(photo?.getAttribute('src')).toBeTruthy();
      },
    );

    it(
      'takes a projected eyebrow and heading in place of the inputs',
      (): void => {
        const element: HTMLElement = render(ProjectedTitleHost);
        const band: Element | null = element.querySelector('.title-band');

        expect(band?.querySelector('[data-testid="eyebrow"]')).not.toBeNull();
        expect(band?.querySelector('[data-testid="heading"]')).not.toBeNull();
        expect(band?.querySelectorAll('h1')).toHaveLength(1);
      },
    );
  },
);
