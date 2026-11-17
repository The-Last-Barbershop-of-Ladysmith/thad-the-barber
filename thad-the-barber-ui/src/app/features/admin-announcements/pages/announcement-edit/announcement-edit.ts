import {
  ChangeDetectionStrategy,
  Component,
  InputSignal,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { shopFeature } from '../../../shop/state/shop.feature';
import { toIsoDate, toIsoDateIn } from '../../../../shared/utils/date.utils';
import { AppState } from '../../../../store/app.state';
import { ANNOUNCEMENTS_PATH } from '../../config/announcements-paths';
import {
  AdminAnnouncementButtonDto,
  AdminAnnouncementDto,
  AdminAnnouncementImageDto,
} from '../../dtos/admin-announcement.dto';
import { AnnouncementInputDto } from '../../dtos/announcements-save-request.dto';
import { AdminAnnouncementsError } from '../../models/admin-announcements-error.model';
import { AnnouncementButtonVariant } from '../../models/announcement-button-variant.model';
import { AnnouncementFormValue } from '../../models/announcement-form-value.model';
import { AnnouncementImagePosition } from '../../models/announcement-image-position.model';
import * as AdminAnnouncementsActions from '../../state/admin-announcements.actions';
import { adminAnnouncementsFeature } from '../../state/admin-announcements.feature';
import { hasUnsupportedMarkup } from '../../utils/announcement-body.utils';
import {
  MAX_BUTTONS,
  isAllowedButtonLink,
  isEndBeforeStart,
  toAnnouncementInput,
  toFormValue,
  withAnnouncement,
} from '../../utils/announcement-form.utils';
import { removeAt, toInputs } from '../../utils/announcement-list.utils';
import { toAnnouncementsMessage } from '../../utils/announcements-message.utils';

/** Writes a new announcement, or edits (and can delete) the one at `index` in the saved list. */
@Component({
  selector: 'app-admin-announcement-edit',
  imports: [
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-edit.html',
  styleUrl: './announcement-edit.scss',
})
export class AnnouncementEdit implements OnInit {
  /** The place in the saved list, from the route; none for a new announcement. */
  readonly index: InputSignal<string | undefined> = input<string>();

  protected readonly listPath: string = ANNOUNCEMENTS_PATH;
  protected readonly maxButtons: number = MAX_BUTTONS;
  protected readonly positions: AnnouncementImagePosition[] = Object.values(AnnouncementImagePosition);
  protected readonly variants: AnnouncementButtonVariant[] = Object.values(AnnouncementButtonVariant);

  // The fields are signals read from native inputs, not Angular forms: the page's form code would otherwise land in the
  // initial bundle, which is nearly at its budget.
  protected readonly title: WritableSignal<string> = signal<string>('');
  protected readonly message: WritableSignal<string> = signal<string>('');
  protected readonly startDate: WritableSignal<string> = signal<string>('');
  protected readonly endDate: WritableSignal<string> = signal<string>('');
  protected readonly imageAltText: WritableSignal<string> = signal<string>('');
  protected readonly imagePosition: WritableSignal<AnnouncementImagePosition> = signal<AnnouncementImagePosition>(
    AnnouncementImagePosition.Right,
  );
  protected readonly buttons: WritableSignal<AdminAnnouncementButtonDto[]> = signal<AdminAnnouncementButtonDto[]>([]);
  protected readonly image: WritableSignal<AdminAnnouncementImageDto | null> = signal<AdminAnnouncementImageDto | null>(
    null,
  );

  protected readonly submitted: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isConfirmingDelete: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly hasLostMarkup: WritableSignal<boolean> = signal<boolean>(false);

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly items: Signal<AdminAnnouncementDto[]> = this.store.selectSignal(
    adminAnnouncementsFeature.selectItems,
  );
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private isFormReady: boolean = false;

  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoaded);
  protected readonly isSaving: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsSaving);
  private readonly error: Signal<AdminAnnouncementsError | null> = this.store.selectSignal(
    adminAnnouncementsFeature.selectError,
  );

  protected readonly problem: Signal<string | null> = computed((): string | null => {
    const error: AdminAnnouncementsError | null = this.error();
    return error === null ? null : toAnnouncementsMessage(error);
  });

  /** The place in the saved list, or null for a new announcement. */
  private readonly place: Signal<number | null> = computed((): number | null => {
    const index: string | undefined = this.index();
    return index === undefined ? null : Number(index);
  });

  protected readonly isNew: Signal<boolean> = computed((): boolean => this.place() === null);

  /** A saved announcement that is no longer in the list (it was deleted elsewhere, or the address is wrong). */
  protected readonly isMissing: Signal<boolean> = computed((): boolean => {
    const place: number | null = this.place();
    return this.isLoaded() && place !== null && this.items()[place] === undefined;
  });

  protected readonly isTitleMissing: Signal<boolean> = computed((): boolean => this.title().trim() === '');

  protected readonly hasBadDates: Signal<boolean> = computed((): boolean =>
    this.startDate() === '' || this.endDate() === '' || isEndBeforeStart(this.startDate(), this.endDate()));

  /** A picture needs a description for screen readers before it can be saved. */
  protected readonly isAltTextMissing: Signal<boolean> = computed((): boolean =>
    this.image() !== null && this.imageAltText().trim() === '');

  protected readonly hasBadButton: Signal<boolean> = computed((): boolean =>
    this.buttons().some((button: AdminAnnouncementButtonDto): boolean => this.isBadButton(button)));

  constructor() {
    effect((): void => {
      if (this.isLoaded() && !this.isFormReady && !this.isMissing()) {
        this.isFormReady = true;
        this.fill();
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsRequest());
  }

  protected onInput(field: WritableSignal<string>, event: Event): void {
    field.set((event.target as HTMLInputElement).value);
  }

  protected onButtonInput(
    position: number,
    field: 'label' | 'url',
    event: Event,
  ): void {
    this.changeButton(position, { [field]: (event.target as HTMLInputElement).value });
  }

  protected changeButton(position: number, change: Partial<AdminAnnouncementButtonDto>): void {
    this.buttons.update((buttons: AdminAnnouncementButtonDto[]): AdminAnnouncementButtonDto[] =>
      buttons.map((button: AdminAnnouncementButtonDto, place: number): AdminAnnouncementButtonDto =>
        place === position ? { ...button, ...change } : button));
  }

  protected addButton(): void {
    if (this.buttons().length < MAX_BUTTONS) {
      this.buttons.update((buttons: AdminAnnouncementButtonDto[]): AdminAnnouncementButtonDto[] => [
        ...buttons,
        {
          label: '',
          url: '',
          variant: AnnouncementButtonVariant.Primary,
        },
      ]);
    }
  }

  protected removeButton(position: number): void {
    this.buttons.update((buttons: AdminAnnouncementButtonDto[]): AdminAnnouncementButtonDto[] =>
      removeAt(buttons, position));
  }

  protected removeImage(): void {
    this.image.set(null);
  }

  protected isBadButton(button: AdminAnnouncementButtonDto): boolean {
    return button.label.trim() === '' || !isAllowedButtonLink(button.url);
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.isTitleMissing() || this.hasBadDates() || this.hasBadButton() || this.isAltTextMissing()) {
      return;
    }
    const value: AnnouncementFormValue = {
      title: this.title(),
      message: this.message(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      imageAltText: this.imageAltText(),
      imagePosition: this.imagePosition(),
      buttons: this.buttons(),
    };
    const input: AnnouncementInputDto = toAnnouncementInput(value, this.image());
    this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsSave({
      items: withAnnouncement(
        toInputs(this.items()),
        this.place(),
        input,
      ),
    }));
  }

  protected delete(): void {
    const place: number | null = this.place();
    if (place !== null) {
      this.store.dispatch(AdminAnnouncementsActions.AdminAnnouncementsSave({
        items: removeAt(toInputs(this.items()), place),
      }));
    }
  }

  private fill(): void {
    const place: number | null = this.place();
    const item: AdminAnnouncementDto | null = place === null ? null : this.items()[place] ?? null;
    const timeZone: string | null = this.timeZone();
    const today: string = timeZone === null ? toIsoDate(new Date()) : toIsoDateIn(timeZone, new Date());
    const value: AnnouncementFormValue = toFormValue(item, today);
    this.title.set(value.title);
    this.message.set(value.message);
    this.startDate.set(value.startDate);
    this.endDate.set(value.endDate);
    this.imageAltText.set(value.imageAltText);
    this.imagePosition.set(value.imagePosition);
    this.buttons.set(value.buttons);
    this.image.set(item?.image ?? null);
    this.hasLostMarkup.set(item !== null && hasUnsupportedMarkup(item.bodyHtml));
  }
}
