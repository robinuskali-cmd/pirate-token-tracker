# Prüfbericht · Interface 1.1

Stand: 3. November 2026. Das Redesign verändert Darstellung, Navigation und Bedienfeedback. Die bestehende Datenlogik bleibt erhalten.

## Automatisierte Funktionstests

```text
node --test tests/core.test.mjs tests/store.test.mjs tests/database.test.mjs tests/account.test.mjs

tests   35
pass    35
fail     0
skipped  0
```

Die Tests prüfen Startwerte, Summen, Idempotenz, Undo, Rundengesamtwerte, Konflikte, Eingabevalidierung, lokale Warteschlangen, Netzwerkfehler vor dem Empfang und nach dem Commit sowie echte PostgreSQL-Funktionen/RLS in PGlite 0.3.14. Zwei simulierte lokale Tabs legen 60 Anfragen gleichzeitig ab.

Beim Redesign blieben die SHA-256-Prüfsummen von `js/store.js`, `js/core.js`, `js/config.js` und `supabase/schema.sql` gegenüber der vorherigen Version unverändert. Anschließend wurden für die Cloud-Einrichtung ausschließlich die öffentlichen Projektwerte in `js/config.js` ergänzt.

## Responsive Browserprüfung

Alle fünf Bereiche wurden in einer lokalen, echten Browser-Testansicht mit festgelegten iframe-Viewports geöffnet. Das Testwerkzeug liegt außerhalb des ausgelieferten Projekts. Die Prüfung erfasst Dokumentüberlauf und über den sichtbaren Rand ragende Buttons, Eingaben, Überschriften, Zählanzeigen und Chronometer. Zusätzlich wurden Ansichten visuell kontrolliert.

| Viewportbreite | Live | Logbuch | Statistik | RNG-Labor | Einstellungen |
| --- | --- | --- | --- | --- | --- |
| 1.440 px | bestanden | bestanden | bestanden | bestanden | bestanden |
| 1.024 px | bestanden | bestanden | bestanden | bestanden | bestanden |
| 768 px | bestanden | bestanden | bestanden | bestanden | bestanden |
| 390 px | bestanden | bestanden | bestanden | bestanden | bestanden |
| 320 px | bestanden | bestanden | bestanden | bestanden | bestanden |

**25 geprüfte Seiten-/Breitenkombinationen, kein horizontaler Dokumentüberlauf und keine Randfehler der geprüften Elemente.** Bei vorhandenem Scrollbalken ist die Inhaltsbreite bis zu 15 Pixel schmaler als der gewählte Viewport.

In der 680 Pixel hohen Mobil-Testansicht liegt die vollständige eigene +1-Taste bei 390 Pixeln Breite bis ungefähr y=579 und bei 320 Pixeln bis ungefähr y=584. Sie liegt damit vor der unteren Navigation und ist ohne Scrollen erreichbar. Beide Counter behalten ihren eigenen Wert; auf Mobilgeräten steht das eigene Zählwerk zuerst.

## Manuell geprüfte Bedienabläufe

- Start: Max 500, Szymon 1.100, Team 1.600.
- Max +1, +5, +10, danach Undo: Max 506. Tastatur M: Max 507.
- Session mit Route `Hafen <Nord> → Küste` erstellt. Die Winkelzeichen werden als Text angezeigt, nicht als HTML interpretiert.
- Gemeinsame Runde gestartet, Max +10 live, endgültigen Rundengesamtwert 15 mit Dauer 12,5 Minuten eingetragen: Max 522, Team 1.622. Es werden nur weitere fünf Rundentruhen addiert.
- Spielerwechsel zu Szymon, +5, gemeinsamer Rundenabschluss: Rundenbuch zeigt Max 15 / Szymon 5 / Team 20.
- Abgeschlossene Runde bearbeitet, Szymon auf 3 korrigiert: Teamgesamt 1.625; Rundenwert 18. Rekorde, Tagesdiagramm und Crew-Vergleich ziehen nach.
- Neuladen erhält Max 522 / Szymon 1.103 und die aktive Session. Session danach regulär beendet; Archiv bleibt erhalten.
- RNG: Standardrechnung, eine Milliarde Truhen, gerundetes Ergebnis `> 99,99 %`, Eingabefehler bei negativen Truhen und Randfall 0 % mit unendlicher erforderlicher Truhenzahl geprüft.
- Tastaturfokus nach einem Counter-Update sowie Navigation, Dialoge, aktive Sessions und die klare Sperre des fremden Counters geprüft.
- Eigene Demo-Testdaten anschließend über den bestätigten Reset auf 500 / 1.100 zurückgesetzt. Die Vorschaubilder zeigen diese sauberen Startwerte.

## Lesbarkeit und Zustände

Die zentralen Farbpaare wurden rechnerisch geprüft:

| Verwendung | Kontrast |
| --- | --- |
| Fließtext auf Marineblau | 14,42:1 |
| Sekundärtext auf Marineblau | 7,56:1 |
| Kleine Instrumentenbeschriftungen auf Marineblau | 5,44:1 |
| Messing auf Marineblau | 7,45:1 |
| Dunkle Schrift auf aktiver oranger Taste | 6,55:1 |

Hover-, gedrückte, gesperrte, Fokus-, Lade- und Fehlerzustände sind definiert. Formularaktionen zeigen Ladefeedback und `aria-busy`. Die CSS-Regeln und die JavaScript-Abfrage für `prefers-reduced-motion` deaktivieren Bewegungsfeedback und den Sekundenzeiger; das Betriebssystem wurde zum Testen nicht umgestellt. Externe Webfonts haben lokale Fallbacks.

## GitHub Pages · 3. November 2026

- Öffentliches [Repository](https://github.com/schafermax809-arch/pirate-token-tracker) angelegt und alle 24 Projektdateien hochgeladen; keine Testabhängigkeiten oder privaten Zugangsdaten veröffentlicht.
- GitHub Pages verwendet den enthaltenen GitHub-Actions-Workflow. Der [erste Deployment-Lauf](https://github.com/schafermax809-arch/pirate-token-tracker/actions/runs/41698542856) war erfolgreich.
- Die [veröffentlichte HTTPS-Seite](https://schafermax809-arch.github.io/pirate-token-tracker/) lädt Oberfläche und Module im Repository-Unterpfad korrekt.
- Startwerte 500 / 1.100 / Team 1.600 geprüft. Ein +1-Klick ergab 501 / Team 1.601 und blieb nach Neuladen erhalten. Rückgängig stellte 500 / Team 1.600 wieder her.
- Alle 27 lokalen Funktionstests vor der Veröffentlichung erneut bestanden. Der Pages-Workflow prüft zusätzlich Kern- und Warteschlangenlogik vor jedem Deployment.
- Beim ersten Pages-Deployment wurde der lokale Demo-Modus geprüft. Die Supabase-Verbindung wurde anschließend ergänzt.

## Supabase-Einrichtung · 3. November 2026

- Neues Projekt `pirate-token-tracker` in Central EU (Frankfurt), Zustand Healthy.
- Leere Datenbank vor der Installation festgestellt; das ausgelieferte `supabase/schema.sql` erfolgreich ausgeführt.
- Startwerte Max 500 / Szymon 1.100 bestätigt. RLS ist auf allen sechs Tracker-Tabellen einschließlich `tracker_private.requests` aktiv; die fünf öffentlichen Tracker-Tabellen sind in `supabase_realtime` enthalten.
- E-Mail-Anmeldung aktiv, öffentliche Neuregistrierungen und anonyme Anmeldung deaktiviert.
- GitHub-Pages-Adresse als Site URL und genaue erlaubte Redirect-URL gespeichert.
- Öffentliche Projekt-URL und Publishable Key in der Website konfiguriert. Keine Datenbankpasswörter oder Secret-/Service-Role-Keys im Quellcode.
- Auth-Settings-API mit dem öffentlichen Key erreichbar (HTTP 200). Unangemeldeter Aufruf von `tracker_snapshot` wird abgelehnt (HTTP 401, SQLSTATE 42501: permission denied for function tracker_snapshot).
- Beide vom Nutzer angelegten Auth-Accounts sind bestätigt und eindeutig den Spielerrollen zugeordnet. Die Datenbank bestätigt für Max 500 und Szymon 1.100 Starttruhen sowie `login_assigned = true` für beide. Passwörter wurden vom Nutzer selbst gesetzt und nicht im Projekt gespeichert.
- Das [Deployment der Supabase-Konfiguration](https://github.com/schafermax809-arch/pirate-token-tracker/actions/runs/41710644862) war erfolgreich. Die ausgelieferte Konfiguration enthält die richtige Projekt-URL und einen öffentlichen Publishable Key; die Website lädt anschließend das echte Anmeldeformular.

## Live-Abnahme mit Max · 3. November 2026

- Nutzer selbst als Max angemeldet; die Einstellungen zeigen Max und „Live verbunden“. Kein Passwort vom Agenten eingegeben oder ausgelesen.
- Ausgangsstand Max 500 / Szymon 1.100 / Team 1.600; keine Session und keine vorgemerkten Änderungen. Szymons Zählwerk ist für Max gesperrt.
- Zweiten Tab derselben Website im selben Browserprofil geöffnet. Auch dort bestätigte Realtime die Verbindung.
- Im ersten Tab genau einmal +1 geklickt. Nach dem Speichern: Max 501 / Team 1.601, Warteschlange leer. Der zweite Tab zeigte die gespeicherte Änderung einschließlich Tagesauswertung ohne Neuladen.
- Ersten Tab neu geladen: Anmeldung und Cloud-Stand 501 / 1.100 blieben erhalten; Realtime verband sich wieder.
- Den Testklick über Rückgängig zurückgenommen. Beide Tabs zeigten wieder Max 500 / Szymon 1.100 / Team 1.600. Beide Warteschlangen waren leer und die Tages-Nettoänderung wieder 0.
- Der Test hinterlässt die regulären zwei Audit-Einträge (+1 und Undo −1), keine zusätzliche Session oder Runde. Der zusätzliche Testtab wurde geschlossen.

## Grenzen

Die Passwortverwaltung wurde um acht automatisierte Prüfungen mit einer simulierten Auth-API ergänzt: Eingabevalidierung, bestätigte Sitzung, Prüfung des bisherigen Passworts, Abbruch bei Benutzerwechsel/abgelaufener Sitzung, Recovery-Modus, unverändertes Redirect-Ziel, generische Rücksetz-Antwort sowie verständliche SMTP-/Ratenlimit-Fehler. Der Browser zeigt das Rücksetzformular; der Link auf der Anmeldeseite sowie ein abgelaufener Link zur Website-Wurzel wurden geprüft. Auth-Fragmente werden nach Verarbeitung aus der URL entfernt. Das Versenden echter Rücksetz-E-Mails und Ändern echter Zugangsdaten wurden nicht vom Agenten ausgeführt; diese Schritte übernimmt der Benutzer. Die E-Mail-Zustellung und der Passwortwechsel selbst wurden nicht beobachtet.

Noch nicht end-to-end geprüft sind Szymons eigener Login, langfristiger Token-Refresh, konkurrierende Änderungen mit zwei verschiedenen Spieleraccounts und zwei physische Geräte. Der Live-Test prüft zwei WebSocket-Verbindungen desselben Max-Accounts im selben Browserprofil. PGlite serialisiert Abfragen einer Instanz. Die Viewport-Prüfung ersetzt keine Prüfung auf mehreren physischen Smartphones und unterschiedlichen Browserengines. Browser-Benachrichtigungen wurden nicht aktiviert und es wurde kein Berechtigungsdialog für den Nutzer bestätigt.

Der Cloud-Abnahmetest steht weiterhin in `README.md`.
