# Keycloak Login V2: Seiten nach Base zurückführen

Stand: 17. Oktober 2026. Arbeitsplan für den bestehenden [Keycloak-PR #52724](https://github.com/keycloak/keycloak/pull/52724) und den Theme Editor. Der PR ist der Ausgangspunkt, nicht bereits der vollständige Umbau.

## Ziel und Abnahmekriterien

Base besitzt die Seitenabläufe und die wiederverwendbaren Komponenten. V2 liefert Gestaltung, Eigenschaften, Ressourcen und nur dort eigene Komponenten, wo sich seine Struktur wirklich unterscheidet. Ein abgeleitetes Theme kann eine Komponente ändern, ohne eine ganze Seite zu kopieren.

Der Umbau ist abgeschlossen, wenn:

- V2 keine vollständigen Base-Loginseiten mehr überschreibt. Für jede verbleibende V2-Datei ist begründet, weshalb sie eine eigenständige Komponente oder Seite sein muss.
- Carbon, Bulma und Bootstrap dieselben Base-Seiten rendern und bekannte gemeinsame Fehler an der gemeinsamen Quelle behoben sind.
- Ein minimales Beispiel eine einzelne Komponente überschreibt und mit dem echten Keycloak funktioniert.
- Vorschau, Export-JAR und Test-Keycloak denselben, eindeutig bezeichneten Keycloak-Stand verwenden.
- Die relevanten Login- und Required-Action-Flows samt Fehlerzuständen im Editor und auf dem Server geprüft sind.

## Ausgangslage

- Der Editor ist auf Keycloak `26.7.3` eingestellt (`tools/sync-keycloak-config.json`). In den lokal synchronisierten Quellen liegen 46 Base- und 33 V2-FTL-Dateien. Davon überschreiben 26 V2-Dateien gleichnamige Base-Dateien außerhalb von `template.ftl` und `footer.ftl`; fünf weitere V2-Dateien haben dort kein Gegenstück. Diese Zählung ist eine Dateiinventur, noch keine Bewertung der Unterschiede.
- V2s `field.ftl` bündelt Feldrahmen, Label, Fehlermeldung, Eingabe, Passwortsteuerung, Checkbox und Clipboard. Diese bestehenden Makros bleiben zunächst erhalten. Neue Dateigrenzen entstehen nur für Komponenten, die Themes tatsächlich unabhängig ändern müssen.
- Der bestehende PR führt gemeinsame Button-Makros und Styling-Hooks ein. Laut PR-Beschreibung wurden gerenderte Zustände verglichen; echte Authentifizierungs-Flows waren zu diesem Zeitpunkt noch nicht getestet.
- `sync-keycloak.ts` lädt FTL-Dateien über einen Git-Ref, Übersetzungen und gemeinsame Ressourcen aber über Maven-Artefakte der eingestellten Release-Version. Die Integrationstests verwenden standardmäßig ein Container-Image mit derselben Version. Ein bloßer Wechsel des Git-Refs auf einen PR-Commit würde diese drei Quellen auseinanderziehen.
- Der Export schreibt `theme.properties` mit einer Keycloak-Parent-Referenz. Er muss daher gegen einen Server geprüft werden, der die neue Base-/V2-Struktur tatsächlich enthält. Eine passende Editor-Vorschau allein beweist keinen nutzbaren JAR-Export.

## Arbeitspakete

### 1. Referenzstand und Fehlermatrix festhalten

**Ergebnis:** Eine nachvollziehbare Liste aller 26 V2-Seitenüberschreibungen mit den Spalten Base-Datei, V2-Datei, Unterschied in Verhalten/Struktur/Styling, betroffene Makros, Migrationsentscheidung und Testfall. Daneben eine separate Fehlermatrix für Carbon, Bulma und Bootstrap: Seite, Zustand, Reproduktion, erwartetes Ergebnis und betroffene Frameworks.

Editor-Commit, Keycloak-PR-Commit und Ziel-Branch/Commit für den Major Release werden ausdrücklich festgehalten. Den `login_v2`-Ansatz im Keycloakify-Starter prüfen wir als Entwurfsreferenz; einzelne Dateien oder Makronamen übernehmen wir erst nach einem Vergleich mit der aktuellen Keycloak-Struktur.

### 2. Komponentenvertrag an einem Login-Durchstich beweisen

Zuerst `login.ftl` und `login-username.ftl`/`login-password.ftl` mit Normal- und Fehlerzuständen nach Base führen. Die Base-Seite behält Formularaktion, Bedingungen, Namen, IDs, Autocomplete, Nachrichten und JavaScript-Verhalten. Komponenten erhalten benannte Parameter und dokumentierte Standardwerte. Der erste Schnitt setzt Dateigrenzen bei vollständigen Feldern, Aktionen und Social-Providern; Passwort-Toggle und Fehlerdarstellung bleiben Teil des Feldmakros. Die vorhandenen V2-`field`-Makros werden weiterverwendet.

**Gate:** Ein Theme ersetzt nachweislich ein vollständiges Feld oder den Aktionsbereich, ohne eine Loginseite zu kopieren; Base und V2 nutzen dieselbe Loginseite; Carbon, Bulma und Bootstrap laufen darüber. DOM- und Server-Tests prüfen Formularwerte, Escaping, `aria-invalid`, `aria-describedby`, Fokus, Toggle und Submit. Der Entwurf wird erst dann auf weitere Seiten ausgerollt.

### 3. Editor auf einen reproduzierbaren Entwicklungsstand bringen

Eine explizite Quellenbeschreibung verbindet Git-Commit der Templates, die dazu passenden Keycloak-Artefakte oder einen daraus gebauten Server, Ressourcendateien, Übersetzungen und generierte Previews. Der normale Release-Sync bleibt als Standard erhalten. Ein experimenteller Stand erhält einen eigenen, prüfbaren Pfad; gemischte Versionen führen zu einem Fehler statt zu scheinbar erfolgreichen Previews.

Export und Integrationstests verwenden dieselbe Quellenbeschreibung. Der Testexport enthält entweder die erforderliche Base-/V2-Vererbung oder gibt die genaue kompatible Server-Build-Version als Voraussetzung vor. Ein Integrationstest installiert den exportierten JAR im passenden Keycloak und prüft das Komponenten-Override.

### 4. Weitere Seiten in fachlichen Gruppen migrieren

Reihenfolge nach dem Login-Durchstich: Registrierung und Profil; Passwort-Reset und Required Actions; OTP und Recovery Codes; WebAuthn/Passkeys; verbleibende Bestätigungs-, Fehler- und Spezialseiten. Jede Gruppe endet mit:

1. Makro-Tests für Parameter, optionale Werte, Escaping und Datei-Override.
2. Editor- und Browserprüfungen für die drei Frameworks, relevante Layouts, mobile/Desktop, hell/dunkel und mindestens eine RTL-Sprache.
3. Echten Keycloak-Flows mit Erfolg, Validierungsfehler und Rücknavigation, soweit die Seite diese Zustände hat.

Die Inventur wird pro Gruppe aktualisiert. Ein reiner Styling-Unterschied wandert in CSS/Properties; eine strukturelle Differenz in eine Komponente. Verhalten bleibt in der Base-Seite, sofern es für alle Themes gilt. Breaking Changes für bestehende Base-abgeleitete Themes bekommen eine Migrationsnotiz für den Major Release.

### 5. Test-Deployment und Erweiterung des Keycloak-PRs

Ein separates, versioniertes Editor-Deployment zeigt Editor- und Keycloak-Commit sowie die getesteten Szenarien. Ein echter Test-Keycloak mit Test-Realms ist sinnvoll, wenn die Browser-Integrationstests und ein dauerhaft erreichbarer Server benötigt werden. Hosting und Hostname werden vor dem DNS-Eintrag konkret festgelegt; der DNS-Eintrag ist derzeit noch keine Voraussetzung für die lokale Arbeit.

Erst nach erfolgreichem Editor-, Export- und Server-Test gehen die validierten Änderungen in den bestehenden Keycloak-PR. Commits folgen den Komponenten und Seitengruppen. PR-Beschreibung und Migrationsnotiz enthalten den Komponentenvertrag, Testmatrix, Versionen und die Test-URL.

## Unmittelbar nächster Schritt

Die 26 Seitenüberschreibungen maschinell inventarisieren, ihre Unterschiede klassifizieren und drei bis fünf wiederkehrende Framework-Fehler als reproduzierbare Fälle dokumentieren. Danach den Login-Durchstich als ersten überprüfbaren PR-Schnitt implementieren.

## Noch zu entscheiden

- Welcher Keycloak-Commit den Major-Umbau trägt und ob PR #52724 direkt erweitert oder zunächst in einem Arbeitsbranch vorbereitet wird.
- Wo das Test-Deployment und gegebenenfalls der Test-Keycloak laufen; daraus ergibt sich der DNS-Eintrag.
- Ob der Testexport nur auf dem passenden Keycloak-Build funktionieren soll oder eine eigene Base-/V2-Schicht mitliefert. Diese Entscheidung muss vor einem öffentlichen Exporttest fallen.
