import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockInstance } from 'vitest';
import { Store, provideStore } from '@ngrx/store';
import { GoogleSignInService } from '../../../../core/services/google-sign-in.service';
import { AppState } from '../../../../store/app.state';
import { AdminSignInError } from '../../models/admin-sign-in-error.model';
import * as AdminActions from '../../state/admin.actions';
import { adminFeature } from '../../state/admin.feature';
import { SignIn } from './sign-in';

interface RenderCall {
  clientId: string;
  container: HTMLElement;
  onCredential: (idToken: string) => void;
}

describe(
  'SignIn',
  (): void => {
    let fixture: ComponentFixture<SignIn>;
    let store: Store<AppState>;
    let dispatchSpy: MockInstance<Store<AppState>['dispatch']>;
    let renders: RenderCall[];
    let renderResult: Promise<void>;

    function text(selector: string): string | null {
      return (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent.trim() ?? null;
    }

    async function settle(): Promise<void> {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    beforeEach((): void => {
      renders = [];
      renderResult = Promise.resolve();
      TestBed.configureTestingModule({
        providers: [
          provideStore({ [adminFeature.name]: adminFeature.reducer }),
          {
            provide: GoogleSignInService,
            useValue: {
              renderButton: (
                clientId: string,
                container: HTMLElement,
                onCredential: (idToken: string) => void,
              ): Promise<void> => {
                renders.push({
                  clientId,
                  container,
                  onCredential,
                });
                return renderResult;
              },
            },
          },
        ],
      });
      store = TestBed.inject<Store<AppState>>(Store);
      fixture = TestBed.createComponent(SignIn);
      dispatchSpy = vi.spyOn(store, 'dispatch');
      fixture.detectChanges();
    });

    it(
      'asks for the Google client ID when it opens',
      (): void => {
        expect(dispatchSpy).toHaveBeenCalledWith(AdminActions.AdminConfigRequest());
      },
    );

    it(
      'draws Google’s button once it has the client ID, and signs in with the token it gives back',
      async (): Promise<void> => {
        store.dispatch(AdminActions.AdminConfigRequestSuccess({ googleClientId: 'client-1' }));
        await settle();

        expect(renders).toHaveLength(1);
        expect(renders[0]?.clientId).toBe('client-1');
        expect(renders[0]?.container.getAttribute('data-testid')).toBe('google-button');

        renders[0]?.onCredential('id-token-1');

        expect(dispatchSpy).toHaveBeenCalledWith(AdminActions.AdminSignInRequest({ idToken: 'id-token-1' }));
      },
    );

    it(
      'shows it is getting ready from the start until Google’s button is drawn',
      async (): Promise<void> => {
        let drawn: () => void = (): void => undefined;
        renderResult = new Promise<void>((resolve: () => void): void => {
          drawn = resolve;
        });
        expect(text('[data-testid="admin-sign-in-loading"]')).not.toBeNull();

        store.dispatch(AdminActions.AdminConfigRequestSuccess({ googleClientId: 'client-1' }));
        await settle();
        expect(text('[data-testid="admin-sign-in-loading"]')).not.toBeNull();

        drawn();
        await settle();
        expect(text('[data-testid="admin-sign-in-loading"]')).toBeNull();
      },
    );

    it(
      'stops showing it is getting ready when something is wrong instead',
      async (): Promise<void> => {
        store.dispatch(AdminActions.AdminConfigRequestFailure({ error: AdminSignInError.Unavailable }));
        await settle();

        expect(text('[data-testid="admin-sign-in-loading"]')).toBeNull();
        expect(text('[data-testid="admin-sign-in-message"]')).not.toBeNull();
      },
    );

    it(
      'shows no button before the client ID arrives',
      (): void => {
        expect(text('[data-testid="google-button"]')).toBeNull();
        expect(renders).toHaveLength(0);
      },
    );

    it.each([
      [AdminSignInError.NotAuthorized, 'can’t manage this site'],
      [AdminSignInError.InvalidToken, 'couldn’t verify'],
      [AdminSignInError.Unavailable, 'isn’t set up'],
      [AdminSignInError.Failed, 'didn’t work'],
    ])(
      'says what went wrong for %s',
      async (error: AdminSignInError, words: string): Promise<void> => {
        store.dispatch(AdminActions.AdminConfigRequestFailure({ error }));
        await settle();

        expect(text('[data-testid="admin-sign-in-message"]')).toContain(words);
      },
    );

    it(
      'tells an admin whose session ran out so, as information and not an error',
      async (): Promise<void> => {
        store.dispatch(AdminActions.AdminSessionEnded());
        await settle();

        const message: HTMLElement | null = (fixture.nativeElement as HTMLElement)
          .querySelector('[data-testid="admin-sign-in-message"]');
        expect(message?.textContent).toContain('session ended');
        expect(message?.classList.contains('p-message-info')).toBe(true);
      },
    );

    it(
      'says the sign-in could not load when Google’s script is blocked',
      async (): Promise<void> => {
        renderResult = Promise.reject(new Error('blocked'));
        store.dispatch(AdminActions.AdminConfigRequestSuccess({ googleClientId: 'client-1' }));
        await settle();
        await settle();

        expect(text('[data-testid="admin-sign-in-message"]')).toContain('didn’t work');
        expect(text('[data-testid="google-button"]')).toBeNull();
      },
    );

    it(
      'shows that it is signing in while the API checks the token',
      async (): Promise<void> => {
        store.dispatch(AdminActions.AdminSignInRequest({ idToken: 'id-token-1' }));
        await settle();

        expect(text('[data-testid="admin-signing-in"]')).toBe('Signing you in…');
      },
    );
  },
);
