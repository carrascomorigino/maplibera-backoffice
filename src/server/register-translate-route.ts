import type { Express } from 'express';
import { GoogleGenAI } from '@google/genai';
import { translateFields } from './translate-fields';

export function registerTranslateRoute(app: Express): void {
  const geminiClient = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });

  app.post('/api/translate', async (req, res) => {
    try {
      const result = await translateFields(geminiClient, req.body);
      res.json(result);
    } catch {
      res.status(502).json({ error: 'translation_failed' });
    }
  });
}
