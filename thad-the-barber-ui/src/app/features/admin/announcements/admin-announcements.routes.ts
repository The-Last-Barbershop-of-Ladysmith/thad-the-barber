import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { RouteSeo } from '../../../shared/models/route-seo.model';
import { AnnouncementEdit } from './pages/announcement-edit/announcement-edit';
import { AnnouncementText } from './pages/announcement-text/announcement-text';
import { AnnouncementsList } from './pages/announcements-list/announcements-list';
import * as adminAnnouncementTextsEffects from './state/admin-announcement-texts.effects';
import { adminAnnouncementTextsFeature } from './state/admin-announcement-texts.feature';
import * as adminAnnouncementsEffects from './state/admin-announcements.effects';
import { adminAnnouncementsFeature } from './state/admin-announcements.feature';

/** Each page has its own title, and none is shown to search engines (the server sends `noindex` for `/admin` too). */
function seoFor(title: string, description: string): RouteSeo {
  return {
    title: `${title} · {shopName}`,
    description: `${description} This area is not shown in search results.`,
    isIndexed: false,
  };
}

const listSeo: RouteSeo = seoFor(
  'Admin announcements',
  'The owner’s page for writing, scheduling and ending {shopName}’s announcements.',
);
const newSeo: RouteSeo = seoFor(
  'New announcement',
  'The owner’s form for writing a new announcement for {shopName}, with its dates, photo and buttons.',
);
const textSeo: RouteSeo = seoFor(
  'Text an announcement',
  'The owner’s page for checking and sending an announcement as a text to {shopName}’s subscribers.',
);
const editSeo: RouteSeo = seoFor(
  'Edit announcement',
  'The owner’s form for changing, rescheduling or deleting one of {shopName}’s announcements.',
);

// The slice and effects register once for the announcements pages, under the admin guard and shell.
export const ADMIN_ANNOUNCEMENTS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(adminAnnouncementsFeature),
      provideState(adminAnnouncementTextsFeature),
      provideEffects(adminAnnouncementsEffects),
      provideEffects(adminAnnouncementTextsEffects),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { seo: listSeo },
        component: AnnouncementsList,
      },
      {
        path: 'new',
        data: { seo: newSeo },
        component: AnnouncementEdit,
      },
      {
        path: 'text',
        data: { seo: textSeo },
        component: AnnouncementText,
      },
      {
        path: ':index',
        data: { seo: editSeo },
        component: AnnouncementEdit,
      },
    ],
  },
];
