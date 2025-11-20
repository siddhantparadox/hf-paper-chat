# System Patterns

## Architecture
The application is a Single Page Application (SPA) built with React. It relies on client-side API calls to fetch data and interact with LLMs.

-   **Frontend**: React (v19) + Vite (v6)
-   **State Management**: Likely React Context or local state (need to verify `App.tsx` or store files if they exist).
-   **Styling**: Tailwind CSS v4 with a custom theme configuration for the "Neo-Brutalist" look.
-   **Routing**: Single view or simple conditional rendering (based on file list `App.tsx`, `components/`).

## Key Technical Decisions
1.  **Tailwind CSS v4 via CDN**: `index.html` imports Tailwind via a script tag `https://unpkg.com/@tailwindcss/browser@4` and uses `<style type="text/tailwindcss">`. This is an unconventional choice for a Vite project (usually installed via npm and PostCSS), possibly chosen for speed of prototyping or specific v4 features not yet fully integrated in standard build pipelines at the time of creation.
2.  **ESM Imports via Importmap**: `index.html` defines an `importmap` for `react`, `react-dom`, `@google/genai`, and `streamdown`. This suggests a browser-native module approach, potentially minimizing build steps or leveraging ESM specifically.
3.  **Streamdown**: Used for rendering markdown with streaming support, essential for the chat interface.

## Design Patterns
-   **Component-Based Architecture**: UI is broken down into `Header`, `NeoButton`, `NeoCard`, `PaperDetail`, `PaperList`.
-   **Service Layer**: Logic for external APIs is encapsulated in `services/` (`aiService.ts`, `hfService.ts`).
-   **Neo-Brutalism**:
    -   **Hard Shadows**: CSS variables `--shadow-neo` define sharp, non-blurred shadows.
    -   **Bold Borders**: Elements likely have thick black borders.
    -   **High Contrast Colors**: Usage of `#FFD21E` (Yellow), Black, and White.

## Component Relationships
-   `App` is the main container.
-   `PaperList` displays the feed of papers.
-   `PaperDetail` shows the selected paper and likely contains the chat interface (or a sub-component for it).
-   `Neo*` components (`NeoButton`, `NeoCard`) are reusable UI primitives enforcing the design system.
