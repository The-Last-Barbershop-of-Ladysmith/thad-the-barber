import { Route } from '@playwright/test';

const BLANK_PNG: Buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==', 'base64');

export function isStaticMap(url: URL): boolean {
  return url.href.startsWith('https://maps.googleapis.com/maps/api/staticmap?');
}

export async function fulfillStaticMap(route: Route): Promise<void> {
  await route.fulfill({ body: BLANK_PNG, contentType: 'image/png' });
}
