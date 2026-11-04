Aktueller Stand: **92 Tests bestanden**. Jarvis verwendet vorbereitete Audioaufnahmen; frühere SpeechSynthesis-Prüfungen unten dokumentieren die vorherige Implementierung.

# Prüfbericht · Interface 1.1

Stand: 3. November 2026. Das Redesign verändert Darstellung, Navigation und Bedienfeedback. Die bestehende Datenlogik bleibt erhalten.

## Automatisierte Funktionstests

```text
node --test tests/core.test.mjs tests/store.test.mjs tests/database.test.mjs tests/account.test.mjs tests/shortcuts.test.mjs tests/battlepass.test.mjs tests/voice.test.mjs

tests   75
pass    75
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

## Anpassbare Tastaturbelegung · 3. November 2026

Acht zusätzliche Tests prüfen Standardwerte, Normalisierung, dauerhafte Speicherung und Ausschalten, Konflikte mit Undo, beschädigten/gesperrten Speicher, Spielerzuordnung sowie Eingabefelder, Dialoge, gehaltene Tasten, IME und Browser-Kombinationen. Leertaste auf fokussierten Buttons erzeugt keine zusätzliche Zählaktion. Die bestehenden Daten- und Auth-Tests bestehen unverändert.

Die Belegung wird getrennt von Tracker-Daten lokal gespeichert. Ungespeicherte Entwürfe überstehen das normale Neurendern der Oberfläche; erfolgreiche Speicheränderungen werden über das Storage-Ereignis in anderen Tabs übernommen. Es werden keine Supabase-Berechtigungen oder Zählregeln geändert.

Das [Pages-Deployment](https://github.com/schafermax809-arch/pirate-token-tracker/actions/runs/41724422726) war erfolgreich. Auf der veröffentlichten Website im lokalen Demo-Modus geprüft:

- Felder mit Q / W / Q belegt: Speichern zeigt den Undo-Konflikt und übernimmt die ungültige Belegung nicht.
- Auf Q / W / Z korrigiert und gespeichert. Nach vollständigem Neuladen bleiben alle drei Tasten erhalten.
- Ausgangswert Max 500. M zählt nicht mehr, Q zählt genau einmal auf 501. Z stellt 500 wieder her.
- Kürzel ausgeschaltet und gespeichert. Q verändert den Demo-Zähler nicht.
- Max auf Leertaste gelegt: Die Taste wird als „Leertaste“ am +1-Button angezeigt. Leertaste auf dem fokussierten +1-Button zählt genau einmal auf 501; U stellt 500 wieder her.
- Standard wiederhergestellt: aktiv, M / S / U. Anschließend zum angemeldeten Live-Modus zurückgekehrt. Bei diesen Prüfungen wurden keine Cloud-Zählaktionen ausgeführt. Screenshot der neuen Einstellungen liegt im Ausgabeverzeichnis.

Die oben dokumentierte Prüfung mit 25 Viewport-Kombinationen betrifft das ursprüngliche Redesign. Die neue Tastatursektion wurde zusätzlich in der aktuellen Browserbreite visuell geprüft; die vollständige Viewport-Matrix wurde dafür nicht wiederholt.

## Crew-Battlepass · 3. November 2026

Sechs zusätzliche Tests prüfen beide Startbestände ohne XP, zusätzlich gespeicherte Truhen, Stufengrenzen und Abschluss bei Stufe 20, Undo/Korrekturen, gesperrte und manipulierte Titel, dauerhafte kosmetische Auswahl, Trennung nach Spieler/Betriebsmodus und sichtbare Speicherfehler. Die XP werden aus dem gespeicherten Gesamtbestand abzüglich Startbestand berechnet; Änderungen an der Datenbank oder Tracker-Schreibrechten sind nicht erforderlich.

Das [erste Battlepass-Deployment](https://github.com/schafermax809-arch/pirate-token-tracker/actions/runs/41726025280) war erfolgreich. Der neue sechste Navigationspunkt öffnet den Pass im angemeldeten Live-Modus. Der Fortschritt beider Spieler entspricht ihrem gespeicherten Bestand abzüglich Startwert. Alle 20 Belohnungskarten werden dargestellt; die verfügbaren Titel lassen sich ausrüsten, höhere Stufen bleiben gesperrt. „Truhensucher“ ausgerüstet, vollständig neu geladen und anschließend die Anzeige dieses Titels auf Max' Zählkarte bestätigt. Bei der Abnahme wurden keine Cloud-Zählaktionen ausgeführt.

Visuell bei 699 Pixeln Browserbreite geprüft: Hero, XP-Fortschritt, Crew-Vergleich und Kartenraster. Kein horizontaler Dokumentüberlauf und keine über den rechten Viewportrand ragenden Karten/Buttons festgestellt. Die Navigation wurde für sechs Einträge angepasst. Die frühere vollständige Viewport-Matrix gilt weiterhin nur für das ursprüngliche Redesign; für den Battlepass wurde sie nicht wiederholt. Nach dem Deployment benötigte der Browser einen weiteren Reload, bis alle neuen Module verfügbar waren. Danach wurde der Pass erfolgreich bedient.

## Windows-Helfer für Ingame-Hotkeys · 3. November 2026

Portabler C#-/WinForms-Helfer mit dem vorhandenen Windows/.NET-Compiler gebaut. Standard F8/F9/F10, anpassbare Hotkeys, Aktivieren/Deaktivieren, Pause, Systemtray, eigenes Supabase-Login, Token-Erneuerung im Arbeitsspeicher und atomarer lokaler Puffer. Keine geheimen Projektschlüssel, Installation, Administratorrechte oder Eingriffe ins Spiel erforderlich. Die Website enthält eine Download-Anleitung und einen Einstieg in den Einstellungen.

**16 zusätzliche Windows-Selbsttests bestanden.** Sie verwenden die tatsächlichen Helfer-Klassen mit simulierten HTTP-Antworten und prüfen Account-Zuordnung, +1-/Runden-/Undo-Regeln, dauerhaften Puffer, Schreibfehler, Konfliktarchivierung, Hotkey-Validierung, reale Windows-Registrierung mit Freigabe und eine selbst gepostete WM_HOTKEY-Nachricht. Ferner geprüft: verlorene Antwort nach simuliertem Commit ohne Doppelzählung, fehlgeschlagener Snapshot nach erfolgreicher Mutation ohne falsche Konfliktmarkierung, persistenter Server-Konflikt, Token-Refresh mit unveränderter Anfragekennung, Abbruch bei Benutzerwechsel und Abmeldung nur der eigenen Helfersitzung.

Das Anmeldefenster wurde durch den eigenen Renderer ohne Anmeldung erstellt und visuell geprüft. Dies ist eine gerenderte Anwendungsansicht, kein Screenshot einer echten Anmeldung. Der Agent hat keine Benutzerpasswörter eingegeben, keine echten Helfer-Anmeldungen durchgeführt und keine Cloud-Zähler verändert. Tatsächliche Hardware-Tastendrücke bei minimierter Anwendung und Tastenerkennung im laufenden Fortnite sind noch nicht geprüft; dafür ist die Nutzer-Anmeldung und ein anschließender Ingame-Test nötig. Die bereits dokumentierten 49 Website-/Datenbanktests bleiben davon getrennt.

## Browser-Sprachsteuerung · 4. November 2026

18 zusätzliche Tests mit einem simulierten SpeechRecognition-Dienst bestehen. Geprüft: gewünschte Befehle plus eins/fünf/zehn einschließlich Zahlen-/Pluszeichenvarianten, Undo/Pause/Weiter, keine Teiltreffer, normalisierte Befehlskonflikte, Präferenzspeicher und sichtbare Speicherfehler, kein automatischer Mikrofonstart, deutscher kontinuierlicher Modus, Testmodus ohne Mutationen, sequenzielle echte Aktionsübergabe, finale Ergebnis-Indizes und Duplikate, Wiederholschutz, Pause bei weiterhin offenem Mikrofon, Stop mit Freigabe/ignorierten späten Ereignissen, belegte Tab-Sperre, Stop während der Sperranfrage, Mikrofon-/Dienstfehler ohne erneute Anfrage, natürliche Neustarts und Begrenzung schneller Abbrüche, Dialog-/Eingabesperre, Mutationsfehler sowie Verhalten erkannter Befehle bei natürlichem Ende gegenüber manuellem Stop.

Die neue Seite ist über Live und Einstellungen erreichbar; die sechs Hauptnavigationspunkte bleiben erhalten. Standardmäßig ist das Mikrofon aus und der Testmodus aktiv. Nur eine ausdrücklich gestartete Erkennung greift auf die Browser-API zu. Einstellungen werden lokal gespeichert, erkannte Texte nur flüchtig angezeigt und beim Stop gelöscht. Audio und Transkripte werden nicht im Tracker gespeichert. Vor dem Start wird auf eine mögliche Audioübertragung an den Browser-Spracherkennungsdienst hingewiesen.

Kein echtes Mikrofon wurde vom Agenten gestartet, keine Mikrofonberechtigung erteilt und keine echte Audiodatei verarbeitet. Tatsächliche Aussprache-Erkennung, Service-Verfügbarkeit und Hintergrundbetrieb mit Fortnite sind deshalb noch nicht end-to-end geprüft. Simulierte Tests belegen die Ereignis-/Zähllogik, keine Anti-Cheat-Verträglichkeit und keine Zuverlässigkeit in jedem Browser.

## Grenzen

Die Passwortverwaltung wurde um acht automatisierte Prüfungen mit einer simulierten Auth-API ergänzt: Eingabevalidierung, bestätigte Sitzung, Prüfung des bisherigen Passworts, Abbruch bei Benutzerwechsel/abgelaufener Sitzung, Recovery-Modus, unverändertes Redirect-Ziel, generische Rücksetz-Antwort sowie verständliche SMTP-/Ratenlimit-Fehler. Der Browser zeigt das Rücksetzformular; der Link auf der Anmeldeseite sowie ein abgelaufener Link zur Website-Wurzel wurden geprüft. Auth-Fragmente werden nach Verarbeitung aus der URL entfernt. Das Versenden echter Rücksetz-E-Mails und Ändern echter Zugangsdaten wurden nicht vom Agenten ausgeführt; diese Schritte übernimmt der Benutzer. Die E-Mail-Zustellung und der Passwortwechsel selbst wurden nicht beobachtet.

Noch nicht end-to-end geprüft sind Szymons eigener Login, langfristiger Token-Refresh, konkurrierende Änderungen mit zwei verschiedenen Spieleraccounts und zwei physische Geräte. Der Live-Test prüft zwei WebSocket-Verbindungen desselben Max-Accounts im selben Browserprofil. PGlite serialisiert Abfragen einer Instanz. Die Viewport-Prüfung ersetzt keine Prüfung auf mehreren physischen Smartphones und unterschiedlichen Browserengines. Browser-Benachrichtigungen wurden nicht aktiviert und es wurde kein Berechtigungsdialog für den Nutzer bestätigt.

Der Cloud-Abnahmetest steht weiterhin in `README.md`.

## Hymne per Sprachsteuerung

89 automatische Tests bestanden (inklusive PostgreSQL/RLS), davon 8 neue Prüfungen für Medien-Aliasse, Testmodus ohne Zähländerung, Pause/Stopp, reservierte Befehle, Lade- und Audioprobleme, Wiederholschutz, Lautstärke und Stop während eines Downloads. Browser-QA prüft die echte Ogg-Dekodierung und Wiedergabe bei 0 % Lautstärke, den Stopp-Knopf und das responsive Layout. Mikrofonzugriff und echte Spracheingabe wurden nicht automatisch aktiviert. Audioquelle liefert HTTP 200 mit CORS-Freigabe; Quelle/Lizenz in assets/AUDIO-CREDITS.md.

## Jarvis

89 Tests bestanden, einschließlich Datenbank/RLS. Geprüft: 39 eindeutige Befehlsformulierungen mit 94 Varianten; mehrere Zufallsantworten pro Befehl; Texte/Eingaben escaped; keine Zähländerung durch Jarvis in Test- und Echtmodus; Berliner Tageswerte und Stufen; Pause/Eingabeschutz; Vorlese-Abbruch, alte Ereignisse, Fehler, Zeitlimit und Wiederaufnahme nur einer zuvor aktiven Erkennung. Browser-QA in lokaler Demo: unterschiedliche Beleidigungs-Konter per Text, echter SpeechSynthesis-Start/Ende, Stopp, Befehlsliste, 323-Pixel-Layout. Kein echter Mikrofonzugriff oder Cloud-Zähltest.

## Jarvis-Stimme aktivieren

91 Tests bestanden. Neue Regressionstests für stumme Freigabe im Benutzerklick, Fortsetzen pausierter Sprachausgabe, hörbare Lautstärke, Halten/Freigeben der Äußerung, tatsächliches Start-Ereignis und Abbruch während des Starts. Browser-QA: neue Sprachtaste öffnet Coach mit aktivem Vorlesen; Begrüßung erreicht Ende-Ereignis; Mikrofon bleibt aus. Die physische Hörbarkeit am Ausgabegerät wird vom Nutzer beurteilt.

## Jarvis – MP3-Aufnahmen statt stummer Browserstimme

Der Nutzer bestätigt: Die Hymne ist hörbar, die Browserstimme nicht. Deshalb verwendet Jarvis jetzt denselben Web-Audio-Kontext wie die Hymne und 288 lokal erzeugte MP3-Abschnitte. Alle WAV-Ausgangsaufnahmen wurden auf nichtleere Audiosignale geprüft (RMS > 80, 16-Bit-PCM). Der Binärcontainer wird auf lückenlose Bytebereiche und vollständige MP3-Header geprüft. Jede Antwortvorlage einschließlich dynamischer Statuswerte, negativer Tageswerte und aller Titel hat passende Aufnahmen.

92 Tests bestanden. Geprüft: Audio-Caches, Zahlenzerlegung, Status, alle Sprüche, Lade-/Decoderfehler, Stopp während Download und Wiedergabe, Ersatz einer Antwort ohne kurzzeitige Freigabe der Erkennung. Browser-QA: echte MP3-Dekodierung und Wiedergabe der Begrüßung, Statusantwort und Stopp. Kein Mikrofon oder echter Zähltest aktiviert. Physische Hörbarkeit muss der Nutzer bestätigen.
