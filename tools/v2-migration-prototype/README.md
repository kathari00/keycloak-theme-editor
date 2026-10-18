# Login component inheritance prototype

This is the first executable slice of the [V2/Base migration plan](../../docs/keycloak-v2-base-migration-plan.md). It works against the editor's pinned Keycloak `26.7.3` templates, with `buttons.ftl` based on [PR #52724](https://github.com/keycloak/keycloak/pull/52724) at commit `db6c308504ff16de0fd8859261b75237803414a5`. That PR commit uses Keycloak's `999.0.0-SNAPSHOT` development version, so its matching Maven resources and server are not the editor's `26.7.3` artifacts. This preview is deliberately marked as mixed-source. It does not modify the ignored `public/keycloak-upstream` checkout or the upstream Keycloak PR.

The prototype moves `login.ftl`, `login-username.ftl`, `login-password.ftl` and `register.ftl` into Base and removes those pages from V2 in a temporary copy of the synced sources. The login pages import username, password, remember-me, submit and social-provider components. Submit now uses the shared Base `buttons.loginButton`, and registration actions use a shared Base component; neither needs a V2 override. The password field remains one component containing its toggle, error presentation, reset-link placement and script hook; V2 continues to use its existing `field.password` macro. Registration keeps one V2 password-field component and its existing `user-profile-commons.ftl`, `register-commons.ftl` and password-validation macros. The V2 layout already loads `passwordVisibility.js`, so its login script hook is empty. The prototype also moves `buttons.ftl` to Base, as the PR does, and makes `loginButton` call its sibling macros without depending on the caller's `buttons` alias.

Run after `npm run sync:keycloak` and `npm run build:jar`:

```bash
npx tsx tools/v2-migration-prototype/verify.ts
```

To inspect it in the editor, generate the local preview and start Vite:

```bash
npx tsx tools/v2-migration-prototype/verify.ts --write-editor-preview
npm run dev
```

In PowerShell with script execution disabled, use `.\\node_modules\\.bin\\tsx.cmd tools/v2-migration-prototype/verify.ts --write-editor-preview` and `.\\node_modules\\.bin\\vite.cmd` instead.

Open `http://localhost:5173/?v2Prototype=1`, select the V2 theme and the **Login**, **Login Username**, **Login Password** or **Register** page. Use the **Invalid State** button for error rendering. Open `http://localhost:5173/` in another tab to compare the normal preview. The prototype preview is English-only and is generated into an ignored `tools/v2-migration-prototype/generated/pages.json`; the committed preview artifacts are untouched.

The editor shows a prototype banner in this mode. Export still targets the pinned release and must not be used to validate the new Base/V2 inheritance.

The verifier renders Base and V2 through the actual FreeMarker preview renderer in normal and error states. It checks that the inherited pages keep their form controls, use the V2 component overrides, and load the password script once where needed. Password-reset states check that Base keeps its options link while V2 places the link next to the password field, once per page; the combined login state also checks that the remember-me input appears once. Registration checks password fields, terms acceptance, error markup and visible/invisible reCAPTCHA states. It cleans up its temporary theme tree afterward. In the editor, the three login pages were also smoke-tested with Base, Bootstrap and Carbon styles.

A browser comparison against the committed V2 preview measured title, inputs, checkboxes and actions on all four default pages at 1280 px and 420 px. Their bounding boxes match exactly after moving submit and registration actions into Base. The committed V2 preview has no invalid-state fixture for the username-only and password-only pages, so their error layouts have only the prototype renderer checks. The inherited combined login and registration pages also lack V2's `novalidate` attribute, and login button classes reflect PR #52724 rather than the committed release preview. These behavior and styling differences still need a matching-source Keycloak check.

This proves file-level inheritance and rendering only. The username field and registration profile still delegate to V2's bundled macros. `login-update-profile.ftl` and `idp-review-user-profile.ftl` already inherit Base; `update-email.ftl` remains a V2 page override because its required-field layout and action structure differ. Error-state visual parity and a real Keycloak authentication flow are the next gates before any V2 page override can be removed upstream. The prototype mixes one pinned PR file with release templates for component design; it is not a version-aligned Keycloak build. A matching development server and resources are needed before export or server compatibility can be claimed.

## Compare the current PR worktree

`--keycloak-source=<path>` copies Base and V2 templates from that Keycloak
checkout and renders a baseline before applying the prototype. `--as-is`
renders the checkout exactly as it is, without prototype overlays. Both
commands write ignored `generated/pr-baseline-pages.json` and
`generated/pr-candidate-pages.json`, so save the original baseline as
`generated/pr-original-pages.json` before running against the migrated
worktree. Then run `compare-pr.ts` for form controls and attributes and
`compare-layout.ts` for selected Chromium bounding boxes. The latter
assumes the sibling `keycloak-v2-pr-validation` checkout for its V2 CSS.

On the isolated PR worktree at `86ba5ddcdf` plus local changes, four V2
pages have now been removed. The original V2 render and the inherited
render had zero control/attribute differences across the generated states
and zero differences in the selected layout boxes at 1280 and 420 pixels
for default and invalid states. The Keycloak component tests
`LoginLayoutComponentsTest` and `LoginFieldComponentsTest` passed via
`mvn -pl services -am`. This check uses the editor's shared PatternFly
assets and does not replace a real Keycloak server flow.

The isolated PR worktree now removes all 28 V2 login page files. Use
`--keycloak-source=<worktree> --as-is --expect-all-inherited` to assert
that all 28 pages resolve from Base and render in both themes. Render the
original fork first and copy its generated baseline to
`generated/pr-original-pages.json`; then render the migrated worktree.
`compare-pr.ts <original> <candidate> --pages=all` checks every rendered
V2 page and state, including controls, classes, text, and inline scripts.
`compare-layout.ts --pages=all` checks selected Chromium bounding boxes
at desktop and mobile widths. These checks use V2 as the behavioral
reference. They caught and fixed a hidden-username error-state difference
in the first login slice. The 13 remaining V2 FTL files are layout and
component overrides, including the upstream password validator.
