import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeadingLevel } from '../../models/heading-level.model';
import { SectionHeading } from './section-heading';

describe(
  'SectionHeading',
  (): void => {
    let fixture: ComponentFixture<SectionHeading>;
    let root: HTMLElement;

    beforeEach(
      async (): Promise<void> => {
        await TestBed.configureTestingModule({ imports: [SectionHeading] }).compileComponents();
        fixture = TestBed.createComponent(SectionHeading);
        root = fixture.nativeElement as HTMLElement;
        fixture.componentRef.setInput('eyebrow', 'Test eyebrow');
        fixture.componentRef.setInput('title', 'Test title');
      },
    );

    it(
      'renders the title as an h2 by default',
      (): void => {
        fixture.detectChanges();
        expect(root.querySelector('h2')?.textContent).toContain('Test title');
      },
    );

    it(
      'keeps the eyebrow out of the heading',
      (): void => {
        fixture.detectChanges();
        expect(root.querySelector('h2')?.textContent).not.toContain('Test eyebrow');
        expect(root.querySelector('.eyebrow')?.textContent).toContain('Test eyebrow');
      },
    );

    it(
      'renders an h3 when asked',
      (): void => {
        fixture.componentRef.setInput('level', HeadingLevel.H3);
        fixture.detectChanges();
        expect(root.querySelector('h3')?.textContent).toContain('Test title');
        expect(root.querySelector('h2')).toBeNull();
      },
    );

    it(
      'renders an h4 when asked',
      (): void => {
        fixture.componentRef.setInput('level', HeadingLevel.H4);
        fixture.detectChanges();
        expect(root.querySelector('h4')?.textContent).toContain('Test title');
        expect(root.querySelector('h2')).toBeNull();
      },
    );
  },
);
