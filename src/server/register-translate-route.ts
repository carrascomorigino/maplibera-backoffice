import type { Express } from 'express';
import { GoogleGenAI } from '@google/genai';
import { translateFields } from './translate-fields';

export function registerTranslateRoute(app: Express): void {
  const geminiClient = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });

  app.post('/api/translate', async (req, res) => {
    try {
      const result = await translateFields(geminiClient, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'translation_failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
