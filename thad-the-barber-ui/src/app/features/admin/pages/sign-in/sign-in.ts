import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { GoogleSignInService } from '../../../../core/services/google-sign-in.service';
import { RequestStatus } from '../../../../shared/models/request.models';
import { AppState } from '../../../../store/app.state';
import { AdminStyles } from '../../components/admin-styles/admin-styles';
import { AdminSignInError } from '../../models/admin-sign-in-error.model';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';
import { toSignInMessage } from '../../utils/sign-in-message.utils';

/** Sign in with Google, then the overview. Problems are said here, on the page, in words the owner can act on. */
@Component({
  selector: 'app-admin-sign-in',
  imports: [
    MessageModule,
    SkeletonModule,
    AdminStyles,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn implements OnInit {
  private readonly store: Store<AppState> = inject<Store<AppState>>(Store);
  private readonly googleSignIn: GoogleSignInService = inject(GoogleSignInService);

  private readonly googleClientId: Signal<string | null> = this.store.selectSignal(adminFeature.selectGoogleClientId);
  private readonly error: Signal<AdminSignInError | null> = this.store.selectSignal(adminFeature.selectSignInError);
  private readonly signInStatus: Signal<RequestStatus> = this.store.selectSignal(adminFeature.selectSignInStatus);
  private readonly isGoogleBlocked: WritableSignal<boolean> = signal(false);
  private readonly isButtonDrawn: WritableSignal<boolean> = signal(false);
  private readonly buttonHost: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('googleButton');

  protected readonly isSigningIn: Signal<boolean> = computed(
    (): boolean => this.signInStatus() === RequestStatus.Pending,
  );
  protected readonly isButtonShown: Signal<boolean> = computed(
    (): boolean => this.googleClientId() !== null && !this.isGoogleBlocked(),
  );
  /** From the page opening until Google's button is drawn (or something is said to be wrong). */
  protected readonly isLoadingButton: Signal<boolean> = computed(
    (): boolean => this.message() === null && !this.isButtonDrawn(),
  );
  protected readonly message: Signal<string | null> = computed((): string | null => {
    if (this.isGoogleBlocked()) {
      return toSignInMessage(AdminSignInError.Failed);
    }
    const error: AdminSignInError | null = this.error();
    return error ? toSignInMessage(error) : null;
  });
  /** A session that ran out is news, not an error: the admin did nothing wrong. */
  protected readonly isSessionEnd: Signal<boolean> = computed(
    (): boolean => this.error() === AdminSignInError.SessionEnded,
  );

  constructor() {
    effect((): void => {
      const clientId: string | null = this.googleClientId();
      const host: ElementRef<HTMLElement> | undefined = this.buttonHost();
      if (clientId && host) {
        this.googleSignIn
          .renderButton(
            clientId,
            host.nativeElement,
            (idToken: string): void => {
              this.store.dispatch(AdminActions.AdminSignInRequest({ idToken }));
            },
          )
          .then((): void => {
            this.isButtonDrawn.set(true);
          })
          .catch((): void => {
            this.isGoogleBlocked.set(true);
          });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(AdminActions.AdminConfigRequest());
  }
}
