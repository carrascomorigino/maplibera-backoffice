import type { GoogleGenAI } from '@google/genai';
import { translateSection } from './translate-section';

function fakeClient(responseText: string) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: responseText }),
    },
  } as unknown as GoogleGenAI;
}

describe('translateSection', () => {
  it('sends the source/target languages and content in the request', async () => {
    const client = fakeClient(
      JSON.stringify({ title: 'Título', description: 'Descripción' }),
    );

    await translateSection(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      title: 'Title',
      description: 'Description',
    });

    expect(client.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: JSON.stringify({
          title: 'Title',
          description: 'Description',
          question: undefined,
        }),
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('en'),
          responseMimeType: 'application/json',
        }),
      }),
    );
    const [[call]] = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls;
    expect(call.config.systemInstruction).toContain('es');
  });

  it('parses a valid JSON response into a SectionTranslation', async () => {
    const question = { text: 'Correcto?', type: 'yes-no' as const, yesNoCorrectAnswer: 'yes' as const };
    const client = fakeClient(
      JSON.stringify({ title: 'Título', description: 'Descripción', question }),
    );

    const result = await translateSection(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      title: 'Title',
      description: 'Description',
      question,
    });

    expect(result).toEqual({ title: 'Título', description: 'Descripción', question });
  });

  it('throws when the response is not valid JSON', async () => {
    const client = fakeClient('not json at all');

    await expect(
      translateSection(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        title: 'Title',
        description: 'Description',
      }),
    ).rejects.toThrow();
  });

  it('throws when the response JSON is missing required fields', async () => {
    const client = fakeClient(JSON.stringify({ title: 'Título' }));

    await expect(
      translateSection(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        title: 'Title',
        description: 'Description',
      }),
    ).rejects.toThrow();
  });

  it('throws when the response has no text', async () => {
    const client = {
      models: { generateContent: vi.fn().mockResolvedValue({ text: undefined }) },
    } as unknown as GoogleGenAI;

    await expect(
      translateSection(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        title: 'Title',
        description: 'Description',
      }),
    ).rejects.toThrow();
  });
});
