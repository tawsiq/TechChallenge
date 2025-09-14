LLM Proxy (example)

This folder contains a tiny Express server that proxies limited LLM requests.

Usage

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. npm init -y && npm install express node-fetch dotenv
3. node index.js

The server exposes POST /api/llm which accepts { prompt, engineResult } and forwards
it to the configured provider. If no provider key is set the endpoint returns 501 so the
client can fall back to the local synthesis.

Security notes
- Never commit real API keys. Use server-side environment variables.
- The server purposefully instructs the model to only summarise `engineResult` and not
  to invent new medication recommendations.
