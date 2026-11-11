import { createAction, props } from '@ngrx/store';
import { GalleryPhoto } from '../models/gallery-photo.model';

export enum GalleryActionTypes {
  GalleryRequest = '[Gallery] Gallery Requested',
  GalleryRequestSuccess = '[Gallery API] Gallery Request Success',
  GalleryRequestFailure = '[Gallery API] Gallery Request Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const GalleryRequest = createAction(
  GalleryActionTypes.GalleryRequest,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const GalleryRequestSuccess = createAction(
  GalleryActionTypes.GalleryRequestSuccess,
  props<{ photos: GalleryPhoto[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const GalleryRequestFailure = createAction(
  GalleryActionTypes.GalleryRequestFailure,
);
