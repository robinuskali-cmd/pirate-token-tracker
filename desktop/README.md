# Pirate Token · Windows-Hotkeys

Optionaler portabler Begleiter zum privaten Max/Szymon-Tracker. Läuft mit Windows 10/11 und .NET Framework 4.8. Keine Installation und keine Administratorrechte nötig.

## Benutzen

1. `downloads/Pirate-Token-Hotkeys.exe` starten.
2. Tracker-E-Mail und Tracker-Passwort direkt im Helfer eingeben. Das Passwort nicht an den Agenten senden.
3. Optional Tastenfelder anklicken und neue Hotkeys drücken. F1–F11 oder Strg/Alt mit Buchstabe/Ziffer; F12 und reine Buchstabentasten sind ausgeschlossen. Standard: F8 +1, F9 Undo, F10 Pause/Fortsetzen.
4. **Hotkeys aktivieren**, dann das Fenster minimieren. Es bleibt im Windows-Infobereich erreichbar. Der Browser muss nicht geöffnet sein.
5. Im Spiel den gewählten +1-Hotkey drücken. Ein Ton signalisiert die bestätigte Speicherung. Töne lassen sich ausschalten. Gedrückthalten erzeugt durch `MOD_NOREPEAT` keine weiteren Zählungen.
6. F10 pausiert/reaktiviert die Zähl-Hotkeys. **Hotkeys deaktivieren** oder Beenden gibt alle registrierten Tasten frei. Hotkeys gelten systemweit, auch außerhalb des Spiels.

Eine aktive Tracker-Session benötigt vorher eine aktive Runde. Der Helfer startet oder beendet keine Sessions/Runden. Rückgängig verwendet nach einem frischen Serverabruf den letzten geeigneten eigenen Live-Klick. Offene Anfragen müssen vorher übertragen sein. Es gelten dieselben Regeln wie auf der Website.

Die Native-API wurde unter Windows geprüft. Ein echter Tastendruck im laufenden Fortnite wurde nicht geprüft. Das Programm enthält keinen Spiel-Hook, liest keine Spielprozesse und sendet keine Eingaben an das Spiel. Es beansprucht keine Freigabe durch Epic/Anti-Cheat. Es ist ein unsignierter eigener Build; Quellcode und Prüfsumme sind mitgeliefert.

## Daten und Konflikte

- HTTPS-Anmeldung ausschließlich am konfigurierten Supabase-Projekt mit dem öffentlichen Publishable Key. Kein Service-Role-Key.
- Passwort, Access Token und Refresh Token werden nicht auf Platte gespeichert. Nach jedem Programmstart neu anmelden. Refresh erfolgt während der Laufzeit. Ein abgelaufener/anderer Auth-Account kann nicht still die Rolle übernehmen. Abmelden verwendet `scope=local`, damit andere Tracker-Sitzungen erhalten bleiben.
- Vor jeder Übertragung wird die Anfrage mit UUID unter `%LOCALAPPDATA%\PirateTokenTrackerHotkeys\<auth-id>.queue.json` atomar gespeichert. Hotkey-Einstellungen liegen getrennt in `hotkeys.json`. Nur eine Helferinstanz pro Windows-Sitzung.
- Verlorene Antwort oder fehlgeschlagener Snapshot: dieselbe UUID bleibt erhalten und wird erneut gesendet. Entfernung aus dem Puffer erst nach erfolgreichem Nachladen; die Supabase-Idempotenz verhindert Doppelzählung. Die Website zeigt diese Änderungen über ihre bestehende Synchronisierung an.
- Offline nach erfolgreicher Anmeldung können weitere +1-Klicks anhand des zuletzt geladenen Rundenzustands vorgemerkt werden. Erst nach Übertragung sind sie im Cloud-Stand und Battlepass. Zum Starten/erneuten Anmelden ist eine Verbindung nötig.
- Sicher abgelehnte Anfragen blockieren Folgeeingaben. **Konflikt archivieren** zeigt eine Rückfrage und sichert die Anfrage zuerst in `<auth-id>.queue.json.rejected.jsonl`, bevor sie aus dem Puffer genommen wird. Unklare Netzwerkfehler lassen sich darüber nicht verwerfen. Rundenkorrekturen im Tracker prüfen. Browser und Helfer haben getrennte lokale Puffer.
- Beim Schließen mit offenen Eingaben erscheint eine Rückfrage. Die Datei bleibt erhalten; nach Anmeldung mit demselben Account werden offene Eingaben erneut übertragen. Die App-Daten nicht löschen, solange etwas offen ist.

## Bauen und prüfen

Mit dem in Windows/.NET Framework enthaltenen C#-Compiler:

```powershell
./desktop/build.ps1
$testReport = Join-Path $env:TEMP 'pirate-token-hotkeys-tests.txt'
$helperTest = Start-Process -FilePath ./downloads/Pirate-Token-Hotkeys.exe -ArgumentList @('--self-test', ('"' + $testReport + '"')) -WindowStyle Hidden -PassThru -Wait
Get-Content -LiteralPath $testReport
if ($helperTest.ExitCode -ne 0) { throw 'Selbsttests fehlgeschlagen.' }
```

16 Selbsttests verwenden ausschließlich simulierte Auth-/RPC-Antworten. Sie prüfen unter anderem den echten `RegisterHotKey`-Aufruf und Freigabe, eine selbst gepostete `WM_HOTKEY`-Nachricht, Benutzerzuordnung, Rundenregeln, Queue-Neustart, Speicherfehler, verlorene Antwort nach Commit, fehlgeschlagenen Snapshot, abgelehnte Mutation, Token-Erneuerung, Benutzerwechsel und lokale Abmeldung. Dabei werden keine physischen Tastendrücke simuliert und keine echten Supabase-Daten verändert.

`--render-preview <png-pfad>` rendert das eigene Anmeldefenster ohne Anmeldung, Hotkey-Aktivierung oder sichtbare Arbeitsfenster. `windows-helper.yml` baut und prüft die Anwendung zusätzlich auf einem Windows-Runner. Ein erfolgreicher Selbsttest ersetzt keinen Hardware-/Fortnite-Test.

Native API: [Microsoft RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey). Auth-Protokoll: [Supabase Auth](https://github.com/supabase/auth). Die RPC-Verträge stammen aus dem mitgelieferten `supabase/schema.sql`.
