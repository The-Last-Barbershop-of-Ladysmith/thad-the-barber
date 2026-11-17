/** What Google Identity Services hands the page after a sign-in. `credential` is the ID token the API verifies. */
export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleButtonOptions {
  type: 'standard';
  theme: 'outline' | 'filled_black';
  size: 'large';
  text: 'signin_with';
  shape: 'rectangular';
  logo_alignment: 'left';
  width: number;
}

/** The part of Google's `window.google.accounts.id` this app uses. */
export interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select: boolean;
  }) => void;
  renderButton: (container: HTMLElement, options: GoogleButtonOptions) => void;
}

export interface GoogleWindow extends Window {
  google?: { accounts: { id: GoogleAccountsId; }; };
}
