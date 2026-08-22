# Evalix

Evalix is a small AI response evaluation playground. It lets you paste an AI-generated response and get a deterministic evaluation (heuristic) for accuracy, clarity, and completeness. This repository contains a simple frontend and a minimal Node/Express backend that runs a deterministic evaluator.

## What's included

- index.html — static frontend (HTML/CSS/JS)
- style.css — styles and accessibility helpers
- script.js — frontend logic (fetches /evaluate or falls back to a local evaluator)
- server.js — minimal Express server exposing POST /evaluate
- lib/evaluator.js — deterministic evaluator used by the server and frontend fallback
- tests/ — Jest unit and integration tests
- package.json — scripts for start/dev/lint/test
- .github/workflows/ci.yml — CI for lint and tests

## Run locally

1. Install dependencies

   npm install

2. Start the backend (ports)

   npm run dev

   By default the server runs on port 3000. You can set PORT environment variable to change it.

3. Serve the frontend (in another shell)

   npx http-server -p 8000

   Open http://localhost:8000/index.html in your browser.

- If the backend is running and reachable at /evaluate on the same origin, the frontend will call it.
- If the backend is not available, the frontend will use a local deterministic evaluator so the UI remains usable.

## API: POST /evaluate

Request: POST /evaluate
Content-Type: application/json

Body:

{
  "prompt": "optional string",
  "response": "string (required)"
}

Response: 200 OK

{
  "overall": number,       // 0-100
  "accuracy": number,      // 0-100
  "clarity": number,       // 0-100
  "completeness": number,  // 0-100
  "feedback": ["string"] // array of feedback strings
}

Errors:
- 400 Bad Request — missing or invalid "response"
- 500 Internal Server Error — evaluator error

## Tests

Run unit and integration tests with:

npm test

## Lint

npm run lint

## Notes and next steps

- The current backend uses a deterministic heuristic evaluator (lib/evaluator.js). For real evaluation you could integrate an LLM provider (OpenAI, Anthropic). If desired I can add an optional integration that calls an LLM and returns structured scores. API keys should be provided via environment variables and never committed.

- The logo in the repo is currently a PNG. I recommend optimizing it (WebP, resizing) for production. The repo will keep the original PNG by default.

- Accessibility: I added basic aria-live and a label for the textarea; further improvements can be made (aria-describedby, more descriptive labels, keyboard shortcuts).

- CI: There's a GitHub Actions workflow in .github/workflows/ci.yml that runs lint and tests on push/PR to help catch regressions.
