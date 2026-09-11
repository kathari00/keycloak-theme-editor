# Theme adaptations

How `public/keycloak-dev-resources/themes/{base,v2}` gets derived from pristine
upstream Keycloak. Read `manifest.ts` first for the provenance model
(vendor-adapted vs. hand-authored themes); this file is the day-to-day
mechanics and the runbook for when something breaks.

## The two mechanisms

**`theme.properties`** (`adapt-vendor-theme.ts` + `class-hook-properties.ts` +
`base-class-hook-keys.ts`): a pure, declarative transform. `base` is the
master, alphabetically-sorted hook vocabulary we maintain ourselves (real
Keycloak's `base` theme is `abstract=true` and declares no concrete hooks).
`v2` is exactly that vocabulary filtered down to whatever pristine `v2`
declares a value for, each value expanded to `<key> <realValue>`. Verified
byte-for-byte against 26.6.4 - see the golden tests in
`tools/__tests__/theme-adaptations.test.ts`.

**`template.ftl` / `footer.ftl`** (`patches/v2-*.patch` + `patch.ts`): real
unified diffs, applied by a small custom applier (deliberately not shelling
out to `git apply`/`patch` - needs to behave identically in CI and on every
contributor's machine). These exist because `v2`'s edits are structural
(reordered blocks, new `<#assign>`s, a rewritten footer for our own
imprint/data-protection feature) - they don't reduce to key-value rules.

## Running it

```sh
npm run sync:keycloak   # populates public/keycloak-upstream (gitignored, network)
npm run vendor:check    # dry run: does regenerating match what's committed?
npm run vendor:apply    # writes the regenerated files
```

The scheduled `.github/workflows/keycloak-update.yml` runs `vendor:apply`
after bumping the pinned tag, then regenerates previews and runs validation
before opening an update PR. `vendor:check` runs on PRs touching the adaptation
or vendor files and verifies that committed output matches the pinned release.

## When it breaks

A failed update does not advance the committed version or open an update PR.
Compatibility failures will therefore recur each week until the adaptation is
fixed. Read the first failed step; fixing one blocker can reveal another.

To complete a blocked update locally:

1. Start from a clean checkout, or back up local theme and generated-preview edits.
2. Run `npx --no-install tsx tools/check-keycloak-release.ts` to update the pin.
3. Run `npm run sync:keycloak`, then `npm run vendor:apply`.
4. Resolve unknown hooks and patch conflicts as described below. Preserve both
   the editor's adaptations and the new upstream behavior when rebasing patches.
5. Run `npm run vendor:check`, `npm run generate:preview -- --locales=all`,
   `npm run lint`, `npm run test:run`, `npm run build`, and `npm run test:e2e`.
6. Review and commit the pin, adaptation rules, regenerated themes, message
   catalogs, and previews together. Merge through a PR; the main pipeline also
   validates the export against a real Keycloak container.

### `theme.properties`: "declares hook key(s) not in BASE_CLASS_HOOK_KEYS"

Upstream `v2` added a new `kc*`-prefixed key. Add it to
`base-class-hook-keys.ts`'s `BASE_CLASS_HOOK_KEYS` array, in alphabetical
order (the array is a plain list, not auto-sorted - keep it that way so a
diff of this file stays reviewable). Unless the new hook needs a real
functional value even in the bare `base` variant (like `kcDarkModeClass`
does), it defaults to a bare self-reference automatically - no entry needed
in `BASE_CLASS_HOOK_OVERRIDES`.

### A `.patch` file no longer applies

`applyUnifiedDiff` throws with the exact line number and the context it
expected vs. what it found - that tells you which hunk broke and roughly
where upstream changed something nearby. To re-derive the patch:

1. `npm run sync:keycloak` to get the new pristine `template.ftl`/`footer.ftl`
   into `public/keycloak-upstream/v2/login/`.
2. Copy the *previous* committed `public/keycloak-dev-resources/themes/v2/login/{template,footer}.ftl`
   somewhere safe (it has our intended edits baked in) - or just re-read this
   README's diff-editing approach and re-apply the same structural changes by
   hand to the new pristine file if the old one no longer merges cleanly.
3. Generate a fresh unified diff between the new pristine file and your
   updated version:
   ```sh
   mkdir -p /tmp/patchgen/a /tmp/patchgen/b
   cp public/keycloak-upstream/v2/login/template.ftl /tmp/patchgen/a/template.ftl
   cp <your-updated-file> /tmp/patchgen/b/template.ftl
   cd /tmp/patchgen && git diff --no-index --unified=2 a/template.ftl b/template.ftl > template.patch
   ```
4. Copy the result over `tools/theme-adaptations/patches/v2-template.patch`
   (or `-footer.patch`), stripping any CRLF (`sed -i 's/\r$//' template.patch`
   if you're on a machine where git added it).
5. `npm run vendor:check` until it's clean, then run the golden tests
   (`npx vitest run tools/__tests__/theme-adaptations.test.ts`) to confirm.

If the structural edit itself needs to change (not just re-apply to moved
context), edit the committed `.ftl` file directly with your intended change,
then regenerate the patch against it as above - the patch is a derived
artifact of "pristine + our intent", not the source of truth for our intent.

### A whole new vendor-adapted theme

Add it to `VENDOR_ADAPTED_THEMES` in `manifest.ts`, extend
`apply-vendor-adaptations.ts`'s `planThemeFiles` if its adaptation shape
differs from `v2`'s, and add golden tests before trusting it.
