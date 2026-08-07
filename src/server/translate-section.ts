import type { GoogleGenAI } from '@google/genai';
import { ContentLanguage } from '../app/features/guide/models/content-language.model';
import { Question, SectionTranslation } from '../app/features/guide/models/section.model';

const MODEL = 'gemini-flash-latest';

export interface TranslateSectionRequest {
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
  title: string;
  description: string;
  question?: Question;
}

export async function translateSection(
  client: GoogleGenAI,
  request: TranslateSectionRequest,
): Promise<SectionTranslation> {
  const response = await client.models.generateContent({
    model: MODEL,
    contents: JSON.stringify({
      title: request.title,
      description: request.description,
      question: request.question,
    }),
    config: {
      systemInstruction:
        `You are a professional translator for an app guide. Translate the given JSON ` +
        `fields from ${request.sourceLanguage} to ${request.targetLanguage}, preserving ` +
        `markdown formatting in "description" and the exact structure of ` +
        `"question"/"answers". Respond with ONLY valid JSON matching the input shape, no prose.`,
      responseMimeType: 'application/json',
    },
  });

  return parseTranslationResponse(response);
}

function parseTranslationResponse(response: { text?: string }): SectionTranslation {
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

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { title?: unknown }).title !== 'string' ||
    typeof (parsed as { description?: unknown }).description !== 'string'
  ) {
    throw new Error('Translation response did not match the expected shape');
  }

  return parsed as SectionTranslation;
}
