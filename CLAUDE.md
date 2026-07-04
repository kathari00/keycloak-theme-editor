# Keycloak Theme Editor

Visual editor for Keycloak login themes. Users style, preview, and export themes as deployable JARs without cloning or forking.

Published to npm as `keycloak-theme-editor`. Deployed as a static site to keycloak-theme-editor.org via GitHub Pages.

## Commands

```bash
npm run dev          # start Vite dev server (localhost:5173)
npm run build        # tsc + vite build -> dist/
npm run lint         # ESLint
npm run test         # Vitest unit tests (watch mode)
npm run test:run     # Vitest unit tests (single run)
npm run test:e2e     # Playwright E2E (starts dev server automatically)
npm run build:jar    # Maven build for tools/preview-renderer
npm run build:cli    # tsup build for bin/cli.js
```

## Architecture

Feature-based structure under `src/features/`:

- `assets/` : file upload handling (fonts, images, backgrounds, logos, favicons)
- `editor/` : core editor state (Zustand stores + actions + CodeMirror), QuickStart panel
- `preview/` : iframe preview rendering, message passing between app and preview frame
- `presets/` : preset management, theme path resolution
- `theme-export/` : JAR and folder export/import, CSS assembly

State management uses Zustand. The preview runs in an iframe and communicates via postMessage.

Top-level components live in `src/components/` (Topbar, RightSidebar, ContextBar, SidebarPanel, ErrorBoundary).

## Build outputs

- `dist/` : static site (Vite output), deployed to GitHub Pages
- `bin/cli.js` : CLI entry point (tsup output from `bin/cli.ts`)
- `bin/kc-mocks.js` : npm package export for Keycloak mock definitions
- `tools/preview-renderer/preview-renderer.jar` : Java JAR for FreeMarker rendering during preview generation

## Tests

Framework: Vitest (unit) + Playwright (E2E).

Unit tests live next to source in `__tests__/` subdirectories. Currently 25 test files, ~160 tests. No React component tests exist yet.

The single E2E smoke test (`e2e/smoke.test.ts`) loads the app and checks for JS errors. Playwright's `webServer` config starts `npm run dev` automatically.

## CI

GitHub Actions pipeline (`.github/workflows/pipeline.yml`): lint -> test -> build -> playwright. Runs on push to main and PRs. On push to main, also deploys to GitHub Pages.

## Commit conventions

Do not add `Co-Authored-By` lines.

## Key files

- `vite.config.ts` : Vite + React + static copy config
- `src/main.tsx` : React entry point
- `src/app/EditorContent.tsx` : main layout component
- `tools/generate-preview.ts` : CLI tool to generate preview HTML (uses Java JAR + FreeMarker)
- `tools/sync-keycloak.ts` : syncs Keycloak FreeMarker templates
- `bin/cli.ts` : `keycloak-theme-editor` CLI (local development mode)
