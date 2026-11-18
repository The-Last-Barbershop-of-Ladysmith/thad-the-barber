import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  InputSignal,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ButtonStyle, ButtonVariant } from '../../../../../shared/models/button.models';
import { BUTTON_STYLES } from '../../../../../shared/utils/button.utils';
import { AdminAnnouncementButtonDto, AdminAnnouncementImageDto } from '../../dtos/admin-announcement.dto';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';

/** How wide the site's desktop layout is drawn before it is scaled down to fit, as wide as the site's content. */
const DESKTOP_WIDTH_PX: number = 1200;

/**
 * How the announcement looks on the site as it stands in the form, so it can be reviewed before it is saved. The
 * desktop view is drawn at the site's real desktop width and shrunk to fit (as a zoomed-out browser would), so it
 * differs from the phone view even on a phone.
 */
@Component({
  selector: 'app-announcement-preview',
  imports: [
    DatePipe,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-preview.html',
  styleUrl: './announcement-preview.scss',
})
export class AnnouncementPreview {
  readonly title: InputSignal<string> = input.required<string>();
  readonly bodyHtml: InputSignal<string> = input.required<string>();
  readonly startDate: InputSignal<string> = input.required<string>();
  readonly endDate: InputSignal<string> = input.required<string>();
  readonly image: InputSignal<AdminAnnouncementImageDto | null> = input.required<AdminAnnouncementImageDto | null>();
  readonly buttons: InputSignal<AdminAnnouncementButtonDto[]> = input.required<AdminAnnouncementButtonDto[]>();
  readonly isPhone: InputSignal<boolean> = input<boolean>(false);

  protected readonly imagePositions: typeof AnnouncementImagePosition = AnnouncementImagePosition;
  protected readonly buttonStyles: Readonly<Record<ButtonVariant, ButtonStyle>> = BUTTON_STYLES;
  protected readonly desktopWidth: number = DESKTOP_WIDTH_PX;

  private readonly viewport: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly canvas: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly viewportWidth: WritableSignal<number> = signal<number>(DESKTOP_WIDTH_PX);
  private readonly canvasHeight: WritableSignal<number> = signal<number>(0);

  /** 1 when the room is as wide as the drawing; less when it has to shrink. A phone view is never scaled. */
  protected readonly scale: Signal<number> = computed((): number =>
    this.isPhone() ? 1 : Math.min(this.viewportWidth() / DESKTOP_WIDTH_PX, 1));

  /** The room the scaled drawing takes, since a transform doesn't change the space its element holds. */
  protected readonly scaledHeight: Signal<number | null> = computed((): number | null =>
    this.isPhone() || this.canvasHeight() === 0 ? null : this.canvasHeight() * this.scale());

  constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    afterNextRender((): void => {
      const viewport: HTMLElement | undefined = this.viewport()?.nativeElement;
      const canvas: HTMLElement | undefined = this.canvas()?.nativeElement;
      if (viewport === undefined || canvas === undefined) {
        return;
      }
      const observer: ResizeObserver = new ResizeObserver((): void => {
        this.viewportWidth.set(viewport.clientWidth);
        this.canvasHeight.set(canvas.offsetHeight);
      });
      observer.observe(viewport);
      observer.observe(canvas);
      destroyRef.onDestroy((): void => {
        observer.disconnect();
      });
    });
  }
}
