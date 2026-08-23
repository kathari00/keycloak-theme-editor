# Manual QA: Languages against a real Keycloak server

The automated suite (`languages.test.ts`) proves the editor's own state: enabling
locales, editing per-language text, export/import round-trips, and the preview
iframe swapping languages. None of that can prove what a real Keycloak server
actually renders, because that depends on realm configuration the JAR doesn't
control (see the info note in the export dialog). Run this checklist by hand
whenever the export/import shape or the locale catalog changes.

Needs a running Keycloak instance you can administer (local Docker container is
fine) and admin console access.

1. In the editor, enable at least two languages (one with a script Keycloak
   ships full translations for, e.g. `de`, plus `ar` or `fa` to cover RTL).
   Fill in a custom info message and imprint label for one of them; leave the
   other language's fields blank.
2. Export the theme as a JAR and deploy it: drop the file into Keycloak's
   `providers/` directory and restart (or `kc.sh build && kc.sh start-dev` for
   a local Quarkus distribution), then set it as the test realm's login theme.
3. In the admin console: Realm settings -> Localization -> enable
   Internationalization, and add the same locales you enabled in the editor to
   Supported locales.
4. Open the realm's login page.
   - Confirm the language switcher appears and lists the expected languages.
   - Switch to the language with custom text filled in: your info message and
     imprint label should show the localized text.
   - Switch to the language you left blank: it should show the English text,
     not an empty string or a missing-key placeholder (`???key???`).
   - Switch to the RTL language: layout should mirror (`dir="rtl"`), nothing
     should visually break.
5. Trigger a standard Keycloak error (e.g. wrong password) in a non-English
   language and confirm the error message itself is translated too - that
   text comes from Keycloak's own bundles, not anything this editor writes.
6. Re-import the same JAR into a fresh editor session and confirm the enabled
   languages and your custom text come back exactly as exported.

If any step fails, check first whether the JAR actually contains
`messages/messages_<suffix>.properties` for the language in question (unzip
and inspect) before assuming it's a rendering bug - a missing bundle and a
realm-configuration miss look identical from the login page.
