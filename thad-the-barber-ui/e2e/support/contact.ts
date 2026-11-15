import { servedEnvironment } from './served-environment';

const CONTACT_URL: string = `${servedEnvironment.apiBaseUrl}/contact`;

export function isContactRequest(url: URL): boolean {
  return `${url.origin}${url.pathname}` === CONTACT_URL;
}
