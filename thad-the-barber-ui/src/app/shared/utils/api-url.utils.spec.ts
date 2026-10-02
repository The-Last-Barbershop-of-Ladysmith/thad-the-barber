import { environment } from '../../../environments/environment';
import { apiUrl } from './api-url.utils';

describe(
  'apiUrl',
  (): void => {
    it(
      'prefixes the path with this build\'s environment.apiBaseUrl',
      (): void => {
        expect(apiUrl('/bookings')).toBe(`${environment.apiBaseUrl}/bookings`);
      },
    );

    it(
      'never doubles the slash between the base and the path',
      (): void => {
        expect(apiUrl('/health')).not.toContain('//health');
      },
    );
  },
);
