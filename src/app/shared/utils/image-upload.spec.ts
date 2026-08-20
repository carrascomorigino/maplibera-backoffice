import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES, fileToDataUrl } from './image-upload';

describe('image-upload constants', () => {
  it('accepts jpeg, png and webp mime types', () => {
    expect(ACCEPTED_IMAGE_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('caps the max image size at 2MB', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe('fileToDataUrl', () => {
  it('resolves with a data URL for a small in-memory file', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });

    const result = await fileToDataUrl(file);

    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects when the FileReader errors', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const originalReadAsDataUrl = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (this: FileReader) {
      this.dispatchEvent(new Event('error'));
    };

    await expect(fileToDataUrl(file)).rejects.toBeDefined();

    FileReader.prototype.readAsDataURL = originalReadAsDataUrl;
  });
});
