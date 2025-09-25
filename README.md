# Korean Translator App

A simple web app to translate Korean sentences using GPT‑4o. It returns a natural full-sentence translation and a word-by-word gloss so learners can understand each token.

## Features
- Korean → target language via GPT‑4o
- Full sentence translation
- Word-by-word meanings in original order
- Clean UI with light/dark mode toggle

## Prerequisites
- Node.js 18+
- An OpenAI API key with access to `gpt-4o`

## Setup
1. Create an `.env` file in the project root with:

```
OPENAI_API_KEY=sk-...your-key...
PORT=3000
```

2. Install dependencies:

```
npm install
```

3. Start the server (development with auto-reload):

```
npm run dev
```

Or start without nodemon:

```
npm start
```

4. Open the app at `http://localhost:3000`.

## API
- POST `/api/translate`
  - body: `{ sentence: string, targetLang?: string }`
  - returns: `{ fullTranslation: string, words: { word: string, translation: string }[] }`

## Notes
- The server prompts GPT‑4o to emit strict JSON and parses it. If the upstream returns malformed JSON, the server responds with a 502 error.
- Segmentation of Korean tokens is heuristic by the model; particles may be attached or separated depending on clarity.

## License
MIT
