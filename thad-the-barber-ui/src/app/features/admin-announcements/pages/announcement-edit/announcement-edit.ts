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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  allowedLink,
  endNotBeforeStart,
  toAnnouncementInput,
  toFormValue,
  withAnnouncement,
} from '../../utils/announcement-form.utils';
import { removeAt, toInputs } from '../../utils/announcement-list.utils';
import { toAnnouncementsMessage } from '../../utils/announcements-message.utils';

interface ButtonControls {
  label: FormControl<string>;
  url: FormControl<string>;
  variant: FormControl<AnnouncementButtonVariant>;
}

interface AnnouncementControls {
  title: FormControl<string>;
  message: FormControl<string>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
  imageAltText: FormControl<string>;
  imagePosition: FormControl<AnnouncementImagePosition>;
}

/** Writes a new announcement, or edits (and can delete) the one at `index` in the saved list. */
@Component({
  selector: 'app-admin-announcement-edit',
  imports: [
    ReactiveFormsModule,
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
  /** One group per button; a plain list (not a `FormArray`) keeps the page's form code out of the initial bundle. */
  protected readonly buttons: WritableSignal<FormGroup<ButtonControls>[]> = signal<FormGroup<ButtonControls>[]>([]);
  protected readonly submitted: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isConfirmingDelete: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly image: WritableSignal<AdminAnnouncementImageDto | null> = signal<AdminAnnouncementImageDto | null>(
    null,
  );
  protected readonly hasLostMarkup: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly form: FormGroup<AnnouncementControls> = new FormGroup<AnnouncementControls>(
    {
      title: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
      message: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(4000)] }),
      startDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
      imageAltText: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
      imagePosition: new FormControl<AnnouncementImagePosition>(
        AnnouncementImagePosition.Right,
        { nonNullable: true },
      ),
    },
    { validators: [endNotBeforeStart] },
  );

  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly items: Signal<AdminAnnouncementDto[]> = this.store.selectSignal(
    adminAnnouncementsFeature.selectItems,
  );
  private readonly timeZone: Signal<string | null> = this.store.selectSignal(shopFeature.selectTimeZone);
  private isFormReady: boolean = false;

  protected readonly isLoaded: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsLoaded);
  protected readonly isSaving: Signal<boolean> = this.store.selectSignal(adminAnnouncementsFeature.selectIsSaving);
  protected readonly error: Signal<AdminAnnouncementsError | null> = this.store.selectSignal(
    adminAnnouncementsFeature.selectError,
  );

  protected readonly message: Signal<string | null> = computed((): string | null => {
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

  protected addButton(): void {
    if (this.buttons().length < MAX_BUTTONS) {
      this.buttons.update((groups: FormGroup<ButtonControls>[]): FormGroup<ButtonControls>[] => [
        ...groups,
        this.buttonGroup({
          label: '',
          url: '',
          variant: AnnouncementButtonVariant.Primary,
        }),
      ]);
    }
  }

  protected removeButton(position: number): void {
    this.buttons.update((groups: FormGroup<ButtonControls>[]): FormGroup<ButtonControls>[] =>
      groups.filter((_group: FormGroup<ButtonControls>, place: number): boolean => place !== position));
  }

  protected removeImage(): void {
    this.image.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.hasInvalidButton() || this.isAltTextMissing()) {
      return;
    }
    const value: AnnouncementFormValue = {
      ...this.form.getRawValue(),
      buttons: this.buttons().map(
        (group: FormGroup<ButtonControls>): AdminAnnouncementButtonDto => group.getRawValue(),
      ),
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

  protected hasInvalidButton(): boolean {
    return this.buttons().some((group: FormGroup<ButtonControls>): boolean => group.invalid);
  }

  /** A picture needs a description for screen readers before it can be saved. */
  protected isAltTextMissing(): boolean {
    return this.image() !== null && this.form.controls.imageAltText.value.trim() === '';
  }

  private fill(): void {
    const place: number | null = this.place();
    const item: AdminAnnouncementDto | null = place === null ? null : this.items()[place] ?? null;
    const timeZone: string | null = this.timeZone();
    const today: string = timeZone === null ? toIsoDate(new Date()) : toIsoDateIn(timeZone, new Date());
    const value: AnnouncementFormValue = toFormValue(item, today);
    this.form.patchValue(value);
    this.buttons.set(value.buttons.map((button: AdminAnnouncementButtonDto): FormGroup<ButtonControls> =>
      this.buttonGroup(button)));
    this.image.set(item?.image ?? null);
    this.hasLostMarkup.set(item !== null && hasUnsupportedMarkup(item.bodyHtml));
  }

  private buttonGroup(button: AdminAnnouncementButtonDto): FormGroup<ButtonControls> {
    return new FormGroup<ButtonControls>({
      label: new FormControl<string>(
        button.label,
        { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] },
      ),
      url: new FormControl<string>(button.url, { nonNullable: true, validators: [Validators.required, allowedLink] }),
      variant: new FormControl<AnnouncementButtonVariant>(button.variant, { nonNullable: true }),
    });
  }
}
