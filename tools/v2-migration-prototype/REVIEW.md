# Review Erik's login theme

Open http://localhost:5173/?v2Prototype=erik after generating the preview and running `npm run dev`.
This is the local Keycloak correction branch. The untouched PR render is
http://localhost:5173/?v2Prototype=erik-upstream.
The page selector and scenario selector above the preview cover all 40 pages in this checkout.
Use the top-bar moon button for dark mode and **Editor options → preview device** for mobile/tablet widths.
Quick Start styling does not affect this raw preview. The normal editor/export still uses the released theme.

## Source

- Keycloak PR https://github.com/keycloak/keycloak/pull/52371
- PR head: `30765adcf19720c86a3d7e8f95309d19b2df9de0` (2026-11-11)
- Theme: `keycloak.v3`, inheriting `base`; this head includes merged PR #52724.
- Isolated local checkout: `C:/Projekte/keycloak-erik-preview`.
- PatternFly **6.7.0**, as resolved by that checkout's `js/pnpm-lock.yaml`.

The preview on `erik` uses the local correction branch in a separate checkout. The `erik-upstream`
preview uses the PR head with no CSS or template patches. Resources inherit from Base, matching Keycloak's lookup.
Editor placeholders and passkey markup transformations are bypassed. Scripts are stripped by the iframe's
existing sanitizer; dark mode is applied using the class from upstream `theme.properties`.

## Reproduce

Run from the editor repository (Java and Maven required for the renderer):

```powershell
npm.cmd run build:jar
New-Item -ItemType Directory -Force tools/v2-migration-prototype/generated/pf6
npm.cmd pack @patternfly/patternfly@6.7.0 --pack-destination tools/v2-migration-prototype/generated/pf6 --silent
tar -xzf tools/v2-migration-prototype/generated/pf6/patternfly-patternfly-6.7.0.tgz -C tools/v2-migration-prototype/generated/pf6
node node_modules/tsx/dist/cli.mjs tools/v2-migration-prototype/verify.ts --keycloak-source=C:/Projekte/keycloak-erik-preview --v2-theme=keycloak.v3 --as-is --stage-preview=erik-upstream --patternfly-v6=tools/v2-migration-prototype/generated/pf6/package
node node_modules/tsx/dist/cli.mjs tools/v2-migration-prototype/verify.ts --keycloak-source=C:/Projekte/keycloak-erik-background-fix --v2-theme=keycloak.v3 --as-is --stage-preview=erik --patternfly-v6=tools/v2-migration-prototype/generated/pf6/package
npm.cmd run dev
```

When updating the PR checkout, recheck the lockfile version and regenerate. The source checkout is detached;
fetch the PR head into the main Keycloak repository and create a fresh isolated worktree if it has changed.

## Coverage and limits

`scenarios.ts` plus the existing fixtures in `verify.ts` currently render **184 page/state combinations**:
default pages, four alert types, long content, language switcher visibility, alternate authentication,
login realm flags/social providers, registration/terms/captcha markup, profile errors/read-only fields,
textarea/select/multiselect/radio/checkbox/date/number/multivalued profile inputs, OTP selection/manual
TOTP/HOTP, app-initiated versus required actions, passkeys, consent, redirects, certificates, and wallet pages.
Shared `template.ftl` layout states such as alerts appear only on `login.ftl`.
Other pages retain scenarios for their own markup and controls.

Generation fails if a requested page/state is skipped or a rendered page has no fixture. The generated
`pages-erik.coverage.json` lists every page and scenario; `pages-erik.source.json` records provenance.
These artifacts and vendor assets are local/ignored. The scenario source is tracked.

This is a visual FreeMarker matrix, not exhaustive combinations of every flag and arbitrary user input.
Some pages intentionally suppress shared alerts. Verify interactions on a real Keycloak server:
validation JS, password toggles, actual captcha, WebAuthn/browser prompts, wallet polling/expiry,
recovery-code print/download/confirmation, redirects, and form submissions. QR fixtures are placeholders.
Translated locale bundles and RTL layout are not included in this review matrix yet.

Manual review: inspect each page's scenarios at desktop/mobile widths in light/dark mode, especially field
errors, footer spacing, action alignment, long labels, and overflowing content. Record failures with the
page, scenario, viewport, mode, and source commit from `pages-erik.source.json`.

## Background cutoff finding

At the pinned PR head, scrolling a long registration page cuts off the background at the body's bottom.
Reproduced in the editor iframe and with the same HTML opened as a standalone page.
The `.login-pf body` rule in `keycloak.v3/login/resources/css/styles.css` sets `height: 100%`,
while the login component grows beyond the viewport. Changing this to `min-height: 100%; height: auto`
lets the body cover its content and keeps short pages at least viewport height.

Candidate source: `C:/Projekte/keycloak-erik-background-fix`, branch `fix/v3-background-scroll`.
The CSS rule and the password error ordering in `base/login/field.ftl` are changed locally and uncommitted.
The original checkout remains untouched.
Candidate preview: http://localhost:5173/?v2Prototype=erik

Regenerate using the command above with `--keycloak-source=C:/Projekte/keycloak-erik-background-fix`
and `--stage-preview=erik`. The source manifest marks the local change.

The password macro used to place the invalid-password message after its helper items, so it appeared
below "Forgot Password?". The candidate renders its error immediately after the input group and before
helper items. The error container and `aria-describedby` identifiers are unchanged. A browser check of
`login-password.ftl` in `invalid-state` confirmed the visual and DOM ordering.
