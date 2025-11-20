# HuggingXiv Chat

A modern, brutalist-designed chat interface for discussing ArXiv papers, powered by OpenRouter and Gemini 2.5 Flash.

## Features

- **Paper Discovery**: Browse trending papers from Hugging Face Daily Papers.
- **Interactive Chat**: Discuss papers with an AI assistant that has context about the paper's abstract.
- **Brutalist Design**: A unique, high-contrast aesthetic using "Neo-Brutalism" principles.
- **Streaming Responses**: Real-time AI responses.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **AI**: OpenRouter API (accessing Google Gemini 2.5 Flash)
- **Data**: Hugging Face Daily Papers API

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- An OpenRouter API Key

### Installation

1. Clone the repository (if applicable).
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

1. Create a `.env.local` file in the root directory.
2. Add your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=sk-or-your-key-here
   ```

### Running Locally

To start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build for production.
- `npm run preview`: Preview the production build.

## License

MIT
