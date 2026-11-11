import { MemoizedSelector, createFeature, createSelector } from '@ngrx/store';
import { FeatureSelectors } from '../../../shared/models/ngrx.models';
import { isLoading } from '../../../shared/utils/request.utils';
import { galleryReducer } from './gallery.reducer';
import { GalleryState } from './gallery.state';

/** Selectors derived from the generated ones; exposed on `galleryFeature` alongside them. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extraSelectors needs a type alias.
export type GalleryExtraSelectors = {
  selectIsLoading: MemoizedSelector<object, boolean>;
};

export const galleryFeatureKey: 'gallery' = 'gallery' as const;

/**
 * The photos in the media container's `gallery/` folder. Registered with its effects on the home route, the only page
 * that shows it, so no other page requests them. Not saved, so a deleted photo never comes back from storage.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the Feature type.
export const galleryFeature = createFeature({
  name: galleryFeatureKey,
  reducer: galleryReducer,
  extraSelectors: ({ selectLoadStatus }: FeatureSelectors<GalleryState>): GalleryExtraSelectors => ({
    selectIsLoading: createSelector(
      selectLoadStatus,
      isLoading,
    ),
  }),
});
