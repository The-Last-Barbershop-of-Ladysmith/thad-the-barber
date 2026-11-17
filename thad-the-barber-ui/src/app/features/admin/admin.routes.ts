import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { RouteSeo } from '../../shared/models/route-seo.model';
import { AdminShell } from './components/admin-shell/admin-shell';
import { adminGuard, signInGuard } from './guards/admin.guard';
import { Overview } from './pages/overview/overview';
import { SignIn } from './pages/sign-in/sign-in';
import * as adminEffects from './state/admin.effects';
import { adminFeature } from './state/admin.feature';

/** Never for search engines: `/admin` is left out of the sitemap, and the server sends `noindex` for it too. */
const signInSeo: RouteSeo = {
  title: 'Admin sign in · {shopName}',
  description: 'Sign in with Google to manage {shopName}’s announcements and gallery. '
    + 'This area is for the shop owner only and is not shown in search results.',
  isIndexed: false,
};

const overviewSeo: RouteSeo = {
  title: 'Admin overview · {shopName}',
  description: 'The owner’s overview of {shopName}’s announcements and gallery, once signed in with Google. '
    + 'This area is not shown in search results.',
  isIndexed: false,
};

// The admin slice and effects register once for /admin; the sign-in page is at /admin and everything else is behind
// the guard, inside the shell.
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(adminFeature),
      provideEffects(adminEffects),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { seo: signInSeo },
        canActivate: [signInGuard],
        component: SignIn,
      },
      {
        path: '',
        component: AdminShell,
        canActivate: [adminGuard],
        children: [
          {
            path: 'overview',
            data: { seo: overviewSeo },
            component: Overview,
          },
        ],
      },
    ],
  },
];
