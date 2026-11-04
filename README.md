# Pirate Token Tracker

Ein privates Truhen-Logbuch für **Max (500 Starttruhen)** und **Szymon (1.100 Starttruhen)**. Statische Website in HTML, CSS und JavaScript mit ES-Modulen. Kein Build-Schritt für die Website erforderlich.

**Lieferstatus:** Die [Website](https://schafermax809-arch.github.io/pirate-token-tracker/) und das öffentliche [Repository](https://github.com/schafermax809-arch/pirate-token-tracker) sind veröffentlicht. Das Supabase-Projekt in Frankfurt ist angelegt; Tabellen, RPCs, Startwerte, RLS und Realtime-Publication sind eingerichtet. Beide bestätigten Spielerzugänge sind ihren Rollen Max und Szymon zugeordnet. Die öffentlichen Verbindungsdaten stehen in `js/config.js`. Auf der Website mit dem jeweiligen Spieleraccount anmelden, um die gemeinsame Datenbank zu verwenden. Die optionale Demo speichert weiterhin ausschließlich im Browser.

## Interface 1.1 · Visuelles Redesign

Die gesamte Oberfläche wurde als nautisches Crew-Bedienpult neu gestaltet: mechanische Zählwerke, kalibrierte Kursleiste, Session-Chronometer und Crew-Kursvergleich. Die kompakte Navigation ersetzt die Sidebar; auf dem Smartphone steht das eigene Zählwerk zuerst. Alle bisherigen Datenfunktionen bleiben erhalten.

[Designkonzept und Komponenten](./DESIGN.md) · [Aktueller Prüfbericht](./TESTREPORT.md)

## Schnell ausprobieren

1. Diesen Ordner entpacken.
2. [Node.js](https://nodejs.org/) installieren, falls noch nicht vorhanden.
3. Im Ordner ein Terminal öffnen und `node server.mjs` ausführen.
4. Im Browser `http://127.0.0.1:4173` öffnen.

Alternativ einen beliebigen statischen HTTP-Server verwenden. `index.html` nicht per Doppelklick als `file://` öffnen: ES-Module benötigen HTTP/HTTPS. Die lokale Demo startet ohne Supabase und ohne npm-Installation. Nur die optionalen Webfonts kommen von Google Fonts; bei fehlender Verbindung greifen Systemschriften.

Die Demo speichert im Browserprofil unter dieser Website-Adresse. Unter Einstellungen zwischen Max und Szymon wechseln oder in den Counterkarten auf „Als … testen“ klicken. Zwei Tabs derselben Adresse teilen die Demo-Daten; unterschiedliche Browserprofile und Geräte teilen sie nicht. Demo-Daten werden **nicht** automatisch in Supabase importiert. Die echte Datenbank beginnt mit den vereinbarten 1.600 Starttruhen.

## Architektur und Dateien

```text
index.html                 Einstiegspunkt, Metadaten, Dialog und Toast
assets/styles.css          Responsive Dark-Mode-Oberfläche
assets/mark.svg             Eigenes nautisches Logo
js/config.js               Öffentliche Supabase-Projektdaten
js/app.js                  Bedienabläufe, Formulare, Fokus, Feedback und Timer
js/views.js                Neues Rendering für alle fünf Bereiche und Instrumente
js/store.js                Auth, Realtime, Nachladen und dauerhafte Warteschlange
js/core.js                 Berechnungen, Validierung und lokaler Demo-Datenkern
js/charts.js               Zugängliche SVG-Diagramme, ohne Chart-Bibliothek
js/icons.js                SVG-Symbole
supabase/schema.sql        Tabellen, Constraints, RLS und transaktionale RPCs
supabase/link-players.sql  Administrator-Zuordnung der beiden Auth-IDs
tests/                     Logik-, Warteschlangen- und PostgreSQL-Tests
.github/workflows/pages.yml GitHub-Pages-Deployment
server.mjs                 Nur lokaler Entwicklungsserver
```

Der Browser liest einen konsistenten Snapshot mit `tracker_snapshot()`. Schreibzugriffe erfolgen ausschließlich über `tracker_mutate(request_id, action, payload)`. Ein transaktionsweiter Advisory Lock verarbeitet Änderungen der kleinen Zwei-Spieler-Crew der Reihe nach. Totale werden aus unveränderlichen Startwerten plus einem append-only Änderungsprotokoll berechnet. Kein Gerät überschreibt eine lokal gecachte Gesamtsumme.

Jede Nutzeraktion erhält vor dem Versand eine UUID. Bei Wiederholung derselben Aktion liefert die Datenbank Erfolg ohne erneute Addition; eine Wiederverwendung der UUID mit verändertem Inhalt wird abgelehnt. Die Anfragen werden dauerhaft in `tracker_private.requests` behalten. Nicht ohne durchdachte Retention-/Replay-Strategie löschen.

Absolute Rundengesamtwerte prüfen sowohl die gelesene Truhenzahl als auch eine Revisionsnummer. Veraltete Korrekturen und verspätete Klicks auf abgeschlossene/korrigierte Runden werden sichtbar abgelehnt. Ein Rundenabschluss prüft die Werte beider Spieler nochmals, bevor er die Runde beendet.

## 1. Supabase-Projekt erstellen

1. Im [Supabase Dashboard](https://supabase.com/dashboard) ein neues Projekt erstellen. Ein starkes Datenbankpasswort wählen und sicher aufbewahren. Es gehört niemals in dieses Frontend.
2. Projekt fertig provisionieren lassen.
3. Im **SQL Editor** eine neue Abfrage öffnen und den gesamten Inhalt von `supabase/schema.sql` ausführen.
4. Prüfen, dass die Tabellen `tracker_players`, `tracker_sessions`, `tracker_rounds`, `tracker_round_counts` und `tracker_changes` unter `public` vorhanden sind.
5. `tracker_players` muss genau die beiden Zeilen `max` mit 500 und `szymon` mit 1.100 enthalten. `auth_id` ist zunächst leer.

Das Schema ist wiederholbar: `ON CONFLICT DO NOTHING` verhindert, dass die Startwerte beim erneuten Ausführen addiert werden. Spätere Änderungen gehören in separate Migrationen; das erneute Ausführen dieser Erstinstallation migriert keine beliebigen abweichenden bestehenden Tabellen.

## 2. Genau zwei Auth-Accounts freischalten

1. Unter **Authentication → Providers / Sign In** die E-Mail-Anmeldung einschalten, sofern sie nicht bereits aktiv ist.
2. **Öffentliche Neuregistrierungen abschalten** („Allow new users to sign up“ bzw. entsprechende Einstellung). Anonyme Anmeldung ebenfalls deaktiviert lassen.
3. Unter **Authentication → Users → Add user / Create user** zwei Benutzer für eure eigenen E-Mail-Adressen anlegen. Jeder Spieler bekommt ein eigenes Passwort. Bei administrativer Erstellung die E-Mail als bestätigt markieren, falls diese Option verfügbar ist. Ohne bestätigte E-Mail kann der Passwort-Login je nach Projekteinstellung blockiert sein.
4. Die UUID jedes Benutzers aus der Benutzerliste kopieren.
5. In `supabase/link-players.sql` `MAX-AUTH-UUID-HIER` und `SZYMON-AUTH-UUID-HIER` durch die passenden echten UUIDs ersetzen. Beide müssen unterschiedlich sein.
6. Die angepasste Datei im SQL Editor ausführen.

Prüfung im SQL Editor:

```sql
select id, name, auth_id, initial_chests
from public.tracker_players
order by id;
```

Nur diese Zuordnung durch einen Administrator vergibt Zugang. Der Browser kann keine Spielerrolle beanspruchen oder `auth_id` ändern. Ein weiterer Auth-Benutzer ohne Zuordnung bekommt weder Daten noch Schreibzugriff. Ein Spieler darf beide Werte sehen, aber ausschließlich die eigenen Truhen bearbeiten. Gemeinsame Sessions und Runden dürfen beide starten und beenden.

## 3. Realtime und öffentliche Projektdaten

1. In den Datenbank-/Realtime-Einstellungen prüfen, dass die Publication **supabase_realtime** alle fünf `tracker_*`-Tabellen enthält. Das SQL-Schema fügt sie hinzu, wenn diese Publication im Projekt vorhanden ist.
2. Falls die Publication noch nicht bestand, zuerst Realtime im Projekt aktivieren und anschließend `schema.sql` erneut ausführen oder die fünf Tabellen in der Publication einschalten.
3. Aus dem Projekt-Dialog **Connect** oder den API-Einstellungen die **Project URL** und den öffentlichen **Publishable Key** kopieren. Alternativ wird der ältere öffentliche `anon`-Key unterstützt.
4. `js/config.js` bearbeiten:

```js
export const config = {
  supabaseUrl: 'HIER_DIE_ECHTE_HTTPS_PROJEKT_URL',
  supabasePublishableKey: 'HIER_DER_ECHTE_OEFFENTLICHE_KEY',
};
```

Diese Zeichenfolgen sind ausdrücklich Platzhalter und müssen ersetzt werden. Einen öffentlichen Key im Frontend zu verwenden ist vorgesehen: RLS und die RPC-Berechtigungen schützen die Daten. **Niemals `service_role`, einen `sb_secret_…`-Key oder das Datenbankpasswort verwenden.**

5. Die Website neu laden. Bei zuvor explizit gewählter Demo unter Einstellungen „Zum Live-Zugang“ wählen.
6. Mit dem jeweiligen E-Mail-/Passwort-Account anmelden.

Die Website verwendet den Supabase JavaScript Client in der festen Version 2.81.1 über `esm.sh`. Der Live-Modus benötigt Zugriff auf dieses CDN und eure Supabase-Domain. Die Demo benötigt diesen Client nicht. GitHub Pages liefert alles über HTTPS aus.

Nach erfolgreicher Realtime-Anmeldung steht oben „Live verbunden“. „Verbunden · Abruf“ bedeutet, dass die Datenbank gelesen werden kann, aber Realtime noch nicht bestätigt ist. Bei Realtime-Unterbrechungen wird weiter alle 30 Sekunden nachgeladen, solange die Seite sichtbar ist. Bei Reconnect, Fensterwechsel und erneuter Internetverbindung wird ebenfalls ein kompletter Snapshot geholt.

## 4. GitHub Pages veröffentlichen

1. Das vorhandene [Repository](https://github.com/schafermax809-arch/pirate-token-tracker) verwenden oder für eine eigene Kopie ein neues Repository erstellen.
2. Den **Inhalt** dieses Projektordners in die Wurzel des Repositorys hochladen. `index.html` und der Ordner `.github/workflows` müssen enthalten sein. `node_modules/` nicht hochladen.
3. Als Standardbranch `main` verwenden. Falls euer Branch anders heißt, diesen Namen im Workflow unter `branches` anpassen.
4. Unter **Settings → Pages → Build and deployment → Source** **GitHub Actions** auswählen.
5. In **Actions** den Workflow „Publish Pirate Token Tracker“ ausführen oder durch einen Push nach `main` starten lassen.
6. Nach erfolgreichem Lauf zeigt **Settings → Pages** eure tatsächliche Website-URL an.
7. Im Supabase Dashboard unter **Authentication → URL Configuration** diese HTTPS-URL als **Site URL** setzen. Bei einer Projektseite den Repository-Unterpfad mit angeben. Diesen Pfad auch in erlaubten Redirect-URLs aufnehmen, wenn ihr später E-Mail-/Recovery-Flows verwendet. Der enthaltene Passwort-Login benötigt keinen OAuth-Redirect.
8. Die veröffentlichte URL auf beiden Geräten öffnen und mit unterschiedlichen Spieleraccounts anmelden.

Alle Asset-Pfade beginnen mit `./`; damit funktionieren auch GitHub-Projektseiten in Unterordnern. Der Workflow lädt nur Website-Dateien und die Einrichtungsdateien hoch, keine Testabhängigkeiten. Die Website selbst ist statischer öffentlicher Quellcode; eure privaten Spielerdaten sind durch Supabase Auth/RLS geschützt. GitHub Pages ist kein Zugangsschutz für HTML/JavaScript.

Der Workflow führt die Kern- und Warteschlangentests vor dem Deployment aus. Für Pages ist kein Node.js im Browser und kein laufender Backendserver aus diesem Repository erforderlich.

## Bedienung

### Tracker-Passwort ändern oder zurücksetzen

- Angemeldet: **Einstellungen → Passwort ändern**. Bisheriges Passwort bestätigen und ein neues Passwort mit mindestens 12 Zeichen zweimal eingeben.
- Vergessen: Auf der Anmeldeseite **Passwort vergessen?** öffnen oder direkt [Passwort zurücksetzen](https://schafermax809-arch.github.io/pirate-token-tracker/account.html#reset). Die eigene Spieler-E-Mail eingeben und den Rücksetzlink selbst anfordern. Im E-Mail-Link ein neues Passwort setzen; Truhen und Runden bleiben erhalten.
- In Supabase muss die genaue URL `https://schafermax809-arch.github.io/pirate-token-tracker/account.html` unter **Authentication → URL Configuration → Redirect URLs** erlaubt sein. Für dieses Projekt ist sie bereits eingetragen. Bei einer Kopie des Projekts die eigene Adresse verwenden.
- Abgelaufene Links zeigen eine Meldung und die Möglichkeit, einen neuen Link anzufordern. Alte Supabase-Dashboard-Rücksetzlinks zur Website-Wurzel werden ebenfalls zur Passwortseite geleitet.
- Supabase übernimmt den E-Mail-Versand. Bei Ratenlimits später erneut versuchen; bei nicht freigegebenen Empfängeradressen muss der Projektinhaber eigenen SMTP-Versand konfigurieren. Es wurde keine Rücksetz-E-Mail automatisch versendet und kein echtes Passwort zum Test geändert.

Die Website speichert Passwörter weder im Projekt noch im eigenen Browserspeicher. Die normalen Supabase-Anmeldesitzungen bleiben davon getrennt bestehen. Die Implementierung verwendet [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) und [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser).

### Live zählen

- Ohne Session könnt ihr Truhen direkt auf eurem persönlichen Counter zählen. Diese erscheinen im Tagesdiagramm und in der Gesamtsumme, gehören aber keiner Runde oder Session an.
- Für auswertbare Farmrunden zuerst **Session starten**, dann **Runde starten**. Während einer aktiven Session ist eine laufende Runde Voraussetzung für Live-Klicks.
- **+1**, **+5** und **+10** zählen zum eigenen Account. Standardmäßig nutzt Max alternativ **M**, Szymon **S**. **U** nimmt den eigenen letzten geeigneten Live-Klick zurück. Gedrückthalten wiederholt nicht automatisch.
- Die Gegenkarte ist absichtlich gesperrt. In der Demo könnt ihr den Testspieler wechseln.
- „Rückgängig“ kehrt einen Live-Klick genau einmal um. Nach einer absoluten Korrektur oder einem Rundenabschluss bitte den Rundengesamtwert im Rundenbuch bearbeiten. Die Oberfläche lädt für die schnelle Undo-Funktion die jüngsten 200 Änderungen; ältere Runden lassen sich weiterhin bearbeiten.

### Crew-Battlepass

Der Bereich **Battlepass** enthält 20 dauerhaft verfügbare Stufen. Jede gespeicherte Truhe oberhalb des persönlichen Startbestands gibt 10 XP. Alle 1.000 XP (100 Truhen) wird ein neuer Piratentitel freigeschaltet, bis zur Piratenlegende bei Stufe 20 / 2.000 zusätzlich erfassten Truhen. Bestehende zusätzlich erfasste Truhen zählen automatisch mit. Weitere Truhen erhöhen auch nach Stufe 20 die Gesamt-XP.

Der Fortschritt wird aus den gespeicherten Supabase-Zählwerten berechnet und ist damit auf allen angemeldeten Geräten gleich. Startbestände, vorgemerkte Offline-Klicks und wiederholtes Laden geben keine zusätzlichen XP. Undo und Korrekturen können Stufen wieder zurücknehmen. Dies ist ein eigener kostenloser Tracker-Pass mit virtuellen Titeln.

**Ausrüsten** zeigt einen freigeschalteten Titel auf der eigenen Zählkarte an. Diese kosmetische Auswahl wird nur in diesem Browser gespeichert, getrennt nach Account und Demo/Live; andere Tabs desselben Accounts übernehmen sie. Über **Basistitel verwenden** lässt sie sich zurücksetzen. Wird der gewählte Titel durch eine Zählkorrektur gesperrt, wird der Basistitel angezeigt. Es gibt keine zusätzlichen Datenbanktabellen oder Schreibrechte für den Battlepass.

### Sprachsteuerung im Browser

**Live → Modus & Befehle** oder **Einstellungen → Sprachsteuerung** öffnet [die Spracheingabe](https://schafermax809-arch.github.io/pirate-token-tracker/#voice). Der Windows-Hotkey-Helfer ist dafür nicht nötig und kann beendet bleiben.

| Gesprochener Befehl | Aktion |
| --- | --- |
| plus eins / plus 1 | +1 Truhe |
| plus fünf / plus 5 | +5 Truhen |
| plus zehn / plus 10 | +10 Truhen |
| rückgängig | Letzten eigenen geeigneten Live-Klick zurücknehmen |
| pause | Zählbefehle pausieren; Mikrofon hört weiterhin auf „weiter“ |
| weiter | Zählbefehle fortsetzen |

Die Befehle sind anpassbar. Erst **Mikrofon starten** anklicken und selbst die Mikrofonfreigabe erteilen. Der voreingestellte **Testmodus** verändert keine Zählwerte. Nach erfolgreichem Test **Echt zählen** wählen und das Mikrofon erneut starten. Jeder Seitenstart beginnt wieder ausgeschaltet im Testmodus. Einstellungen und Signaltöne gelten für diesen Browser; Mikrofonzustand und erkannte Sprache werden nicht gespeichert oder an Supabase gesendet.

Die Funktion verwendet die [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). Sie ist nicht in allen Browsern verfügbar; z. B. Chrome kann Audiodaten an einen externen Spracherkennungsdienst senden. Das steht vor dem Start im Interface. Es gibt keine Zusage lokaler/offline Verarbeitung. Der Agent aktiviert kein Mikrofon automatisch und bestätigt keine Mikrofonberechtigung für den Nutzer.

Browser geöffnet lassen. Hintergrundbetrieb und Unterbrechungen hängen von Browser/OS ab und müssen auf dem eigenen Gerät geprüft werden. Kurze natürliche Dienstunterbrechungen werden bei weiterhin gewollter Aufnahme erneut verbunden; Berechtigungs-, Netzwerk- und Gerätefehler stoppen bis zum nächsten eigenen Start. Wiederholte schnelle Abbrüche werden begrenzt. Dies ist keine Anti-Cheat-Freigabe und kein Ersatz für einen tatsächlichen Ingame-Test.

Nur vollständige passende Befehle zählen; mehrere Befehle in einem Satz werden nicht als Teiltreffer interpretiert. Finale Erkennungsindizes zählen nur einmal, zusätzlich gilt eine Sekunde Wiederholschutz. Sprachbefehle werden nacheinander über die vorhandenen Add-/Undo-Funktionen verarbeitet. Headset verwenden; andere Stimmen oder Spielton können sonst Befehle auslösen. Die browserweite Web-Lock-Sperre erlaubt nur einem Tracker-Tab das Zuhören. Bei Accountwechsel, Reload, angehaltenem Tab und beim Öffnen eines Tracker-Dialogs wird die Aufnahme beendet. **Mikrofon stoppen** bricht die Erkennung einschließlich noch nicht abgearbeiteter Befehle ab. Bereits vorgemerkte Zählungen bleiben erhalten.

### Windows-Helfer für globale Hotkeys

Über **Einstellungen → Tastaturbelegung → Ingame-Hotkeys** öffnet ihr die [Download- und Einrichtungsseite](https://schafermax809-arch.github.io/pirate-token-tracker/ingame.html). Der optionale portable Windows-Helfer meldet sich mit dem vorhandenen Tracker-Account direkt bei Supabase an. Standard: **F8 +1**, **F9 Rückgängig**, **F10 Pause/Fortsetzen**. Nach **Hotkeys aktivieren** das Fenster minimieren und spielen; der Browser kann geschlossen bleiben. Eigene Tastenbelegungen sind im Helfer möglich und unabhängig von den Browser-Kürzeln.

Eine aktive Session benötigt vorher eine gestartete Runde. Der Helfer benutzt dieselben Datenbankregeln und eindeutigen Anfragekennungen. Offene Anfragen bleiben nach Verbindungsabbrüchen/Neustarts im lokalen Puffer, Zugangsdaten bleiben nur im Arbeitsspeicher. Bei jedem Helferstart neu anmelden. Der Windows-Helfer verwendet `RegisterHotKey` mit Wiederholsperre und keine Spiel-Hooks. Windows-API und Übertragung wurden geprüft; ein tatsächlicher Tastendruck während einer Fortnite-Sitzung muss noch vom Nutzer geprüft werden.

Quellcode, Datenablage, Fehlerbehandlung und lokale Bau-/Prüfanleitung: [desktop/README.md](./desktop/README.md). Der eigenständig gebaute Download ist unsigniert.

### Tastaturbelegung anpassen

Unter **Einstellungen → Tastaturbelegung** ein Tastenfeld anklicken, die gewünschte Taste drücken und **Belegung speichern** wählen. Erlaubt sind einzelne Buchstaben, Ziffern, Pfeiltasten und die Leertaste. Rückgängig muss eine andere Taste als +1 verwenden. Max und Szymon dürfen dieselbe +1-Taste verwenden, weil nur der eigene Spieler zählt.

Die Belegung gilt für diesen Browser, bleibt nach Neuladen erhalten und wird zwischen seinen Tabs geteilt. Sie wird nicht im Supabase-Konto gespeichert. Der Schalter **Tastenkürzel aktiv** schaltet die Kürzel aus; **Standard wiederherstellen** aktiviert wieder M / S / U. Die Zählwerke zeigen die aktuell gespeicherten Tasten an. Nicht gespeicherte Änderungen wirken sich noch nicht auf das Zählen aus.

In Eingabefeldern und Dialogen zählen Tastenkürzel nicht. Strg-/Alt-/Cmd-Kombinationen bleiben beim Browser. Auf fokussierten Buttons und Links behält die Leertaste ihre normale Funktion. Speicherfehler und widersprüchliche Belegungen werden angezeigt, ohne die bisherige Belegung zu überschreiben.

### Nach einer Runde eintragen – ohne Doppelzählung

- Läuft die Runde bereits, **Wert eintragen** öffnen und deren **endgültigen Gesamtwert** eingeben.
- Beispiel: 10 live gezählt, tatsächlich 15 geöffnet → Gesamtwert **15** eingeben. Es werden **nur +5** addiert.
- Wurden 20 gezählt, aber nur 18 geöffnet, den Gesamtwert **18** speichern. Das Protokoll bekommt eine Korrektur von **−2**.
- Jeder Spieler bestätigt/korrigiert seinen eigenen Wert. Erst danach die gemeinsame Runde abschließen.
- Habt ihr eine bereits gespielte Runde noch gar nicht erfasst, bei aktiver Session und ohne laufende Runde „Runde eintragen“ verwenden. Dieser Vorgang erstellt eine **zusätzliche Runde**. Der zweite Spieler öffnet danach dieselbe Runde im Rundenbuch und ergänzt dort den eigenen Gesamtwert. Nicht eine zweite Runde für dieselbe gemeinsame Runde anlegen.
- Eine irrtümlich angelegte Runde bleibt im Audit erhalten; beide Spieler können ihre Werte auf 0 korrigieren. Sie zählt weiterhin als Runde. Es gibt absichtlich keinen destruktiven Löschknopf für gespeicherte Historie.
- Dauer ist optional. Bei Live-Runden wird sie automatisch erfasst. Ein angegebener Dauerwert überschreibt die individuelle Auswertungsdauer; für das Team wird bei vorhandenen Angaben deren Maximum verwendet. Ohne Dauer werden manuelle Runden nicht in Geschwindigkeiten/Spielzeit einbezogen.

Eine Session kann nicht beendet werden, solange noch eine Runde läuft. Sessions und Runden liegen in der Datenbank und bleiben beim Schließen beider Geräte aktiv. Timer basieren auf den gespeicherten Startzeiten; geschlossene Zeit zählt deshalb mit. Eine Browseruhr mit falscher Systemzeit kann die lokale Timeranzeige beeinflussen, gespeicherte Cloud-Start- und Endzeiten kommen vom Server.

### Verbindungsabbrüche und Konflikte

Jede Anfrage wird **vor dem Versand im lokalen Browserspeicher** abgelegt. Offene Live-Klicks erscheinen im Counter vorläufig und mit Hinweis. Bei verlorener Verbindung, einem Neuladen oder einer verloren gegangenen Serverantwort wird dieselbe UUID erneut gesendet. Die Datenbank zählt sie höchstens einmal. Ein erfolgreiches Schreiben wird erst nach dem Nachladen aus der Warteschlange entfernt.

Sicher vom Server abgelehnte Anfragen bleiben unter **Einstellungen → Vorgemerkte Änderungen** mit Fehlermeldung erhalten. Nachfolgende Änderungen warten, damit die Reihenfolge erhalten bleibt. Den betroffenen Wert anhand des aktuellen Rundenbuchs prüfen, bei Bedarf das Logbuch exportieren, den abgelehnten Eintrag verwerfen und den gewünschten korrekten Rundengesamtwert neu eintragen. Netzwerkfehler mit unklarem Ausgang können nicht einfach verworfen werden.

Ein abgeschlossener oder zwischenzeitlich absolut korrigierter Rundenstand wird durch verspätete Offline-Klicks nicht stillschweigend verändert. Auch ein konkurrierender Rundenabschluss wird bei neu eingegangenen Truhen abgelehnt. Bitte vor einem gemeinsamen Abschluss kurz abgleichen, dass beide Geräte „Alles gespeichert“ anzeigen.

Browserspeicher nicht löschen und Privatmodus nicht schließen, solange Anfragen offen sind. Browserdatenlöschung, Geräteverlust oder Speicherentzug können rein lokal vorgemerkte Daten entfernen. Ein voller Speicher quittiert keine neuen Änderungen als gespeichert. Der JSON-Export sichert den aktuellen Snapshot und die offenen Anfragen; es gibt keinen automatischen Import. Im Cloud-Snapshot sind die letzten 200 Ledger-Änderungen enthalten; das vollständige Audit liegt in Supabase.

### Statistiken und RNG

- Startwerte zählen in den Gesamtfortschritt, aber nicht als heute geöffnete Truhen und nicht in aktuelle Farmgeschwindigkeiten.
- Tagesdiagramme zeigen **Nettoänderungen nach Erfassungsdatum in UTC**. Korrekturen einer alten Runde erscheinen am Tag der Korrektur; negative Tageswerte sind möglich.
- Das Dashboard zeigt Truhen/h der aktuellen Session, inkl. Zeit zwischen Runden. Statistik zeigt das auf eine Stunde hochgerechnete Tempo je abgeschlossener Runde.
- Gesamtspielzeit ist die Summe erfasster Rundendauern. Sessiondauer steht separat im Archiv. Manuelle Runden können rückwirkend eine Dauer haben; diese kann vor dem Zeitpunkt liegen, an dem ihr die Session im Tracker angelegt habt.
- Alle Dropchancen sind **hypothetisch**. Der Rechner verwendet `1 − (1 − p)^n` mit numerisch stabilen Logarithmusfunktionen, vergleicht Annahmen und berechnet Truhenzahlen für 10 %, 50 % und 90 %.
- Vergangene erfolglose Versuche erhöhen bei unabhängigen Drops nicht die Chance der nächsten Truhe. Es wird kein Pity-System angenommen.
- Meilenstein-Benachrichtigungen sind optional und melden sich nur, solange die Seite geöffnet ist. Keine Hintergrund-Push-Infrastruktur.

## Tests und Grenzen der bisherigen Prüfung

Ohne zusätzliche Bibliotheken, mit Node.js 22+:

```sh
node --test tests/core.test.mjs tests/store.test.mjs tests/account.test.mjs tests/shortcuts.test.mjs tests/battlepass.test.mjs tests/voice.test.mjs
```

SQL zusätzlich mit einer lokalen PostgreSQL-WASM-Engine (PGlite) testen:

```sh
npm install
npm run test:db
```

Alternativ `pnpm install` und `pnpm run test:db`. Die Testabhängigkeit wird nur lokal/bei der Entwicklung gebraucht.

Geprüft wurden:

- Einmalige Initialisierung und erneutes Ausführen des Schemas.
- 100 eingehende Additionen, eindeutige Kennungen und identische wiederholte Zustellung.
- Spielerzuordnung, fremder Account, anonymer Zugriff, RLS und gesperrte direkte Schreibzugriffe.
- Eingabevalidierung, Rückgängig genau einmal, Live-Zählung plus absolute Rundenzahl, negative Korrekturdifferenzen.
- Veraltete Revisionsnummern, verspätete Klicks, konkurrierende neue Klicks beim Rundenabschluss.
- Offline-Persistenz, Neustart der Datenzugriffsschicht, Verlust der Antwort nach bereits erfolgtem Commit, Fehler vor Serverempfang.
- 60 gleichzeitige Enqueues aus zwei simulierten lokalen Tabs, abgelehnte Einträge und Speicherausfall.
- RNG-Randfälle einschließlich 0/100 %, null Truhen und sehr kleinen Wahrscheinlichkeiten.
- Mobile Browserbedienung einschließlich Session, Live-Counter, absolutem Rundeneintrag und Neuladen.

Die lokale PostgreSQL-Engine führt Abfragen innerhalb einer Instanz nacheinander aus. Sie prüft echte SQL-Funktionen und Rechte, ersetzt aber **keinen Test mit zwei parallelen PostgreSQL-Verbindungen**. Das echte Supabase-Schema, die Startwerte, aktiviertes RLS, die Realtime-Publication und die Zuordnung beider bestätigter Spieleraccounts wurden geprüft; ein anonymer Snapshot-Abruf wird mit HTTP 401 / SQLSTATE 42501 abgelehnt. Auf der veröffentlichten Website wurde Max vom Nutzer angemeldet. Zwei Tabs desselben Browserprofils zeigten „Live verbunden“. Ein +1-Klick wurde in Supabase gespeichert, erschien ohne Neuladen im zweiten Tab und blieb nach Neuladen des ersten Tabs erhalten. Rückgängig wurde ebenfalls übertragen; Endstand Max 500 / Szymon 1.100 / Team 1.600, keine offenen Änderungen. Szymons eigener Login, langfristiger Token-Refresh und zwei physische Geräte sind noch nicht end-to-end geprüft. Im Redesign wurden alle fünf Bereiche bei 320, 390, 768, 1.024 und 1.440 Pixeln in einer lokalen Browser-Testansicht geprüft. Details stehen in TESTREPORT.md.

### Abnahmetest nach der Einrichtung

1. Zwei Geräte anmelden: Max und Szymon. Startwerte 500/1.100, Team 1.600 prüfen. Neu laden: unverändert.
2. Gleichzeitig je 20-mal +1 klicken. Erwartung: 520/1.120, Team 1.640. Beide Geräte müssen denselben Snapshot zeigen.
3. Max zweimal parallel anmelden und auf beiden Geräten +1 klicken. Jede Aktion muss genau einmal zählen.
4. Session und Runde starten. Max live +10, danach endgültig 15 speichern. Erwartung: nur weitere +5.
5. Max auf beiden Geräten denselben Korrekturdialog öffnen. Auf Gerät A speichern, dann auf Gerät B einen abweichenden veralteten Wert speichern. Gerät B muss einen sichtbaren Konflikt erhalten.
6. Während Max den Abschlussdialog offen hat, zählt Szymon noch +1. Veralteten Abschluss speichern: sichtbare Ablehnung; aktualisiert erneut abschließen.
7. Internet auf einem Gerät trennen, fünf +1-Klicks zählen, Seite bei noch vorhandenen Assets neu laden und wieder verbinden. Nach Übertragung genau +5, keine Doppelzählung. Für echte Offline-Neuladungen ohne HTTP-Cache gibt es keinen Service Worker; noch nicht übertragene Daten bleiben trotzdem gespeichert.
8. Realtime-Verbindung vorübergehend unterbrechen. Nach Wiederverbindung muss ein kompletter Snapshot nachgeladen werden; ersatzweise sichtbaren 30-Sekunden-Abruf prüfen.
9. Falsche Eingaben, Rückgängig, Korrektur auf 0, manuelle Runde ohne/mit Dauer, Smartphone im Hochformat und breites Desktopfenster testen.
10. Session schließen, beide Geräte schließen und erneut öffnen: Historie erhalten. Bei noch aktiver Session muss diese weiterlaufen.

## Sicherheitsmodell

RLS erlaubt ausschließlich den beiden zugeordneten Accounts das Lesen. `anon` erhält weder Tabellenrechte noch RPC-Ausführungsrechte. `authenticated` erhält keine direkten Insert-/Update-/Delete-Rechte. Die `SECURITY DEFINER`-RPCs haben einen leeren `search_path`, prüfen `auth.uid()` sowie die Spielerzuordnung und führen die Änderungen transaktional aus. Der öffentliche Browser-Key verleiht keinen Zugang ohne den passenden Auth-Account.

Ein öffentlicher JavaScript-Client schützt nicht vor einem bereits kompromittierten Spieleraccount oder vor Browsererweiterungen mit Zugriff auf das Profil. Accounts nur auf eigenen Geräten nutzen. Die Seite bindet keine frei eingebbaren HTML-Inhalte ein; Routen und Fehlermeldungen werden maskiert. Es sind keine Analyse- oder Werbeskripte eingebaut. Logo und Instrumente sind eigenständige SVGs, keine kopierten Fortnite-Assets. Inoffizielles Fan-Projekt, keine Verbindung zu Epic Games.

## Offizielle Referenzen

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime – Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase JavaScript Passwort-Login](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [GitHub Pages mit GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-github-actions-workflows-with-github-pages)

## Musik per Sprachbefehl

Unter `#voice` Mikrofon starten und „Israel“ oder „Netanyahu“ (auch „Netanjahu“) einzeln sagen: Hatikvah spielt, auch im Testmodus. „Musik stopp“, „Hymne stoppen“ oder der Stopp-Knopf beendet die Musik. Pause sperrt neue Starts, Musik-Stopp bleibt aktiv. Mikrofon-Stopp, Dialog, Accountwechsel und Verlassen der Seite stoppen die Musik ebenfalls. Wiederholte Starts überlagern oder unterbrechen die laufende Aufnahme nicht.

Der manuelle Knopf „Hymne abspielen“ funktioniert ohne Mikrofon und entsperrt bei Bedarf die Browser-Audiowiedergabe. Standardlautstärke 35 %, veränderbar bis stumm. Einmalige Audiofreischaltung beim Mikrofon-Start; kein automatischer Musik- oder Mikrofonstart beim Laden. Die Aufnahme wird bei Bedarf von Wikimedia geladen; Netzwerkfehler werden angezeigt. Quelle/Lizenz: `assets/AUDIO-CREDITS.md`. Keine Spielanbindung oder Zählmutation durch Musikbefehle.
