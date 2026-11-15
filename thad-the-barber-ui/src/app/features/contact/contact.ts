import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  Signal,
  WritableSignal,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { map } from 'rxjs';
import { NoticeMessage } from '../../shared/components/notice-message/notice-message';
import { PhoneField } from '../../shared/components/phone-field/phone-field';
import { TitledPage } from '../../shared/components/titled-page/titled-page';
import { Notice } from '../../shared/models/notice.model';
import { PhoneLinks } from '../../shared/models/phone-links.model';
import { toProblemNotice } from '../../shared/utils/problem.utils';
import { PHONE_PATTERN_VALIDATOR } from '../../shared/validators/form.validators';
import { AppState } from '../../store/app.state';
import { shopFeature } from '../shop/state/shop.feature';
import {
  EMAIL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PAGE_OR_BOOKING_MAX_LENGTH,
} from './config/contact-limits';
import { CONTACT_FAILED_NOTICE, CONTACT_PROBLEM_NOTICES, CONTACT_SENT_NOTICE } from './config/contact-notices';
import { ContactCategory } from '../../shared/models/contact-category.model';
import { ContactFormValue } from './models/contact-form-value.model';
import { ContactPrefill } from '../../shared/models/contact-prefill.model';
import { ContactService } from './services/contact.service';
import { toContactPrefill } from './utils/contact-prefill.utils';
import { toContactRequest } from './utils/contact-request.utils';
import { contactDetailsValidator } from './validators/contact-details.validator';

interface CategoryOption {
  label: string;
  value: ContactCategory;
}

type ContactForm = FormGroup<{
  category: FormControl<ContactCategory>;
  message: FormControl<string>;
  name: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  pageOrBooking: FormControl<string>;
}>;

@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectButtonModule,
    TextareaModule,
    TitledPage,
    NoticeMessage,
    PhoneField,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly contactService: ContactService = inject(ContactService);
  private readonly router: Router = inject(Router);
  private readonly injector: Injector = inject(Injector);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  protected readonly phoneLinks: Signal<PhoneLinks> = this.store.selectSignal(shopFeature.selectPhoneLinks);
  protected readonly bookingUrl: Signal<string> = this.store.selectSignal(shopFeature.selectBookingUrl);
  protected readonly isSending: WritableSignal<boolean> = signal(false);
  protected readonly isSent: WritableSignal<boolean> = signal(false);
  protected readonly notice: WritableSignal<Notice | null> = signal(null);

  protected readonly sentNotice: Notice = CONTACT_SENT_NOTICE;
  protected readonly messageMaxLength: number = MESSAGE_MAX_LENGTH;
  protected readonly nameMaxLength: number = NAME_MAX_LENGTH;
  protected readonly emailMaxLength: number = EMAIL_MAX_LENGTH;
  protected readonly pageOrBookingMaxLength: number = PAGE_OR_BOOKING_MAX_LENGTH;
  protected readonly categoryOptions: CategoryOption[] = [
    {
      label: 'Question',
      value: ContactCategory.Question,
    },
    {
      label: 'Report a problem',
      value: ContactCategory.Issue,
    },
    {
      label: 'Feedback',
      value: ContactCategory.Feedback,
    },
  ];

  protected readonly contactForm: ContactForm = new FormGroup(
    {
      category: new FormControl<ContactCategory>(ContactCategory.Question, { nonNullable: true }),
      message: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/\S/),
        ],
      }),
      name: new FormControl('', { nonNullable: true }),
      email: new FormControl('', {
        nonNullable: true,
        validators: Validators.email,
      }),
      phone: new FormControl('', {
        nonNullable: true,
        validators: PHONE_PATTERN_VALIDATOR,
      }),
      pageOrBooking: new FormControl('', { nonNullable: true }),
    },
    { validators: contactDetailsValidator },
  );
  private readonly contactFormValue: Signal<ContactFormValue> = toSignal(
    this.contactForm.valueChanges.pipe(map((): ContactFormValue => this.contactForm.getRawValue())),
    { initialValue: this.contactForm.getRawValue() },
  );

  protected readonly isAnonymousAllowed: Signal<boolean> = computed((): boolean =>
    this.contactFormValue().category === ContactCategory.Feedback);
  protected readonly isIssue: Signal<boolean> = computed((): boolean =>
    this.contactFormValue().category === ContactCategory.Issue);

  // `invalid`, not `valid`: a disabled form is never valid. Reading the form's value makes the check run again as the
  // visitor types, since validity itself isn't a signal.
  protected readonly canSend: Signal<boolean> = computed((): boolean => {
    this.contactFormValue();
    return !this.contactForm.invalid && !this.isSending();
  });

  constructor() {
    this.fillFromNavigationState();
  }

  protected send(): void {
    if (!this.canSend()) {
      return;
    }
    this.isSending.set(true);
    this.notice.set(null);
    // Without events, so locking and unlocking doesn't count as the visitor typing.
    this.contactForm.disable({ emitEvent: false });
    this.contactService.sendMessage(toContactRequest(this.contactForm.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (): void => {
          this.isSending.set(false);
          this.isSent.set(true);
          this.focusSentNotice();
        },
        error: (error: unknown): void => {
          this.isSending.set(false);
          this.contactForm.enable({ emitEvent: false });
          this.notice.set(toProblemNotice(
            error,
            CONTACT_PROBLEM_NOTICES,
            CONTACT_FAILED_NOTICE,
          ));
        },
      });
  }

  private fillFromNavigationState(): void {
    const prefill: ContactPrefill | null = toContactPrefill(this.router.currentNavigation()?.extras.state);
    if (prefill) {
      this.contactForm.patchValue({
        category: prefill.category,
        pageOrBooking: prefill.pageOrBooking.slice(0, PAGE_OR_BOOKING_MAX_LENGTH),
      });
    }
  }

  private focusSentNotice(): void {
    afterNextRender(
      (): void => {
        document.getElementById('contact-sent')?.focus();
      },
      { injector: this.injector },
    );
  }
}
