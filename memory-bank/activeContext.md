# Active Context

## Current Focus
The project is in the initial setup phase. The codebase exists with core components and configuration, but I need to verify functionality and potentially complete the implementation of the chat or paper fetching logic. The immediate task is to initialize this Memory Bank to document the project state.

## Recent Changes
-   **Project Initialization**: Created basic React + Vite structure.
-   **Component Creation**: Added `Header`, `NeoButton`, `NeoCard`, `PaperDetail`, `PaperList`.
-   **Service Implementation**: Added `aiService.ts`, `hfService.ts`.
-   **Memory Bank Initialization**: Created `memory-bank` directory and documentation files.

## Active Decisions
-   **Documentation**: Establishing the Memory Bank pattern to maintain context across sessions.
-   **Styling**: Using Tailwind v4 via CDN for rapid prototyping and brutalist aesthetics.

## Next Steps
1.  **Verify Environment**: Ensure `npm install` works and dependencies are correct.
2.  **Check API Integration**: Verify if `hfService.ts` and `aiService.ts` are correctly implemented and if the `.env.local` setup is clear for the user.
3.  **Run Application**: Start the dev server and test the flow (Browse -> Select -> Chat).
