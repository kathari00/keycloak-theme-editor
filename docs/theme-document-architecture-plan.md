# Theme Document Architecture Plan

## Goal

The editor should have one explicit domain object that answers the question:

> What is the current editable Keycloak theme?

Today that answer is reconstructed from CSS strings, file maps, quick settings, uploaded assets, applied assets, generated preview HTML, and export metadata. Those artifacts are necessary, but they should be projections of a theme document, not the architecture itself.

## Current Architecture Smell

The main smell is artifact-driven architecture:

- Quick Start CSS is editable source, generated output, persistence format, import/export protocol, preview input, and state synchronization layer.
- Preview and export build styling through separate paths, even though they must represent the same product promise.
- App orchestration lives in React effects, especially theme bootstrap, default asset hydration, import handling, and preview page selection.
- Stores are split by surface area, but actions and subscriptions cross store boundaries freely.
- Keycloak filesystem conventions leak into app, preview, editor, and export code.

## Target Shape

Introduce a canonical `ThemeDocument` model:

```ts
interface ThemeDocument {
  themeId: string
  sourceThemeId: string
  isPresetTheme: boolean
  stylesCss: string
  stylesCssFiles: Record<string, string>
  quickStartCss: string
  quickSettings: QuickSettings
  assets: {
    uploadedAssets: UploadedAsset[]
    appliedAssets: AppliedAssets
  }
}
```

The model should become the boundary between editor state and downstream artifacts.

## Projection Boundaries

The app should eventually organize theme work as projections:

- `ThemeDocument -> PreviewBundle`
- `ThemeDocument -> ExportBundle`
- `ThemeDocument -> KeycloakThemeFiles`
- `ImportedKeycloakThemeFiles -> ThemeDocument`

This gives preview, export, import, and packaging one shared source of truth while still allowing each target to have target-specific formatting.

## Migration Strategy

1. Add `ThemeDocument` without changing persisted store shape.
2. Build `ThemeDocument` from existing store slices near current consumers.
3. Move preview style computation behind a document projection.
4. Move export quick-settings derivation behind a document projection.
5. Add tests around the projections.
6. Move document creation into a `useThemeDocument` hook or session service.
7. Replace direct cross-store reads in actions with document updates or explicit transactions.
8. Delete duplicated CSS assembly helpers once preview and export use shared projections.

## PoC Scope

The first PoC intentionally avoids a full migration. It only proves:

- A `ThemeDocument` can be created from current editor slices.
- Preview styling can be computed from the document.
- Export mode-aware quick settings can be derived from the document.

No UI behavior should change.

## Later Cleanup Opportunities

After the document model is established, likely deletion targets are:

- Repeated quick-settings snapshot objects in preview/export.
- Local export helpers that duplicate document projection behavior.
- Store synchronization code that rewrites CSS text as a hidden side effect.
- Ad hoc path and quick-start constants spread across editor and export code.

## Success Criteria

- Preview and export can consume a shared theme model.
- The current theme can be inspected as one object in debugger/tests.
- New export formats can start from `ThemeDocument` instead of reading multiple stores.
- CSS parsing remains at import boundaries, not in normal editor state flow.
- Future LOC reduction comes from removing duplicate projections, not from deleting random helpers.
