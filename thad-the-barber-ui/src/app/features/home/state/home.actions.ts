import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { type HomeContent } from '../models/home.models';

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionGroup type.
export const HomePageActions = createActionGroup({
  source: 'Home Page',
  events: {
    /** Clears the slice back to its initial state (also overwrites its saved copy). */
    'State Reset': emptyProps(),
    Opened: emptyProps(),
    'Sms Signup Submitted': props<{ phone: string; }>(),
  },
});

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionGroup type.
export const HomeApiActions = createActionGroup({
  source: 'Home API',
  events: {
    'Content Loaded': props<{ content: HomeContent; }>(),
    'Content Load Failed': props<{ error: string; }>(),
    'Sms Signup Succeeded': props<{ phone: string; }>(),
    'Sms Signup Failed': props<{ error: string; }>(),
  },
});
