import { ImageValue } from '../models/image-value.model';
import { fileToDataUrl } from './image-upload';

export type ImagePayload = { url?: string; data?: string };

export async function resolveImagePayload(
  value: ImageValue | undefined,
): Promise<ImagePayload | undefined> {
  if (!value) {
    return undefined;
  }
  if (value.kind === 'url') {
    return { url: value.url };
  }
  return { data: await fileToDataUrl(value.file) };
}
