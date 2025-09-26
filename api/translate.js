import OpenAI from 'openai';

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    console.error('Translation error:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      apiKey: process.env.OPENAI_API_KEY ? 'Present' : 'Missing'
    });
    
    // Check for specific error types
    if (err.name === 'ConfigError' || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'API configuration error',
        message: 'OpenAI API key is not configured'
      });
    }
    
    if (err.response) {
      // OpenAI API error
      return res.status(err.response.status || 500).json({
        error: 'OpenAI API error',
        message: err.response.data?.error?.message || err.message
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message
    });
  }
}
