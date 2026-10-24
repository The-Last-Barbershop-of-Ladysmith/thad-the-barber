import { Route } from '@playwright/test';
import { TEST_SHOP } from '../../src/testing/test-shop';
import { servedEnvironment } from './served-environment';

export const SHOP_URL: string = `${servedEnvironment.apiBaseUrl}/shop`;

export function isShopRequest(url: URL): boolean {
  return url.href === SHOP_URL;
}

export async function fulfillShop(route: Route): Promise<void> {
  await route.fulfill({ json: TEST_SHOP });
}
