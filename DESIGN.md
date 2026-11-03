# Pirate Token Tracker · Interface 1.1

## Ausgangslage

Das alte Layout schob die persönlichen Counter unter eine große illustrierte Teamübersicht und vier Statistik-Karten. Gleichartige runde Container, großzügige Abstände und eine dauerhafte Sidebar machten den Tracker einem allgemeinen Dashboard ähnlich. Für den häufigsten Vorgang – eine Truhe zählen – war auf dem Smartphone zu viel Scrollen nötig.

## Konzept: nautisches Crew-Bedienpult

Die neue Oberfläche kombiniert die Präzision eines nautischen Instruments mit der Direktheit eines Arcade-Bedienfelds. Jede Markierung hat eine Funktion: Spielerkennungen trennen die Zählwerke, eine kalibrierte Kursleiste zeigt den nächsten Meilenstein und ein radialer Sekundenzeiger markiert eine aktive Session. Keine Totenköpfe, Holzoberflächen, Glasflächen oder dekorativen Münzen.

| Rolle | Farbe |
| --- | --- |
| Grundfläche | Marineblau `#101b22` |
| Zählwerk / Masthead | Dunkelblau `#0b141a` |
| Bedienpult | `#15232c` |
| Schrift | Warmes Off-White `#eee9dd` |
| Instrumente | Mattes Messing `#bca77b` |
| Aktive Bedienung | Signalorange `#ef8857` |
| Sekundäre Crew-Linie | Stahl `#93acb0` |
| Fehlermeldungen | `#f1a49a` |

Es gibt genau zwei Schriftfamilien: **Barlow Condensed** für Überschriften, Ziffern und Instrumentenanzeigen; **DM Sans** für Erläuterungen, Formulare und Navigation. Systemschriften ersetzen die optional geladenen Webfonts bei einem Netzwerkausfall. Zahlen nutzen tabellarische Ziffern.

## Vier wiedererkennbare Komponenten

1. **Mechanisches Zählwerk:** geteilte Ziffern, zurückgenommene führende Nullen, Spielerkürzel, klar getrennte Anzeige- und Tastenfläche. Orange kennzeichnet die eigene +1-Taste. +5 und +10 bleiben direkt daneben erreichbar. Die Gegenkarte ist eindeutig als nur lesbar markiert.
2. **Kalibrierte Kursleiste:** Skalenteilung, Positionsnadel und Zielwert ersetzen den gewöhnlichen Fortschrittsbalken. Sie zeigt denselben Teamfortschritt wie bisher.
3. **Session-Chronometer:** radialer Sekundenzeiger, digitale Laufzeit und separate Rundenzeit. Ein aktiver Zustand wird durch Farbe und Beschriftung erkennbar; Uhrzeiten basieren weiterhin auf den gespeicherten Zeitstempeln.
4. **Crew-Kursvergleich:** zwei vermessene Bahnen mit Flaggen vergleichen Max und Szymon. Zahlen und Prozentwerte stehen direkt am zugehörigen Spieler.

## Informationsarchitektur

- **Live:** Team-Bestand, persönliche Zählwerke, aktive Session und kompakter Kursverlauf.
- **Logbuch:** Session-Steuerung, Rundenhistorie, Bearbeitung und Session-Archiv. Auf Mobilgeräten werden Tabellen zu beschrifteten, durch Linien getrennten Einträgen.
- **Statistik:** Crew-Vergleich, Tagesdiagramm, Rekordliste, Geschwindigkeit und Meilensteine.
- **RNG-Labor:** Eingabeparameter und berechnetes Ergebnis als zwei Instrumentenbereiche. Die hypothetische Natur der Dropchance bleibt sichtbar.
- **Einstellungen:** Zugang, Demo-Spieler, Meldungen, Export, Einrichtung, Übertragungspuffer und Tastaturbelegung.

Auf Desktop gibt es eine horizontale Navigation statt einer Sidebar. Auf Smartphones sitzt eine feste Fünf-Wege-Navigation am unteren Rand. Das eigene Zählwerk erscheint zuerst, die +1-Fläche ist mindestens 64 Pixel hoch. Der Live-Kopf ist bewusst verkürzt, damit diese Taste auch in der geprüften schmalen Ansicht ohne Scrollen erreichbar bleibt.

## Feedback und Zustände

- Ein Zählereignis löst einen kurzen Impuls der Anzeige, einen Ziffernschritt und eine vorübergehende Differenzanzeige aus. Eine bestätigte Übertragung wiederholt diesen Impuls nicht, wenn sich der sichtbare Gesamtwert nicht erneut ändert.
- Speichern, vorgemerkte Daten, Live-Verbindung und lokale Demo sind getrennt beschriftet. Fehlermeldungen erhalten eine eigene, gut erkennbare Darstellung.
- Formularaktionen zeigen einen Ladeindikator und `aria-busy`; die Taste ist währenddessen gesperrt.
- Fokus bleibt nach einem Counter-Update erhalten. Während eines gedrückten Zeigers wird ein Realtime-bedingter Neuaufbau der Oberfläche kurz zurückgestellt, damit kein Button zwischen Drücken und Loslassen verschwindet.
- Bereichswechsel nutzen einen kurzen Übergang. Realtime-Neuzeichnungen lösen diesen nicht jedes Mal erneut aus.
- `prefers-reduced-motion` schaltet Bewegungsanimationen und den laufenden Sekundenzeiger ab; Zahlen, Status und Differenzanzeigen bleiben verständlich.

## Erhalt der Funktionalität

`js/views.js` enthält die neue Darstellung. Die Event-Handler für Counter, Undo, Rundeneinträge, Sessions, Export und Zugang bleiben an dieselben Aktionen angebunden. **`js/store.js`, `js/core.js`, `js/config.js` und `supabase/schema.sql` wurden nicht verändert.** Ihre SHA-256-Prüfsummen wurden vor und nach dem Redesign verglichen.

Die 27 vorhandenen automatisierten Tests wurden erneut erfolgreich ausgeführt. Die Prüfung der neuen Oberfläche und ihre Grenzen sind in `TESTREPORT.md` dokumentiert.
