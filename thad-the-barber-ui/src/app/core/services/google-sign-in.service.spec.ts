import { TestBed } from '@angular/core/testing';
import { GoogleAccountsId, GoogleCredentialResponse, GoogleWindow } from '../models/google-identity.models';
import { GoogleSignInService } from './google-sign-in.service';

interface InitializeConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

describe(
  'GoogleSignInService',
  (): void => {
    let service: GoogleSignInService;
    let appended: HTMLScriptElement[];
    let initialized: InitializeConfig[];
    let rendered: HTMLElement[];

    const accountsId: GoogleAccountsId = {
      initialize: (config: InitializeConfig): void => {
        initialized.push(config);
      },
      renderButton: (container: HTMLElement): void => {
        rendered.push(container);
      },
    };

    beforeEach((): void => {
      appended = [];
      initialized = [];
      rendered = [];
      service = TestBed.inject(GoogleSignInService);
      vi.spyOn(document.head, 'append').mockImplementation((...nodes: (Node | string)[]): void => {
        appended.push(
          ...nodes.filter((node: Node | string): node is HTMLScriptElement => node instanceof HTMLScriptElement),
        );
      });
    });

    afterEach((): void => {
      delete (window as GoogleWindow).google;
      vi.restoreAllMocks();
    });

    it(
      'loads Google’s script once, then draws the button and reports the ID token',
      async (): Promise<void> => {
        const host: HTMLElement = document.createElement('div');
        const credentials: string[] = [];

        const first: Promise<void> = service.renderButton(
          'client-1',
          host,
          (idToken: string): void => {
            credentials.push(idToken);
          },
        );
        (window as GoogleWindow).google = { accounts: { id: accountsId } };
        appended[0]?.onload?.(new Event('load'));
        await first;
        await service.renderButton(
          'client-1',
          host,
          (): void => undefined,
        );

        expect(appended).toHaveLength(1);
        expect(appended[0]?.src).toBe('https://accounts.google.com/gsi/client');
        expect(initialized[0]?.client_id).toBe('client-1');
        expect(rendered).toEqual([host, host]);
        initialized[0]?.callback({ credential: 'id-token-1' });
        expect(credentials).toEqual(['id-token-1']);
      },
    );

    it(
      'fails when Google’s script cannot be loaded, and tries again next time',
      async (): Promise<void> => {
        const host: HTMLElement = document.createElement('div');

        const failed: Promise<void> = service.renderButton(
          'client-1',
          host,
          (): void => undefined,
        );
        appended[0]?.onerror?.(new Event('error'));
        await expect(failed).rejects.toThrow('could not be loaded');

        void service.renderButton(
          'client-1',
          host,
          (): void => undefined,
        ).catch((): void => undefined);
        expect(appended).toHaveLength(2);
      },
    );

    it(
      'fails when the script loads without Google’s API',
      async (): Promise<void> => {
        const host: HTMLElement = document.createElement('div');

        const failed: Promise<void> = service.renderButton(
          'client-1',
          host,
          (): void => undefined,
        );
        appended[0]?.onload?.(new Event('load'));

        await expect(failed).rejects.toThrow('without its API');
      },
    );
  },
);
