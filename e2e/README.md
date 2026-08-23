# E2E Test Shape

E2E tests should cover user workflows that unit tests cannot prove: browser file upload, preview iframe updates, downloads, and UI wiring across panels or dialogs.

Keep specs grouped by workflow:

- `smoke.test.ts`: app boots without runtime errors.
- `quick-settings.test.ts`: quick-start controls update preview/export-facing state.
- `export.test.ts`: downloadable Keycloak artifacts have the expected deployable shape.
- `upload-assets.test.ts`: browser uploads affect preview and exported files.
- `import-roundtrip.test.ts`: exported/imported JARs restore editor state.
- future `cli.test.ts`: packaged CLI discovers and serves local themes.

Helpers should stay mechanical. Put navigation and browser quirks in `helpers/`, but keep product assertions in the spec files so tests remain readable.

Avoid testing incidental markup. Prefer accessible controls for user actions, preview iframe CSS/content for visible behavior, and downloaded archive contents for export correctness.

Some behavior only shows up against a real Keycloak server (realm-level internationalization settings, actual FreeMarker rendering) and can't be automated here - see `manual-qa-languages.md` for that checklist.
