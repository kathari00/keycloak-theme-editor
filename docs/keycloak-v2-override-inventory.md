# V2-Override-Inventur für den Login-Umbau

Stand: 17. Oktober 2026. Quelle: lokal synchronisierte Keycloak-Vorlagen aus `public/keycloak-upstream/{base,v2}/login`, konfiguriert für `26.7.3`. Diese Inventur ist die erste Arbeitsgrundlage für den [Migrationsplan](keycloak-v2-base-migration-plan.md). Sie bewertet Dateigrenzen und sichtbare Unterschiede; ein Verhalten gilt erst nach einem echten Keycloak-Test als bestätigt.

## Umfang

Base hat 46 FTL-Dateien, V2 hat 33. V2 überschreibt 26 gleichnamige Base-Dateien neben den zwei Layoutdateien `template.ftl` und `footer.ftl`. Fünf V2-Dateien haben in Base kein gleichnamiges Gegenstück: `buttons.ftl`, `field.ftl`, `oid4vc-credential-offer.ftl`, `password-validation.ftl`, `social-providers.ftl`. `passkeys.ftl` wird von V2-Seiten verwendet, aber aus Base geerbt.

## Alle 26 überschriebenen Dateien

Die Gruppierung legt die Bearbeitungsreihenfolge fest; sie ist noch keine Aussage, dass jede Datei ohne Umgestaltung gelöscht werden kann.

| Gruppe | V2-Dateien mit Base-Gegenstück | Hauptsächliche V2-Abhängigkeiten | Nächste Prüfung |
| --- | --- | --- | --- |
| Login | `login.ftl`, `login-username.ftl`, `login-password.ftl` | `field`, `buttons`, `social-providers`, geerbtes `passkeys` | Formular- und Fehlerverhalten gegen Base abgleichen; erster Durchstich |
| Registrierung und Profil | `register.ftl`, `register-commons.ftl`, `user-profile-commons.ftl`, `update-email.ftl` | `field`, `password-commons`, `password-validation`, `buttons` | Dynamische Profilfelder, Pflichtfelder und Validierung erhalten |
| Passwort und Wiederherstellung | `login-reset-password.ftl`, `login-update-password.ftl`, `login-recovery-authn-code-config.ftl`, `login-recovery-authn-code-input.ftl`, `password-commons.ftl` | `field`, `password-commons`, `password-validation`, `buttons` | Fehlerzustände, Geheimnisse und Codes getrennt prüfen |
| Weitere Authentifizierung | `login-otp.ftl`, `login-config-totp.ftl`, `login-passkeys-conditional-authenticate.ftl`, `webauthn-authenticate.ftl`, `webauthn-register.ftl`, `webauthn-error.ftl`, `select-authenticator.ftl` | `field`, `buttons`, `password-commons` | JS- und Geräte-Flows sowie Alternativen testen |
| Bestätigung und Spezialfälle | `code.ftl`, `delete-account-confirm.ftl`, `delete-credential.ftl`, `link-idp-action.ftl`, `login-oauth2-device-verify-user-code.ftl`, `login-oauth-grant.ftl`, `terms.ftl` | `field`, `buttons` | Aktionstyp, Formulardaten und Rückwege erhalten |

Die Gruppensummen sind 3 + 4 + 5 + 7 + 7 = 26. `template.ftl` und `footer.ftl` bleiben separat zu prüfen: Sie bestimmen das Layout und können nicht durch das bloße Entfernen der Seitenkopien ersetzt werden.

## Konkrete Unterschiede im ersten Login-Schnitt

| Stelle | Beobachtung in den synchronisierten Dateien | Prüffrage vor der Migration |
| --- | --- | --- |
| `login.ftl` | Base enthält eigene Eingabefelder und ein Submit-Input; V2 nutzt `field.input`, `field.password`, `buttons.loginButton` und `social-providers.show`. V2 setzt `novalidate`, Base nicht. | Welche Eigenschaften sind gemeinsames Verhalten, und welche sind nur Präsentation? Formularvalidierung und Submit-Werte auf echtem Keycloak vergleichen. |
| `login-username.ftl` | Base setzt beim Username `dir="ltr"` und eigene Tab-Indizes; V2 verwendet `field.input` und setzt darum zusätzlich einen äußeren Formulargruppen-Container. | Textrichtung, Fokusreihenfolge und doppelte Container im DOM prüfen. |
| `login-password.ftl` | Base hat ein Passwortfeld mit `autocomplete="on"`, eigenem Fehler-Markup und einem Passwort-Script; V2 verwendet `field.password` mit `autocomplete="current-password"` und rendert `passkeys.conditionalUIData`. | Welche Änderung ist beabsichtigt? Passwort-Toggle, Passkey-Daten und Fehlerdarstellung im Server-Flow prüfen. |
| `field.ftl` | Sechs Makros (`group`, `errorIcon`, `input`, `password`, `clipboard`, `checkbox`) teilen sich eine Datei. `input` und `password` schreiben `aria-invalid` und verwenden `error`; im gezeigten Makro ist keine `aria-describedby`-Verknüpfung sichtbar. | Bestehende Makros zunächst beibehalten; nur bei einem belegten unabhängigen Override-Fall eine weitere Dateigrenze schaffen. Fehlermeldungen, Escaping und ARIA-Verknüpfung testen. |
| `buttons.ftl` | Vier Makros (`actionGroup`, `button`, `buttonLink`, `loginButton`) teilen sich eine Datei. | Für gezielte Overrides Dateigrenzen und stabile Parameter festlegen. Bestehende PR-Button-Makros als Ausgangspunkt nehmen. |

## Ausführbare Schnitte

Der [ausführbare Prototyp](../tools/v2-migration-prototype/README.md) rendert `login.ftl`, `login-username.ftl`, `login-password.ftl` und `register.ftl` als aus Base geerbte Seiten mit V2-Komponenten. V2s bestehende Profilmakros bleiben erhalten. Standardzustände der vier Seiten wurden im Browser bei Desktop- und Mobilbreite mit der bisherigen V2-Vorschau abgeglichen; Fehlerzustände und echte Keycloak-Flows brauchen weitere Prüfung.

1. Die Login-Deltas als DOM- und Server-Assertions festhalten: Formularaktion, Namen/IDs, Werte, Autocomplete, `dir`, Fehlermeldungen, ARIA, Fokus, Passwort-Toggle, Passkey-Daten und Submit.
2. Für `login.ftl`, `login-username.ftl` und `login-password.ftl` einen Base-Entwurf mit überschreibbaren vollständigen Feld- und Aktionskomponenten erstellen. Bestehende V2-Feldmakros weiterverwenden.
3. Base, V2, Carbon, Bulma und Bootstrap mit diesem Entwurf rendern. Erst bei bestandenen Vergleichen die drei V2-Seitenkopien entfernen.

Die Framework-Fehlermatrix braucht reproduzierbare Browserfälle. In der lokalen Quellinventur sind noch keine konkreten Fehlerszenarien belegt; sie werden bei Schritt 1 ergänzt, statt aus CSS-Unterschieden vermutet.
