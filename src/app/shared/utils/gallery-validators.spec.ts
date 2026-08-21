import { FormControl } from '@angular/forms';
import { GalleryImageValue } from '../models/gallery-image-value.model';
import { atLeastOneGalleryImage } from './gallery-validators';

describe('atLeastOneGalleryImage', () => {
  function control(value: GalleryImageValue[]) {
    return new FormControl<GalleryImageValue[]>(value, { nonNullable: true });
  }

  it('returns a galleryRequired error when the array is empty', () => {
    expect(atLeastOneGalleryImage(control([]))).toEqual({ galleryRequired: true });
  });

  it('returns a galleryRequired error when every row has no image', () => {
    const value: GalleryImageValue[] = [{ description: 'no image yet' }, {}];

    expect(atLeastOneGalleryImage(control(value))).toEqual({ galleryRequired: true });
  });

  it('returns a galleryRequired error when every row has a blank url image', () => {
    const value: GalleryImageValue[] = [{ image: { kind: 'url', url: '   ' } }];

    expect(atLeastOneGalleryImage(control(value))).toEqual({ galleryRequired: true });
  });

  it('returns null when at least one row has a resolved url image', () => {
    const value: GalleryImageValue[] = [
      {},
      { image: { kind: 'url', url: 'https://example.com/a.jpg' } },
    ];

    expect(atLeastOneGalleryImage(control(value))).toBeNull();
  });

  it('returns null when at least one row has an uploaded image', () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const value: GalleryImageValue[] = [{ image: { kind: 'upload', file } }];

    expect(atLeastOneGalleryImage(control(value))).toBeNull();
  });

  it('treats an undefined control value as an empty array', () => {
    const emptyControl = new FormControl<GalleryImageValue[] | undefined>(undefined);

    expect(atLeastOneGalleryImage(emptyControl)).toEqual({ galleryRequired: true });
  });
});
