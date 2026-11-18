import { DOCUMENT } from '@angular/common';
import { CSP_NONCE, Injectable, inject } from '@angular/core';
import { GoogleAccountsId, GoogleCredentialResponse, GoogleWindow } from '../models/google-identity.models';

const GOOGLE_SCRIPT_URL: string = 'https://accounts.google.com/gsi/client';
const MAX_BUTTON_WIDTH: number = 400;

type ScriptLoad = Promise<GoogleAccountsId>;

/**
 * Google Identity Services: loads Google's script when the admin sign-in page asks, then draws Google's own button and
 * reports the ID token it gives back. Nothing loads for visitors of the public site.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSignInService {
  private readonly document: Document = inject(DOCUMENT);
  private readonly nonce: string | null = inject(CSP_NONCE, { optional: true });

  private scriptLoad: ScriptLoad | null = null;

  /** Draws the button in `container`; `onCredential` gets the ID token when the admin picks an account. */
  async renderButton(
    clientId: string,
    container: HTMLElement,
    onCredential: (idToken: string) => void,
  ): Promise<void> {
    const accountsId: GoogleAccountsId = await this.load();
    accountsId.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse): void => {
        onCredential(response.credential);
      },
      auto_select: false,
    });
    accountsId.renderButton(container, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(MAX_BUTTON_WIDTH, container.clientWidth || MAX_BUTTON_WIDTH),
    });
  }

  private load(): ScriptLoad {
    this.scriptLoad ??= new Promise<GoogleAccountsId>(
      (resolve: (value: GoogleAccountsId) => void, reject: (reason: Error) => void): void => {
        const script: HTMLScriptElement = this.document.createElement('script');
        script.src = GOOGLE_SCRIPT_URL;
        script.async = true;
        if (this.nonce) {
          script.nonce = this.nonce;
        }
        script.onload = (): void => {
          const accountsId: GoogleAccountsId | undefined = this.findAccountsId();
          if (accountsId) {
            resolve(accountsId);
            return;
          }
          this.scriptLoad = null;
          reject(new Error('Google sign-in loaded without its API.'));
        };
        script.onerror = (): void => {
          this.scriptLoad = null;
          reject(new Error('Google sign-in could not be loaded.'));
        };
        this.document.head.append(script);
      },
    );
    return this.scriptLoad;
  }

  private findAccountsId(): GoogleAccountsId | undefined {
    return (this.document.defaultView as GoogleWindow | null)?.google?.accounts.id;
  }
}
