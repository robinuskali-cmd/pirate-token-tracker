# Prüfbericht · Interface 1.1

Stand: 3. November 2026. Das Redesign verändert Darstellung, Navigation und Bedienfeedback. Die bestehende Datenlogik bleibt erhalten.

## Automatisierte Funktionstests

```text
node --test tests/core.test.mjs tests/store.test.mjs tests/database.test.mjs

tests   27
pass    27
fail     0
skipped  0
```

Die Tests prüfen Startwerte, Summen, Idempotenz, Undo, Rundengesamtwerte, Konflikte, Eingabevalidierung, lokale Warteschlangen, Netzwerkfehler vor dem Empfang und nach dem Commit sowie echte PostgreSQL-Funktionen/RLS in PGlite 0.3.14. Zwei simulierte lokale Tabs legen 60 Anfragen gleichzeitig ab.

Die SHA-256-Prüfsummen von `js/store.js`, `js/core.js`, `js/config.js` und `supabase/schema.sql` sind gegenüber der vorherigen Version unverändert.

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

## Grenzen

Ohne eingerichtetes Supabase-Projekt und GitHub-Repository bleiben echter Supabase-Login, Realtime-WebSocket, Token-Refresh, parallele Serververbindungen, zwei physische Geräte und Pages-Deployment ungeprüft. PGlite serialisiert Abfragen einer Instanz. Die Viewport-Prüfung ersetzt keine Prüfung auf mehreren physischen Smartphones und unterschiedlichen Browserengines. Browser-Benachrichtigungen wurden nicht aktiviert und es wurde kein Berechtigungsdialog für den Nutzer bestätigt.

Der Cloud-Abnahmetest steht weiterhin in `README.md`.
