# Keycloak Theme Editor

Visual editor for Keycloak login themes. Users style, preview, and export themes as deployable JARs without cloning or forking.

Published to npm as `keycloak-theme-editor`. Deployed as a static site to keycloak-theme-editor.org via GitHub Pages.

## Commands

```bash
npm run dev                        # Vite dev server (localhost:5173)
npm run build                      # tsc + vite build -> dist/
npm run lint
npm run test                       # Vitest, watch mode
npm run test:run                   # Vitest, single run
npm run test:e2e                   # Playwright; starts the dev server itself
npm run test:keycloak-integration  # boots a real Keycloak container - requires Docker
npm run build:jar                  # Maven build for tools/preview-renderer - requires Java
npm run build:cli                  # tsup build for bin/cli.js
```

Other scripts (`sync:keycloak`, `generate:preview`, `vendor:check`/`vendor:apply`, `build:keycloak-fixture`) are one-off tooling - see `package.json`.

## Architecture

Feature-based structure under `src/features/`:

- `assets/` : file upload handling (fonts, images, backgrounds, logos, favicons)
- `editor/` : core editor state (Zustand stores + actions + CodeMirror), QuickStart panel
- `preview/` : iframe preview rendering, message passing between app and preview frame
- `presets/` : preset management; theme CSS paths built on `keycloak-theme/`'s path constants
- `theme-document/` : canonical in-memory theme representation, projected into preview CSS and export output
- `theme-export/` : JAR and folder export/import, CSS assembly
- `i18n/` : curated catalog of locales Keycloak's base theme ships translations for
- `keycloak-theme/` : low-level theme file path constants (`theme.properties`, `template.ftl`, resource/message paths)

`src/lib/` holds small cross-feature utilities (CSS AST parsing, classnames). Top-level components live in `src/components/` (Topbar, RightSidebar, ContextBar, SidebarPanel, ErrorBoundary). The preview runs in an iframe and communicates with the editor via postMessage.

## Build outputs

- `dist/` : static site (Vite output), deployed to GitHub Pages
- `bin/cli.js` : CLI entry point (tsup output from `bin/cli.ts`)
- `bin/kc-mocks.js` : npm package export for Keycloak mock definitions
- `tools/preview-renderer/preview-renderer.jar` : Java JAR for FreeMarker rendering during preview generation

## Tests

Vitest (unit, `__tests__/` next to source, no React component tests yet) + Playwright (`e2e/`: smoke, export, import-roundtrip, quick-settings, upload-assets, languages).

`e2e/keycloak-integration/` is a separate Playwright suite (own config, no `webServer`) that boots a real Keycloak container (`testcontainers`) against a fixture theme jar (built by `tools/build-theme-fixture.ts`, reusing the real export pipeline) and asserts on the actual rendered login page - the one thing nothing else in this repo proves. Requires Docker. See `e2e/manual-qa-languages.md` for the manual checklist this suite automates.

## CI

`.github/workflows/pipeline.yml`: lint -> test -> build -> build:jar -> build:cli -> `npm pack --dry-run` -> keycloak-integration test -> e2e test. Runs on push to main and PRs; push to main also deploys to GitHub Pages.

## Commit conventions

Do not add `Co-Authored-By` lines.

## Key files

- `vite.config.ts` : Vite + React + static copy config
- `src/main.tsx` : React entry point
- `src/app/EditorContent.tsx` : main layout component
- `src/features/theme-document/theme-document.ts` : canonical theme model, entry point for the theme-document feature
- `tools/generate-preview.ts` : CLI tool to generate preview HTML (uses Java JAR + FreeMarker)
- `tools/sync-keycloak.ts` : syncs Keycloak FreeMarker templates
- `bin/cli.ts` : `keycloak-theme-editor` CLI (local development mode)
