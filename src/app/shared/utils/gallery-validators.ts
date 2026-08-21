import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { GalleryImageValue } from '../models/gallery-image-value.model';

/**
 * Validates a control holding a `GalleryImageValue[]` and requires at least
 * one row to resolve to a real image: an upload, or a `url` image whose URL
 * is non-empty once trimmed. Rows with no image, or a blank/whitespace-only
 * URL, do not count.
 */
export const atLeastOneGalleryImage: ValidatorFn = (
  control: AbstractControl<GalleryImageValue[] | undefined>,
): ValidationErrors | null => {
  const rows = control.value ?? [];
  const hasResolvedImage = rows.some((row) => {
    const image = row.image;
    if (!image) {
      return false;
    }
    return image.kind === 'upload' || image.url.trim().length > 0;
  });
  return hasResolvedImage ? null : { galleryRequired: true };
};
