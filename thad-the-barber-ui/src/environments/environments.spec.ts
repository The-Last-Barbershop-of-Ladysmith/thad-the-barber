import { environment as devCloud } from './environment.dev-cloud';
import { environment as development } from './environment.development';
import { Environment } from './environment.model';
import { environment as test } from './environment.test';


const environments: Record<string, Environment> = {
  development,
  devCloud,
  test,
};

describe(
  'environment files',
  (): void => {
    it.each(Object.entries(environments))(
      '%s: apiBaseUrl is absolute and ends in /api',
      (_name: string, env: Environment): void => {
        expect(env.apiBaseUrl).toMatch(/^https?:\/\/[^/]+\/api$/);
      },
    );

    it.each(Object.entries(environments))(
      '%s: URLs have no trailing slash',
      (_name: string, env: Environment): void => {
        [env.siteUrl, env.mediaBaseUrl].forEach((url: string): void => {
          expect(url).not.toMatch(/\/$/);
        });
      },
    );

    it(
      'cloud builds use https',
      (): void => {
        [devCloud, test].forEach((env: Environment): void => {
          [
            env.apiBaseUrl,
            env.siteUrl,
            env.mediaBaseUrl,
          ].forEach((url: string): void => {
            expect(url).toMatch(/^https:\/\//);
          });
        });
      },
    );

    it(
      'each cloud build calls its own API',
      (): void => {
        expect(devCloud.apiBaseUrl).toContain('-dev-');
        expect(test.apiBaseUrl).toContain('-test-');
      },
    );

    it(
      'none of them is marked production',
      (): void => {
        Object.values(environments).forEach((env: Environment): void => {
          expect(env.production).toBe(false);
        });
      },
    );
  },
);
