import { ActionReducer, createReducer, on } from '@ngrx/store';
import { RequestStatus } from '../../../shared/models/request.models';
import { GalleryPhoto } from '../models/gallery-photo.model';
import * as GalleryActions from './gallery.actions';
import { GalleryState, initialGalleryState } from './gallery.state';

export const galleryReducer: ActionReducer<GalleryState> = createReducer(
  initialGalleryState,
  on(
    GalleryActions.GalleryRequest,
    (state: GalleryState): GalleryState => ({
      ...state,
      loadStatus: RequestStatus.Pending,
    }),
  ),
  on(
    GalleryActions.GalleryRequestSuccess,
    (_state: GalleryState, { photos }: { photos: GalleryPhoto[]; }): GalleryState => ({
      photos,
      loadStatus: RequestStatus.Success,
    }),
  ),
  on(
    GalleryActions.GalleryRequestFailure,
    (state: GalleryState): GalleryState => ({
      ...state,
      loadStatus: RequestStatus.Error,
    }),
  ),
);
