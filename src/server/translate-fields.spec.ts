import type { GoogleGenAI } from '@google/genai';
import { translateFields } from './translate-fields';

function fakeClient(responseText: string) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: responseText }),
    },
  } as unknown as GoogleGenAI;
}

describe('translateFields', () => {
  it('sends the source/target languages and fields in the request', async () => {
    const client = fakeClient(JSON.stringify({ title: 'Título', description: 'Descripción' }));

    await translateFields(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: { title: 'Title', description: 'Description' },
    });

    expect(client.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: JSON.stringify({ title: 'Title', description: 'Description' }),
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining('en'),
          responseMimeType: 'application/json',
        }),
      }),
    );
    const [[call]] = (client.models.generateContent as ReturnType<typeof vi.fn>).mock.calls;
    expect(call.config.systemInstruction).toContain('es');
  });

  it('parses a valid JSON response into a fields record', async () => {
    const client = fakeClient(JSON.stringify({ title: 'Título', description: 'Descripción' }));

    const result = await translateFields(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: { title: 'Title', description: 'Description' },
    });

    expect(result).toEqual({ title: 'Título', description: 'Descripción' });
  });

  it('round-trips a nested object field (e.g. a quiz question) unmodified in shape', async () => {
    const question = { text: 'Correcto?', type: 'yes-no', yesNoCorrectAnswer: 'yes' };
    const client = fakeClient(
      JSON.stringify({ title: 'Título', description: 'Descripción', question }),
    );

    const result = await translateFields(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: {
        title: 'Title',
        description: 'Description',
        question: { text: 'Correct?', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
      },
    });

    expect(result).toEqual({ title: 'Título', description: 'Descripción', question });
  });

  it('translates string-array fields', async () => {
    const client = fakeClient(
      JSON.stringify({ title: 'Título', ingredients: ['Harina', 'Azúcar'] }),
    );

    const result = await translateFields(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: { title: 'Title', ingredients: ['Flour', 'Sugar'] },
    });

    expect(result).toEqual({ title: 'Título', ingredients: ['Harina', 'Azúcar'] });
  });

  it('throws when the response is not valid JSON', async () => {
    const client = fakeClient('not json at all');

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { title: 'Title' },
      }),
    ).rejects.toThrow();
  });

  it('throws when the response has no text', async () => {
    const client = {
      models: { generateContent: vi.fn().mockResolvedValue({ text: undefined }) },
    } as unknown as GoogleGenAI;

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { title: 'Title' },
      }),
    ).rejects.toThrow();
  });

  it('throws when the response is missing a requested key', async () => {
    const client = fakeClient(JSON.stringify({ title: 'Título' }));

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { title: 'Title', description: 'Description' },
      }),
    ).rejects.toThrow();
  });

  it('throws when a string field comes back as an array', async () => {
    const client = fakeClient(JSON.stringify({ title: ['Título'] }));

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { title: 'Title' },
      }),
    ).rejects.toThrow();
  });

  it('throws when a string-array field comes back as a string', async () => {
    const client = fakeClient(JSON.stringify({ ingredients: 'Harina' }));

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { ingredients: ['Flour'] },
      }),
    ).rejects.toThrow();
  });

  it('throws when the response contains an extra key not in the request', async () => {
    const client = fakeClient(JSON.stringify({ title: 'Título', extra: 'Sobrante' }));

    await expect(
      translateFields(client, {
        sourceLanguage: 'en',
        targetLanguage: 'es',
        fields: { title: 'Title' },
      }),
    ).rejects.toThrow();
  });

  it('does not deep-validate the shape of object-valued fields, only their presence', async () => {
    const client = fakeClient(
      JSON.stringify({ title: 'Título', question: { anything: 'goes' } }),
    );

    const result = await translateFields(client, {
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: { title: 'Title', question: { text: 'Correct?', type: 'yes-no' } },
    });

    expect(result['question']).toEqual({ anything: 'goes' });
  });
});
