import type { GoogleGenAI } from '@google/genai';
import { ContentLanguage } from '../app/features/guide/models/content-language.model';

const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface TranslateFieldsRequest {
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
  fields: Record<string, unknown>;
}

export async function translateFields(
  client: GoogleGenAI,
  request: TranslateFieldsRequest,
): Promise<Record<string, unknown>> {
  // Read per request, not at module load, so the value reflects the environment
  // once dotenv has run. `||` rather than `??`: an empty GEMINI_API_MODEL (as in
  // .env.example) must fall back to the default instead of asking for model "".
  const model = process.env['GEMINI_API_MODEL'] || DEFAULT_MODEL;

  const response = await client.models.generateContent({
    model,
    contents: JSON.stringify(request.fields),
    config: {
      systemInstruction:
        `You are a professional translator. Translate the given JSON object's ` +
        `string and string-array values from ${request.sourceLanguage} to ` +
        `${request.targetLanguage}, preserving the exact set of keys and the ` +
        `structure of any nested objects or arrays. Respond with ONLY valid ` +
        `JSON matching the input shape, no prose.`,
      responseMimeType: 'application/json',
    },
  });

  return parseTranslationResponse(request.fields, response);
}

function parseTranslationResponse(
  requestFields: Record<string, unknown>,
  response: { text?: string },
): Record<string, unknown> {
  const text = response.text;
  if (!text) {
    throw new Error('Translation response did not contain text content');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Translation response was not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Translation response was not a JSON object');
  }

  const requestKeys = Object.keys(requestFields);
  const responseRecord = parsed as Record<string, unknown>;
  const responseKeys = Object.keys(responseRecord);

  if (
    requestKeys.length !== responseKeys.length ||
    !requestKeys.every((key) => responseKeys.includes(key))
  ) {
    throw new Error('Translation response did not match the requested set of fields');
  }

  for (const key of requestKeys) {
    const requestValue = requestFields[key];
    const responseValue = responseRecord[key];
    if (typeof requestValue === 'string' && typeof responseValue !== 'string') {
      throw new Error(`Translation response field "${key}" was expected to be a string`);
    }
    if (Array.isArray(requestValue) && !Array.isArray(responseValue)) {
      throw new Error(`Translation response field "${key}" was expected to be an array`);
    }
  }

  return responseRecord;
}
