import { AdminSession } from '../models/admin-session.model';
import { adminFeature } from './admin.feature';
import { AdminState, initialAdminState } from './admin.state';

describe(
  'adminFeature selectors',
  (): void => {
    const session: AdminSession = {
      email: 'owner@example.com',
      name: 'Q. Testperson',
      expiresAt: '2031-02-28T12:30:00Z',
    };

    function stateOf(admin: AdminState): Record<string, AdminState> {
      return { [adminFeature.name]: admin };
    }

    it(
      'says nobody is signed in at first',
      (): void => {
        expect(adminFeature.selectIsSignedIn(stateOf(initialAdminState))).toBe(false);
        expect(adminFeature.selectEmail(stateOf(initialAdminState))).toBe('');
        expect(adminFeature.selectName(stateOf(initialAdminState))).toBeNull();
      },
    );

    it(
      'says who is signed in',
      (): void => {
        const signedIn: Record<string, AdminState> = stateOf({
          ...initialAdminState,
          session,
        });

        expect(adminFeature.selectIsSignedIn(signedIn)).toBe(true);
        expect(adminFeature.selectEmail(signedIn)).toBe('owner@example.com');
        expect(adminFeature.selectName(signedIn)).toBe('Q. Testperson');
      },
    );
  },
);
