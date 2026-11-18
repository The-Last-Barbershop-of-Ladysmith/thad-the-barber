import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { RouteSeo } from '../../../shared/models/route-seo.model';
import { GalleryAdmin } from './pages/gallery-admin/gallery-admin';
import * as adminGalleryEffects from './state/admin-gallery.effects';
import { adminGalleryFeature } from './state/admin-gallery.feature';

/** Not shown to search engines; the server sends `noindex` for `/admin` too. */
const gallerySeo: RouteSeo = {
  title: 'Admin gallery · {shopName}',
  description: 'The owner’s page for adding and removing the photos in {shopName}’s gallery. '
    + 'This area is not shown in search results.',
  isIndexed: false,
};

// The slice and effects register once for the gallery admin page, under the admin guard and shell.
export const ADMIN_GALLERY_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(adminGalleryFeature),
      provideEffects(adminGalleryEffects),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { seo: gallerySeo },
        component: GalleryAdmin,
      },
    ],
  },
];
