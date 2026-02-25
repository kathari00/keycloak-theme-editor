# Keycloak Theme Editor

A browser-based visual editor for designing, previewing, and exporting Keycloak login themes.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in terminal (default: `http://localhost:5173`).

## Features

| | |
|---|---|
| **Design** | Apply presets, quick-start controls (colors, fonts, radius, shadow), or edit CSS directly in CodeMirror |
| **Assets** | Upload fonts, backgrounds, logos, favicon, and images |
| **Preview** | Browse generated Keycloak pages across desktop/tablet/mobile viewports and dark mode |
| **Export** | Download as deployable `.jar` or quick-export to a folder (Chrome/Edge) |
| **Import** | Re-import a previously exported theme JAR |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build |
| `npm run test:run` | Run tests once |
| `npm run lint` | ESLint |
| `npm run sync:keycloak` | Sync upstream Keycloak templates into `public/keycloak-upstream/` |
| `npm run generate:preview` | Regenerate preview `pages.json` (with embedded scenarios) |

## Requirements

- **Node.js 18+** (20+ recommended), npm
- **JDK 25+** and **Maven** — only needed for preview artifact generation

## Tech Stack

React 19 and PatternFly

## Project Structure

```
src/
  app/              # Editor shell & wiring
  components/       # Sidebar, topbar, panels
  features/
    assets/         # Upload & asset management
    editor/         # CSS editing, undo/redo, style layers
    presets/         # Preset selection logic
    preview/        # Iframe preview & generated artifacts
    theme-export/   # JAR/folder export & import
  styles/           # Constants & shared styles

public/
  keycloak-dev-resources/   # Shared dev resources and base theme resources (bases/base, bases/v2)
    themes/<theme-id>/      # Theme files:
                            # - styles.css + quick-start.css: export/runtime CSS
                            # - preview.css: editor-preview-only CSS (never exported)

tools/
  keycloak-sync/        # Upstream template sync
  preview-renderer/     # Java-based preview generation
```
