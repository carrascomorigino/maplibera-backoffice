import type { Express } from 'express';
import { GoogleGenAI } from '@google/genai';
import { translateSection } from './translate-section';

export function registerTranslateRoute(app: Express): void {
  const geminiClient = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });

  app.post('/api/translate', async (req, res) => {
    try {
      const result = await translateSection(geminiClient, req.body);
      res.json(result);
    } catch {
      res.status(502).json({ error: 'translation_failed' });
    }
  });
}
