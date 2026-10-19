# Implementation Plan - Vibe Coding Workspace & Interactive Web Container Integration

We will integrate a full-fledged Vibe Coding workspace and interactive web container into Flawlesz AI as a standalone dedicated page with tab navigation, featuring real-time prompt generation, file tree editing, preview sandboxing, and terminal output.

## Proposed Changes

### 1. Vibe Coding Workspace Component & Store (`src/pages/VibeCodingPage.tsx` & support utils)
- Enhance `src/pages/VibeCodingPage.tsx` with a fully interactive IDE layout:
  - **Left Sidebar**: File tree explorer with live file creation, editing, and deletion.
  - **Center Area**: Split view between Code Editor / Diff View and Live Webcontainer Preview.
  - **Bottom Panel**: Interactive Terminal and Build Logs console with step execution status.
  - **Top Bar**: AI Prompt Assistant / Vibe Generator bar to instantly generate full app code using Groq AI.
- Add preset app templates (e.g., SaaS Landing Page, AI Dashboard, E-Commerce Store, Crypto Tracker) so users can instantly load, test, and edit starter code.

### 2. Backend API Endpoint for Vibe Generation (`server.ts` or `server/groq.ts`)
- Add `/api/vibe/generate` endpoint supporting LLM-driven multi-file code generation based on natural language prompts.
- Implement streaming or fast JSON response parsing for generated files.

### 3. Navigation & Routing (`src/App.tsx`, `Navbar.tsx`, `Footer.tsx`)
- Ensure `/flaw/vibecoding` and `/vibecoding` routes are fully optimized and accessible from the Navbar and Footer links.

## Verification Plan

### Automated Tests & Linter
- Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript or import errors.
- Run `compile_applet` to confirm successful build.

### Manual Verification
- Navigate to `/flaw/vibecoding`.
- Test generating a new app from a vibe prompt using Groq AI.
- Verify file tree editing and live preview rendering.
