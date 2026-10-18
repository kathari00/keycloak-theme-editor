# V2-Seitenkopien im aktuellen Keycloak-PR entfernen

Stand: 17. Oktober 2026. Inventur des isolierten Keycloak-Arbeitsbaums
`C:\Projekte\keycloak-v2-pr-validation` auf `86ba5ddcdf` samt den noch
uncommitteten Base-Feldänderungen. Der Arbeitsbaum entspricht damit nicht
einfach dem veröffentlichten PR-Head `db6c308504ff16de0fd8859261b75237803414a5`.
Die ältere [Release-Inventur](keycloak-v2-override-inventory.md) bezieht sich
auf Keycloak 26.7.3 und hat einen anderen Dateibestand.

## Ziel und Dateigrenze

V2 enthält derzeit 38 FTL-Dateien: 26 Seitenkopien mit gleichnamiger
Base-Seite, zwei Seiten nur in V2 und zehn Layout- oder Makrodateien.
Ziel ist, die 28 Seitendateien aus V2 zu entfernen. Die zehn anderen Dateien
bleiben zunächst als Gestaltungsschicht; insbesondere `template.ftl` darf
weiterhin das V2-Gesamtlayout festlegen. Jede entfernte Seite muss aus Base
gerendert werden, während Keycloak weiterhin die V2-Makros und Ressourcen
auflöst. Für die zwei ausschließlich in V2 vorhandenen Seiten muss zuerst
eine Base-Seite eingeführt werden.

| Gruppe | V2-Seitenkopien | Gemeinsame Base-Arbeit |
| --- | --- | --- |
| Login (3) | `login.ftl`, `login-username.ftl`, `login-password.ftl` | Felder, Passkey-Daten, Remember-me, Social Login und Aktionen über wenige gröbere Bausteine ausgeben; Namen, Werte, Fehler und Skripte in Base halten. |
| Registrierung und Profil (3) | `register.ftl`, `login-update-profile.ftl`, `update-email.ftl` | Dynamische Profilfelder, Pflichtmarkierung, Terms, CAPTCHA und E-Mail-Bestätigung zentralisieren; V2-Profilmakros zunächst weiterverwenden. |
| Passwort und Recovery (4) | `login-reset-password.ftl`, `login-update-password.ftl`, `login-recovery-authn-code-config.ftl`, `login-recovery-authn-code-input.ftl` | Passwortvalidierung, Recovery-Code-Ausgabe, Download/Kopieren sowie Fehler- und Aktionsbereiche in Base abbilden. |
| OTP, Passkeys und WebAuthn (7) | `login-config-totp.ftl`, `login-otp.ftl`, `login-passkeys-conditional-authenticate.ftl`, `webauthn-authenticate.ftl`, `webauthn-register.ftl`, `webauthn-error.ftl`, `select-authenticator.ftl` | Formularwerte, Geräte-/Passkey-Skripte, QR-Code, Alternativen und Auswahlverhalten in Base erhalten; nur die Darstellung austauschbar machen. |
| Bestätigung und Spezialfälle (9) | `code.ftl`, `delete-account-confirm.ftl`, `delete-credential.ftl`, `link-idp-action.ftl`, `login-idp-link-confirm.ftl`, `login-oauth-grant.ftl`, `login-oauth2-device-verify-user-code.ftl`, `login-verify-email.ftl`, `terms.ftl` | Bestätigungstexte, Zustimmungen, Formularparameter und Rückwege in Base vereinheitlichen. `code.ftl` hat besonders große strukturelle Unterschiede und braucht einen eigenen Vergleich. |
| Bislang nur V2 (2) | `login-oid4vp.ftl`, `oid4vc-credential-offer.ftl` | Gemeinsame Base-Seiten neu anlegen; QR-Code und Credential-Angebot als wiederverwendbare Makros belassen. |

Die zehn zunächst verbleibenden V2-Dateien sind `template.ftl`, `footer.ftl`,
`divider.ftl`, `field.ftl`, `password-validation.ftl`, `qr-code.ftl`,
`password-commons.ftl`, `register-commons.ftl`, `social-providers.ftl` und
`user-profile-commons.ftl`. Ob einzelne davon später ebenfalls entfallen,
ist eine getrennte Entscheidung: Sie sind keine vollständigen Seiten.

## Was dafür nötig ist

1. **Ein stabiler Base-Vertrag:** Base definiert für jede Seite die fachlichen
   Bedingungen, Formularaktionen, Feldnamen, IDs, Werte, Meldungen,
   Barrierefreiheitsattribute und Skripte. Das betrifft auch seltene
   Fehlerzustände und Required Actions. Der Vertrag verwendet vorzugsweise
   die bereits vorhandenen Makrodateien `field.ftl`, `buttons.ftl`,
   `password-commons.ftl` und `user-profile-commons.ftl`; neue Grenzen
   entstehen nur für wirklich separat gestaltbare Blöcke wie eine komplette
   Passworteingabe oder ein Aktionsbereich.
2. **Styling-Hooks statt Seitenkopien:** V2 gibt Klassen und Layout über
   `theme.properties`, CSS und seine Komponenten vor. Wo die Struktur
   tatsächlich anders ist, bekommt ein vorhandenes Makro einen passenden
   Parameter oder es entsteht ein zusammenhängender V2-Baustein. Reine
   Abstands- und Farbunterschiede rechtfertigen keine Seitenkopie.
3. **Schrittweise Entnahme:** Pro Gruppe zuerst Base anpassen, dann die
   betreffenden V2-Seiten löschen. Dadurch zeigt die Dateiliste im PR die
   erreichte Vererbung unmittelbar. Die beiden V2-exklusiven Seiten erst
   nach dem Anlegen und Testen ihres Base-Gegenstücks löschen.
4. **Nachweis auf demselben Stand:** Alte V2-Seite und geerbte Base-Seite
   aus demselben Keycloak-Quellstand rendern, einschließlich der lokalen
   noch uncommitteten Änderungen. DOM und Browserlayout in
   Standard-, Fehler- und Sonderzuständen vergleichen; Formularaktion,
   Werte, IDs, Fokus, ARIA, Skripte und JavaScript-Verhalten prüfen.
   Danach Export-JAR und die wesentlichen Login-/Required-Action-Flows in
   einem passenden Keycloak-Build testen. Die manuelle Serverabnahme kann
   am Ende erfolgen.

Der bestehende Editor-Prototyp belegt bisher nur die Vererbung von vier
Seiten auf gemischten Quellen. `tools/v2-migration-prototype/verify.ts`
kann bereits Baseline und Kandidat aus dem isolierten PR-Arbeitsbaum
rendern; diese Artefakte sind ein Ausgangspunkt für den Vergleich auf demselben Stand,
Vergleich, aber noch kein Beleg für alle 28 Seiten oder einen Server-Flow.

## Reihenfolge im PR

1. Login und Registrierung: vorhandenen Vier-Seiten-Prototyp an die
   aktuellen PR-Änderungen anpassen, Unterschiede beheben, löschen.
2. Profil, Passwort und Recovery: vorhandene gemeinsame Feld- und
   Validierungsmakros verwenden, dann die sechs Seiten löschen.
3. OTP, Passkeys und WebAuthn: Skript- und Gerätefälle absichern, dann die
   sieben Seiten löschen.
4. Bestätigungen und Spezialfälle einschließlich OID4VP/OID4VC: die elf
   Seiten migrieren und löschen.

Nach jeder Gruppe bleibt ein überprüfbarer PR-Diff und eine Liste der
getesteten Zustände. Eine Dateilöschung allein ist kein Gleichheitsbeweis.

## Stand des ersten Schnitts

Im isolierten Arbeitsbaum sind `login.ftl`, `login-username.ftl`,
`login-password.ftl` und `register.ftl` aus V2 entfernt. Die geerbten
Base-Seiten verwenden vollständige Feld- und Aktionsmakros. Zwei
V2-Properties erhalten das bisherige `novalidate` auf Login und
Registrierung. Das Submit-Element für sichtbares CAPTCHA ist weiterhin
ein `button`.

Der FreeMarker-Renderer rendert Base und V2 in Standard- und
Fehlerzuständen sowie Reset- und CAPTCHA-Varianten. Der Vergleich der
gespeicherten ursprünglichen V2-Ausgabe mit dem tatsächlichen neuen
Arbeitsbaum ergab null Unterschiede bei Formularsteuerelementen und ihren
relevanten Attributen. Ein Chromium-Vergleich der zentralen Layoutboxen
bei 1280 und 420 Pixeln ergab ebenfalls null Unterschiede in den
Standard- und Fehlerzuständen. Dieser Browservergleich verwendet die
aktuelle V2-Stylesheet-Datei und die gemeinsamen PatternFly-Dateien
aus dem Editor; er prüft ausgewählte Boxen, keine vollständigen Screenshots
oder Benutzerinteraktionen. Die vorhandenen Keycloak-Tests
`LoginLayoutComponentsTest` und `LoginFieldComponentsTest` liefen mit
`mvn -pl services -am` erfolgreich. Ein echter Keycloak-Server-Flow und
die weiteren 24 Seiten standen zu diesem Zeitpunkt noch aus.

## Stand nach Profil, Passwort und Recovery

Der zweite Schnitt hat außerdem `login-update-profile.ftl`,
`update-email.ftl`, `login-reset-password.ftl`,
`login-update-password.ftl`, `login-recovery-authn-code-config.ftl` und
`login-recovery-authn-code-input.ftl` aus V2 entfernt. Base enthält nun
ein vollständiges generisches Text- und Passwortfeld in `field.ftl`;
V2 behält seine eigene Feldgestaltung. `password-validation.ftl` hat
einen neutralen Base-Standard, während V2 seine Live-Validierung
beibehält. Die Recovery-Code-Logik für Kopieren, Download und Druck
liegt jetzt in Base.

Damit sind zehn von 28 Seitendateien aus V2 entfernt; 18 Seiten bleiben.
Der Vergleich auf demselben Keycloak-Quellstand meldet für alle zehn
Seiten null Unterschiede bei Steuerelementen, Text und Inline-Skripten
in den vorhandenen Normal- und Fehlerzuständen. Die ausgewählten
Layoutboxen bei 1280 und 420 Pixeln stimmen ebenfalls überein. Die
13 Keycloak-Komponententests bestanden erneut. Für Recovery-Code-Druck,
Download und Zwischenablage prüft dieser Schritt den gerenderten
JavaScript-Code, noch keine Browserinteraktion oder einen Server-Flow.

## Stand nach OTP, Passkeys und WebAuthn

Auch `login-config-totp.ftl`, `login-otp.ftl`,
`login-passkeys-conditional-authenticate.ftl`, `webauthn-authenticate.ftl`,
`webauthn-register.ftl`, `webauthn-error.ftl` und
`select-authenticator.ftl` werden jetzt aus Base geerbt. Das bislang
V2-exklusive `qr-code.ftl` liegt unverändert in Base und wird dort sowie
von V2 verwendet. `field.ftl` in Base erhielt einen neutralen Fehlericon-
Standard; V2 behält seine Darstellung.

Damit sind 17 von 28 V2-Seitenkopien entfernt; elf Seiten bleiben.
Beide Theme-Varianten rendern alle sieben neuen Seiten. Für die
TOTP-Einrichtung wurden QR-Ansicht, manuelle Ansicht und Eingabefehler
verglichen, für OTP die normale und die fehlerhafte Eingabe. Der
gleichstandige V2-Vergleich ergab null Unterschiede bei Steuerelementen,
Text und Inline-Skripten sowie null Unterschiede bei den ausgewählten
Layoutboxen auf 1280 und 420 Pixeln. Reale WebAuthn-/Passkey-Geräteflüsse
sind damit noch nicht ausgeführt.

## Stand nach Bestätigungen und Spezialfällen

Die letzten elf Seiten liegen jetzt ebenfalls in Base, einschließlich
`login-oid4vp.ftl` und `oid4vc-credential-offer.ftl`, die zuvor nur V2
hatte. Damit überschreibt V2 **keine der 28 vollständigen Loginseiten**
mehr. `divider.ftl` und `qr-code.ftl` sind ebenfalls nach Base gewandert.
In V2 bleiben 13 FTL-Dateien für Layout und Komponenten.

Bei fachlichen Unterschieden gilt die bisherige V2-Ausgabe als Referenz,
einschließlich dort enthaltener Sicherheitskorrekturen. Die V2-Feld-,
Profil- und Passwortvalidierungsmakros bleiben deshalb als Overrides
erhalten. Ein zusätzlicher Zustand mit verborgenem Benutzernamen zeigte
einen Unterschied bei der Zuordnung eines Fehlers zum Passwortfeld;
Base wurde an das ursprüngliche V2-Verhalten angepasst.

`verify.ts --as-is --expect-all-inherited` prüft, dass alle 28
V2-Seitendateien fehlen und jede Seite in Base und V2 gerendert wird.
Der Vergleich aller gerenderten V2-Seiten und verfügbaren Zustände meldet
null Unterschiede bei Steuerelementen, Klassen, Text und Inline-Skripten.
Die ausgewählten Chromium-Layoutboxen stimmen bei 1280 und 420 Pixeln
ebenfalls überein. Browserinteraktionen mit Passkeys/WebAuthn sowie der
echte Keycloak-Server-Flow bleiben für die abschließende Abnahme.

Ein neuer Keycloak-Test `LoginV2PageInheritanceTest` sichert die 28
geerbten Seitendateien direkt im Repository ab. Er rendert zudem das
Passwortvalidierungsmakro mit der Reihenfolge V2 vor Base und prüft,
dass V2s Live-Validierung einschließlich `textContent` für Fehlermeldungen
verwendet wird. Zusammen mit `LoginLayoutComponentsTest` und
`LoginFieldComponentsTest` wurden 15 Maven-Tests erfolgreich ausgeführt.

Der Editor-Override für `template.ftl` hatte den V2-Footer innerhalb des
Karteninhalts platziert. Dadurch wurde dieser zum letzten Kind von `<main>`;
PatternFlys Regel für das letzte Kind erhöhte den unteren Innenabstand in
der Editor-Vorschau von Upstreams 32 px auf 64 px. Der innere Footer für
Social Login und Info wird nun wie bei Keycloak immer gerendert; der äußere
Footer liegt wieder als Geschwisterelement des Karteninhalts. Ein zwischenzeitlicher
24-px-CSS-Workaround wurde entfernt; die originale Keycloak-V2-CSS bleibt
unverändert.

Für den PR-Vergleich verwendet `verify.ts --as-is` nun keine Editor-Overrides
mehr. Das ist wichtig: Der frühere Vergleich prüfte zwar die Keycloak-Seiten,
renderte aber mit dem angepassten Editor-`template.ftl` und dessen
Theme-Eigenschaften. Der reine Keycloak-Vergleich ergibt null Unterschiede
bei den geprüften Steuerelementen, Attributen und Layoutboxen. Die lokale
Editor-Vorschau kann mit `--with-editor-overrides --write-editor-preview`
weiterhin ausdrücklich mit den Editor-Anpassungen erzeugt werden.

Der Editor ist auf Keycloak 26.7.3 festgelegt, während der PR-Checkout eine
neuere Entwicklungsversion enthält. Deren Theme-Eigenschaften unterscheiden
sich an weiteren Stellen, etwa beim unteren Abstand der Social-Login-Liste.
Die Editor-Vorschau belegt deshalb die korrigierte Footer-Struktur und den
32-px-Innenabstand, aber keine vollständige Pixelgleichheit mit dem neueren
Keycloak-Checkout. Dafür dient der reine Keycloak-Vergleich ohne Overrides.
