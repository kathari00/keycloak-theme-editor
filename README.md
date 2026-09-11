<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="public/logo-light.svg">
    <img src="public/logo-light.svg" alt="Keycloak Theme Editor" width="120">
  </picture>
</p>
<h1 align="center">Keycloak Theme Editor</h1>

<p align="center">
  A visual editor for designing, previewing, and exporting Keycloak login themes.
</p>

<p align="center">
  <a href="https://github.com/kathari00/keycloak-theme-editor/actions/workflows/pipeline.yml"><img src="https://github.com/kathari00/keycloak-theme-editor/actions/workflows/pipeline.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/keycloak-theme-editor"><img src="https://img.shields.io/npm/v/keycloak-theme-editor" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/keycloak-theme-editor"><img src="https://img.shields.io/npm/dm/keycloak-theme-editor" alt="npm downloads"></a>
</p>

## Quick Start

Head to **[keycloak-theme-editor.org](https://keycloak-theme-editor.org)** and start designing your theme.

Need custom FreeMarker templates? Check the [docs](https://docs.keycloak-theme-editor.org) for the CLI setup.

## Features

- **Design:** Apply presets, tweak colors, fonts, radius, and shadows, or edit CSS directly
- **Styles and layouts:** Choose native Keycloak, Bootstrap, or Carbon styling with Card, Horizontal, or Split layouts
- **Assets:** Upload fonts, backgrounds, logos, favicon, and images
- **Preview:** Browse Keycloak pages across desktop, tablet, and mobile viewports with dark mode
- **Export:** Download as a deployable `.jar` or quick-export to a folder
- **Import:** Re-import a previously exported theme JAR

## Documentation

Full documentation is available at [docs.keycloak-theme-editor.org](https://docs.keycloak-theme-editor.org).

Carbon uses the official `@carbon/styles` tokens and native HTML styles on Keycloak's FreeMarker markup. White and Gray 100 surfaces follow light/dark mode; IBM Plex Sans fonts are bundled into exports. Customize it through Quick start or `carbon-custom.css` in Styling.

For development, `npm run generate:carbon` rebuilds the checked-in Carbon CSS from `carbon.scss` after updating `@carbon/styles`. The generated stylesheet includes the font license and embedded fonts, so themes do not need a font CDN or a React runtime.
