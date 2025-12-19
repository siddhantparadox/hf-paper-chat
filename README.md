# HuggingPapers

A modern, brutalist-designed chat interface for discussing ArXiv papers, powered by OpenRouter and Gemini 3 Flash Preview.

## Features

- **Paper Discovery**: Browse trending papers from Hugging Face Daily Papers with date filtering.
- **Multi-Turn Chat**: Have full conversations about papers with context-aware AI. History persists per paper.
- **Interactive Assistant**: AI has context about the paper's title, authors, and abstract.
- **Brutalist Design**: A unique, high-contrast aesthetic using "Neo-Brutalism" principles.
- **Streaming Responses**: Real-time AI responses with animated markdown rendering.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **AI**: OpenRouter API (accessing Google Gemini 3 Flash Preview)
- **Backend**: Convex (database + realtime + auth)
- **Data**: Hugging Face Daily Papers API

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- An OpenRouter API Key
- A Convex account (for `npx convex dev`)
- (Optional) A Resend API key (for magic-link sign-in)

### Installation

1. Clone the repository (if applicable).
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Create (or edit) `.env.local` in the project root.
2. Add your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=sk-or-your-key-here
   ```

### Running Locally (Frontend + Convex)

This project has two moving parts:
- **Convex dev server** (Convex functions + database + auth)
- **Vite dev server** (React frontend)

1. Start Convex (keep this running in one terminal):
   ```bash
   npx convex dev
   ```
   This will generate/update `convex/_generated/*` and will create/update `.env.local` with `VITE_CONVEX_URL`.

2. Start the frontend (in a second terminal):
   ```bash
   npm run dev
   ```

3. Open the app at `http://localhost:3000`.

#### Auth (Magic Links)

- Configure backend env vars in the Convex dashboard: **Settings → Environment Variables**
  - `SITE_URL=http://localhost:3000` (must match the URL/port you open in the browser)
  - `AUTH_RESEND_KEY=...` (your Resend API key)
- Restart `npx convex dev` after changing env vars.

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build for production.
- `npm run preview`: Preview the production build.

## License

MIT
