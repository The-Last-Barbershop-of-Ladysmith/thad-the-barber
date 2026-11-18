import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expectNoAxeViolations } from '../../../../testing/axe';
import { PhotoUpload } from './photo-upload';

describe('PhotoUpload', (): void => {
  let fixture: ComponentFixture<PhotoUpload>;
  let chosen: (File | null)[];

  function fileInput(): HTMLInputElement {
    const input: HTMLInputElement | null = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="file"]',
    );
    if (input === null) {
      throw new Error('No file input.');
    }
    return input;
  }

  function choose(file: File): void {
    Object.defineProperty(
      fileInput(),
      'files',
      { value: [file], configurable: true },
    );
    fileInput().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach((): void => {
    // The file chooser previews an image through an object URL, which the test DOM doesn't have.
    URL.createObjectURL = (): string => 'blob:preview';
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(PhotoUpload);
    fixture.componentRef.setInput('labelledBy', 'photo-label');
    chosen = [];
    fixture.componentInstance.photoChange.subscribe((file: File | null): void => {
      chosen.push(file);
    });
    fixture.detectChanges();
  });

  it('reports the photo that was chosen', (): void => {
    const photo: File = new File(
      ['x'],
      'edge-case.webp',
      { type: 'image/webp' },
    );

    choose(photo);

    expect(chosen).toEqual([photo]);
  });

  it('reports no photo once the list is cleared', (): void => {
    choose(new File(
      ['x'],
      'edge-case.webp',
      { type: 'image/webp' },
    ));

    fixture.componentInstance.clear();

    expect(chosen.at(-1)).toBeNull();
  });

  it('turns the drop zone off while disabled', (): void => {
    fixture.componentRef.setInput('isDisabled', true);
    fixture.detectChanges();

    const dropZone: HTMLButtonElement | null = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="photo-drop-zone"]');
    expect(dropZone?.disabled).toBe(true);
  });

  it('has no accessibility violations', async (): Promise<void> => {
    await expectNoAxeViolations(fixture.nativeElement as HTMLElement);
  });
});
