import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { RichTextEditor } from './rich-text-editor';

describe('RichTextEditor', (): void => {
  let fixture: ComponentFixture<RichTextEditor>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async (): Promise<void> => {
    const label: HTMLElement = document.createElement('span');
    label.id = 'message-label';
    label.textContent = 'Message';
    document.body.append(label);
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(RichTextEditor);
    fixture.componentRef.setInput('labelledBy', 'message-label');
    await settle();
  });

  it('shows the html it is given, in an editor named by its label', async (): Promise<void> => {
    const textbox: HTMLElement | null = host().querySelector<HTMLElement>('[role="textbox"]');
    expect(textbox?.getAttribute('aria-labelledby')).toBe('message-label');

    fixture.componentRef.setInput('html', '<p>Open <strong>late</strong></p>');
    await settle();

    expect(textbox?.querySelector('strong')?.textContent).toBe('late');
  });

  it('asks for words to be selected before a link can be made', async (): Promise<void> => {
    host().querySelector<HTMLButtonElement>('[data-testid="format-link"]')?.click();
    await settle();

    expect(host().querySelector('[data-testid="link-problem"]')).not.toBeNull();
    expect(host().querySelector('[data-testid="link-url"]')).toBeNull();
  });

  afterEach((): void => {
    document.getElementById('message-label')?.remove();
  });

  it('has every formatting tool, none pressed to start with', (): void => {
    const tools: HTMLElement[] = Array.from(host().querySelectorAll<HTMLElement>('.tool'));

    expect(tools).toHaveLength(20);
    const toggles: HTMLElement[] = tools.filter((tool: HTMLElement): boolean => tool.hasAttribute('aria-pressed'));
    expect(toggles).toHaveLength(17);
    expect(toggles.every((tool: HTMLElement): boolean => tool.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await expectNoAxeViolations(host());
  });
});
