# Tech Context

## Technologies Used
-   **Runtime/Environment**: Node.js (v18+ required), Browser (modern).
-   **Language**: TypeScript (v5.8.2)
-   **Framework**: React (v19.2.0)
-   **Build Tool**: Vite (v6.2.0)
-   **Styling**: Tailwind CSS v4 (via CDN/Script)
-   **AI/LLM**: OpenRouter API / Google Gemini 2.5 Flash (via `@google/genai` or `openai` client, or direct fetch).
-   **Markdown Rendering**: `streamdown` (v1.5.1)
-   **Fonts**: Google Fonts (Space Grotesk)

## Development Setup
-   **Package Manager**: npm
-   **Local Server**: `npm run dev` (Vite)
-   **Environment Variables**: `.env.local` is required for storing `OPENROUTER_API_KEY`.

## Constraints & Dependencies
-   **Browser Support**: Uses ES Modules and Import Maps, so requires modern browsers.
-   **External APIs**:
    -   **Hugging Face Daily Papers**: Source for paper data. Availability depends on HF API uptime.
    -   **OpenRouter**: Critical for chat functionality. Requires a valid API key and credits.
-   **Styling System**: The use of Tailwind v4 alpha/beta (via CDN) might have some stability or compatibility quirks compared to standard v3 setups.

## Project Structure
```
d:/projects/huggingxiv-chat
├── components/         # React components (UI & Features)
├── services/           # API integration (AI, Hugging Face)
├── App.tsx             # Main application component
├── index.html          # Entry HTML, configures Import Maps & Tailwind
├── index.tsx           # Entry Point
├── types.ts            # TypeScript definitions
├── vite.config.ts      # Vite configuration
└── ... config files
