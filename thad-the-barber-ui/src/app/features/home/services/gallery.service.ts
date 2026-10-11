import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GalleryPhoto } from '../models/home.models';

const SUPPORTED_EXTENSION: RegExp = /\.(jpe?g|png|webp|avif)$/i;

interface ListedPhoto extends GalleryPhoto { lastModified: number; }

/**
 * Every image in the media container's `gallery/` folder (issue #168), newest upload first, so Thad changes the gallery
 * by uploading or deleting files in the Azure portal. The container allows anonymous listing.
 */
@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http: HttpClient = inject(HttpClient);

  getPhotos(): Observable<GalleryPhoto[]> {
    return this.http
      .get(
        `${environment.mediaBaseUrl}?restype=container&comp=list&prefix=gallery/&delimiter=/`,
        { responseType: 'text' },
      )
      .pipe(map(toPhotos));
  }
}

function toPhotos(listingXml: string): GalleryPhoto[] {
  const listing: Document = new DOMParser().parseFromString(listingXml, 'application/xml');
  const photos: ListedPhoto[] = [];
  for (const blob of Array.from(listing.querySelectorAll('Blobs > Blob'))) {
    const name: string = blob.querySelector('Name')?.textContent ?? '';
    const fileName: string = name.slice('gallery/'.length);
    if (SUPPORTED_EXTENSION.test(fileName)) {
      photos.push({
        src: `${environment.mediaBaseUrl}/gallery/${encodeURIComponent(fileName)}`,
        alt: altText(fileName),
        lastModified: Date.parse(blob.querySelector('Properties > Last-Modified')?.textContent ?? ''),
      });
    }
  }
  return photos
    .sort((a: ListedPhoto, b: ListedPhoto): number => b.lastModified - a.lastModified)
    .map(({ src, alt }: ListedPhoto): GalleryPhoto => ({ src, alt }));
}

/** `skin-fade_beard.jpg` → "Skin fade beard": naming the file is how Thad writes the alt text. */
function altText(fileName: string): string {
  const words: string = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_\s]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
