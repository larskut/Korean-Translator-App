import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(rootDir, 'public')));

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/translate', async (req, res) => {
  try {
    const sentence = (req.body?.sentence || '').toString().trim();
    const targetLang = (req.body?.targetLang || 'English').toString().trim();

    if (!sentence) {
      return res.status(400).json({ error: 'Missing required field: sentence' });
    }

    const systemInstructions = [
      'You are a precise Korean-to-<TARGET> translator and analyzer.',
      'Given a Korean sentence, first identify the meaningful words/tokens in order.',
      'Then provide a natural full-sentence translation into <TARGET>.',
      'Also provide a per-word gloss mapping each original word to a concise <TARGET> translation.',
      'Maintain original word order and do not invent extra words; if particles attach, decide the most instructive segmentation and be consistent.',
      'Return ONLY valid JSON with keys: fullTranslation (string), words (array of { word, translation }).',
      'No additional commentary. Values must be UTF-8 text. Keep explanations concise.'
    ].join(' ');

    const userPayload = {
      targetLanguage: targetLang,
      sentence,
      format: {
        type: 'object',
        properties: {
          fullTranslation: { type: 'string' },
          words: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                translation: { type: 'string' }
              },
              required: ['word', 'translation']
            }
          }
        },
        required: ['fullTranslation', 'words']
      }
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemInstructions.replaceAll('<TARGET>', targetLang)
        },
        {
          role: 'user',
          content: JSON.stringify(userPayload)
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      return res.status(502).json({ error: 'Upstream returned non-JSON', raw: content });
    }

    if (!data || typeof data.fullTranslation !== 'string' || !Array.isArray(data.words)) {
      return res.status(502).json({ error: 'Malformed response from model', raw: data });
    }

    // Normalize items
    const normalized = {
      fullTranslation: data.fullTranslation.trim(),
      words: data.words
        .filter(Boolean)
        .map((w) => ({
          word: (w.word ?? '').toString(),
          translation: (w.translation ?? '').toString()
        }))
        .filter((w) => w.word.length > 0)
    };

    res.json(normalized);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});


