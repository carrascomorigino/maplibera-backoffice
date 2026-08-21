import { ImageValue } from '../models/image-value.model';
import { resolveImagePayload } from './image-payload';

describe('resolveImagePayload', () => {
  it('resolves to undefined when the value is undefined', async () => {
    const result = await resolveImagePayload(undefined);

    expect(result).toBeUndefined();
  });

  it('resolves to { url } for a url value', async () => {
    const value: ImageValue = { kind: 'url', url: 'https://example.com/a.jpg' };

    const result = await resolveImagePayload(value);

    expect(result).toEqual({ url: 'https://example.com/a.jpg' });
  });

  it('resolves to { data } for an upload value, converting the file to a data URL', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const value: ImageValue = { kind: 'upload', file };

    const result = await resolveImagePayload(value);

    expect(result?.data).toMatch(/^data:image\/png;base64,/);
    expect(result?.url).toBeUndefined();
  });
});
