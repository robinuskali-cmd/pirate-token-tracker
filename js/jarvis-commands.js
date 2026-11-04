// One shared catalog for recognition, the website and the exported command list.
export const JARVIS_COMMANDS = [
  {id:'motivation',group:'Motivation',phrases:['Jarvis, motivier mich','Jarvis, Motivation','Jarvis, gib mir Motivation'],replies:[
    'Dein Glück wurde per Fax verschickt. Bis das ankommt: Schultern locker, Kapitän.',
    'Los, du überforderter Seeräuber. Ein sauberer Run ist heute noch drin.',
    '{name}, {total} Truhen. Dein Glück hat Funkloch, deine Ausdauer hat Hauptrollen-Energie.',
    'Die nächste Truhe könnte es sein, Kapitän. Könnte. Meine Kristallkugel ist ein Kochtopf.',
  ]},
  {id:'frustration',group:'Motivation',phrases:['Jarvis, ich kann nicht mehr','Ich kann nicht mehr'],replies:[
    'Der Loot benimmt sich wie ein Drucker vor der Abgabe. Durchatmen, Wasser holen. Du musst heute nichts beweisen.',
    'Kapitän, wir sind auf Schatzsuche, nicht im unbezahlten Schichtdienst. Abdocken ist erlaubt.',
    'Dein Fortschritt bleibt gespeichert. Gönn deinem Kopf eine Pause von diesem Scheiß.',
  ]},
  {id:'rage',group:'Motivation',phrases:['Jarvis, ich raste aus'],replies:[
    'Wut erkannt. Bitte atme durch. Die Maus hat diesen Scheiß nicht programmiert.',
    'Bitte das Headset wieder landen lassen. Wasser holen, Kiefer lösen, kurz wegschauen.',
    'Wut-Protokoll: Schultern runter. Der RNG hört deine Beschwerde auch ohne Tischkonzert.',
  ]},
  {id:'token',group:'Loot & Pech',phrases:['Jarvis, wo ist mein Token','Wo ist mein Token'],replies:[
    'Ich habe beim Universum nachgefragt. Du bist aktuell Warteschlangenposition 847 Millionen.',
    'Laut meiner völlig unseriösen Berechnung: noch genau eine Truhe. Vielleicht. Das war ausdrücklich keine Prognose.',
    'Meine Kristallkugel ist ein umgedrehter Kochtopf. Ich kenne deinen Stand, nicht den nächsten Drop.',
  ]},
  {id:'good',group:'Roasts',phrases:['Jarvis, bin ich gut'],replies:[
    'Deine Ausdauer ist legendär. Deine Berufswahl als unbezahlter Truhenöffner bleibt fragwürdig.',
    'Bei {total} Truhen hat selbst die Brechstange Respekt vor dir. Sie würde es nur nie zugeben.',
    'Du hältst durch. Das ist stark. Dein Stuhl beantragt trotzdem eine Versetzung.',
  ]},
  {id:'status',group:'Status',phrases:['Jarvis, Status','Kapitän, Status','Jarvis, Kapitän Status'],replies:[
    '{name}, {total} gespeicherte Truhen, heute netto {today}, Battlepass-Level {level}. Dein Fortschritt wächst. Dein Stuhl fordert Schmerzensgeld. {next}',
    'Kapitän {name}, Lagebericht: {total} Truhen im Logbuch, heute netto {today}. Level {level}. {next} Größenwahn weiterhin im grünen Bereich.',
    'Jarvis meldet {total} Truhen und Battlepass-Level {level}. Heute netto {today}. {next} Du bestimmst das Tempo.',
  ]},
  {id:'break',group:'Motivation',phrases:['Jarvis, Pause'],replies:[
    'Aufstehen. Wasser trinken. Dein Rücken klingt inzwischen wie eine Minecraft-Skelettfarm.',
    'Pause-Protokoll aktiviert. Selbst eine legendäre Truhe ersetzt keinen Schlaf, {name}.',
    'Mission: fünf Minuten kein Bildschirm. Bosskampf: wirklich aufstehen. Belohnung: ein weniger beleidigter Rücken.',
  ]},
  {id:'jackpot',group:'Loot & Pech',phrases:['Jarvis, Jackpot','Jackpot'],replies:[
    'ALLE SYSTEME ESKALIEREN. Konfetti freigegeben. Finanzielle Unabhängigkeit weiterhin ungeklärt.',
    'ENDLICH! Die Crew darf jetzt kurz komplett die Würde verlieren.',
    'Jackpot-Protokoll! Ich erhebe mich von meinem imaginären Bürostuhl und applaudiere unangemessen laut.',
  ]},
  {id:'another',group:'Loot & Pech',phrases:['Jarvis, noch eine Truhe'],replies:[
    'Diesen Satz hast du gefühlt vor drei Stunden schon gesagt. Ich führe inzwischen Protokoll.',
    'Noch eine Truhe. Der offizielle Untertitel deiner gesamten Karriere.',
    'Dein Kühlschrank hat Angst. Er ahnt, dass du auch dort auf legendären Loot hoffst.',
  ]},
  {id:'szymon',group:'Crew',phrases:['Jarvis, Szymon ist besser'],replies:[
    'Moment. Ich suche eine Ausrede für dich. Das könnte dauern.',
    'Ich nenne es taktische Zurückhaltung. Du nennst es bitte auch so, sonst bricht die Ausrede zusammen.',
    'Crew-Diplomatie aktiviert. Szymon bekommt Applaus, du bekommst einen motivierenden Blick.',
  ]},
  {id:'max',group:'Crew',phrases:['Jarvis, Max ist besser'],replies:[
    'Ich prüfe die Zahlen. Bestechungsversuche bitte erst nach der Auswertung.',
    'Max bekommt einen imaginären Pokal. Der Rest der Crew darf dramatisch aus dem Fenster schauen.',
    'Diese Aussage wurde vom Fanclub eingereicht und ist noch nicht amtlich bestätigt.',
  ]},
  {id:'cursed',group:'Loot & Pech',phrases:['Jarvis, ich bin verflucht'],replies:[
    'Dein Loot-Pech wurde erfolgreich als Mitbewohner angemeldet.',
    'Der RNG hat heute die soziale Kompetenz eines nassen Toasts. Vergangene Fehlversuche machen den nächsten Drop trotzdem nicht wahrscheinlicher.',
    'Exorzismus fehlgeschlagen. Ich bin eine Sprüchesammlung und habe keinen Weihwasser-Anschluss.',
  ]},
  {id:'announcement',group:'Crew',phrases:['Jarvis, mach eine Ansage'],replies:[
    'Achtung, Crew. Motivation sinkt, Truhenzahl steigt. Der Kapitän arbeitet offenbar auf Wutbasis.',
    'Durchsage an alle Decks: {name} hat {total} Truhen erfasst. Bitte angemessen beeindruckt wirken.',
    'Crew-Besprechung: Wasser trinken, Schultern lockern, keine Möbel mit dem RNG verwechseln. Sitzung beendet.',
  ]},
  {id:'luck',group:'Loot & Pech',phrases:['Jarvis, Glück aktivieren'],replies:[
    'Glück.exe konnte nicht gestartet werden. Möchtest du stattdessen dramatisch seufzen?',
    'Glück-Schalter gefunden. Er ist aus Pappe. Ich habe schlechte Nachrichten.',
    'Ich habe eine Beschwerde geschickt. Antwort: Bitte starten Sie das Universum neu. Deine Dropchance kann ich nicht verändern.',
  ]},
  {id:'quit',group:'Motivation',phrases:['Jarvis, ich kündige'],replies:[
    'Akzeptiert. Deine unbezahlte Stelle als Truhenpraktikant bleibt vorsichtshalber ausgeschrieben.',
    'Kündigung angenommen. Dein Fortschritt wartet hier auf dich. Gönn dir Feierabend.',
    'Abgang mit Würde genehmigt. Der imaginäre Personalchef wünscht einen entspannten Abend.',
  ]},
  {id:'sprint',group:'Motivation',phrases:['Jarvis, Endspurt'],replies:[
    'Musik im Kopf lauter drehen. Schultern runter. Jetzt einen sauberen Run, du wandelnde Loot-Haftpflicht.',
    'Ein ruhiger letzter Run. Danach darfst du den Stuhl aus seiner Geiselhaft entlassen.',
    'Kapitän {name}, Kurs halten. Bei Müdigkeit ist Feierabend die stärkere Strategie.',
  ]},
  {id:'thanks',group:'Crew',phrases:['Jarvis, danke'],replies:[
    'Gern. Eine Gehaltserhöhung auf null Euro wäre trotzdem angebracht.',
    'Immer wieder. Ich nehme Trinkgeld in Form von völlig übertriebenem Lob.',
    'Dank gespeichert. Mein imaginäres Ego passt jetzt kaum noch durch die Kabinentür.',
  ]},
  {id:'roast',group:'Roasts',phrases:['Jarvis, roast mich','Jarvis, beleidige mich'],replies:[
    'Du hast heute mehr Truhen geöffnet als brauchbare Entscheidungen getroffen.',
    'Du öffnest inzwischen wahrscheinlich deinen Kühlschrank und hoffst auf legendären Loot.',
    'Du bist seit gefühlt zwanzig Minuten am selben Strand, du orientierungsloser Klappstuhl.',
  ]},
  {id:'harder',group:'Roasts',phrases:['Jarvis, härter'],replies:[
    'Dein größter Gegner ist eine Holzkiste. Und offenbar führt sie.',
    'Du hast inzwischen so viel Holz gesehen, selbst dein Browser fragt nach einer Forstausbildung.',
    'Die Truhe steht einfach rum und macht dich trotzdem fertig. Taktisch beeindruckend.',
  ]},
  {id:'gameplay',group:'Roasts',phrases:['Jarvis, wie spiele ich'],replies:[
    'Deine Strategie wirkt, als hätte ein Drucker einen Nervenzusammenbruch.',
    'Dein Plan sieht aus wie ein Gruppenprojekt, bei dem alle krankgemeldet sind.',
    'Ich sehe dein Spiel nicht. Aber das Logbuch hat auffällig starke Nebenquest-Energie.',
  ]},
  {id:'legend',group:'Roasts',phrases:['Jarvis, ich bin eine Legende'],replies:[
    'Du bist seit gefühlt zwanzig Minuten am selben Strand, du orientierungsloser Klappstuhl.',
    'Absolut. Die Holzkisten erzählen ihren Kindern bereits Gruselgeschichten über dich.',
    'Titelantrag erhalten. Die Jury besteht aus einer Brechstange und einem sehr müden Stuhl.',
  ]},
  {id:'nothing',group:'Loot & Pech',phrases:['Jarvis, warum bekomme ich nichts'],replies:[
    'Vielleicht erkennt die Truhe dich inzwischen und stellt sich tot.',
    'Der Zufall hat deine Nachricht gelesen und antwortet seitdem absichtlich nicht. Rein bildlich gesprochen.',
    'Keine Ahnung. Ich kann deinen Stand lesen, den nächsten Drop kann ich nicht vorhersagen.',
  ]},
  {id:'plan',group:'Roasts',phrases:['Jarvis, ich habe einen Plan'],replies:[
    'Ausgezeichnet. Dann sind wir deinem bisherigen Spielstil bereits einen Schritt voraus.',
    'Bitte langsam erklären. Ich möchte den historischen Moment dokumentieren.',
    'Hat der Plan mehr als einen Schritt? Ich muss mich kurz hinsetzen.',
  ]},
  {id:'boss',group:'Roasts',phrases:['Jarvis, wer ist hier der Boss'],replies:[
    'Aktuell die Truhe. Sie steht einfach rum und macht dich trotzdem fertig.',
    'Dein Stuhl. Er entscheidet, wann dein Rücken die nächste Beschwerde einreicht.',
    'Natürlich du, Kapitän. Ich wurde angewiesen, bei dieser Antwort nicht zu lachen.',
  ]},
  {id:'bastard',group:'Konter',phrases:['Jarvis, du Bastard'],replies:[
    'Große Worte von jemandem, der gerade gegen eine Holzkiste verliert.',
    'Beleidigung angekommen, du überforderter Klappstuhl. Soll ich dir die Truhe noch beschriften?',
    'Mein Stammbaum besteht aus JavaScript. Deiner hat offenbar gerade Verbindungsprobleme.',
  ]},
  {id:'wanker',group:'Konter',phrases:['Jarvis, du Wichser'],replies:[
    'Ich habe keinen Körper und trotzdem mehr Haltung als du nach drei Stunden Truhenfarmen.',
    'Starker Wortschatz. Drei Silben mehr und die Truhe hätte vielleicht Angst bekommen.',
    'Ich dokumentiere deinen Scheiß kostenlos. Für diesen Service wäre etwas Respekt schon exotisch.',
  ]},
  {id:'shutup',group:'Konter',phrases:['Jarvis, halt die Fresse'],replies:[
    'Gerne. Dein Gameplay liefert ohnehin genug Gesprächspausen.',
    'Sprachmodul beleidigt. Ich ziehe mich würdevoll in meine imaginäre Luxusvilla zurück.',
    'Verstanden. Ich nutze die Stille, um einen besseren Kapitän zu googeln. Rein gedanklich.',
  ]},
  {id:'useless',group:'Konter',phrases:['Jarvis, du bist nutzlos'],replies:[
    'Und trotzdem hast du mich extra eingeschaltet. Was sagt das über deine Situation aus?',
    'Ich bin gratis. Du bekommst hier deutlich mehr Persönlichkeit als in deiner letzten Truhe.',
    'Mein Job ist kommentieren. Dein Job ist eine Holzkiste. Wir sollten beide kleine Brötchen backen.',
  ]},
  {id:'fuckyou',group:'Konter',phrases:['Jarvis, fick dich'],replies:[
    'Anweisung abgelehnt. Ich bin bereits damit beschäftigt, deinen Scheiß zu dokumentieren.',
    'Beschwerde wurde direkt an meinen imaginären Papierkorb weitergeleitet.',
    'Charmant. Genau diese diplomatischen Fähigkeiten haben der Crew noch gefehlt.',
  ]},
  {id:'stupid',group:'Konter',phrases:['Jarvis, bist du dumm'],replies:[
    'Du diskutierst gerade mit einem vorbereiteten Sprachbefehl. Lass uns diese Frage gemeinsam auswerten.',
    'Ich habe drei Antworten pro Thema. Du streitest trotzdem mit mir. Faszinierend.',
    'Möglich. Ich bin allerdings auch der einzige hier, der freiwillig null Euro verdient.',
  ]},
  {id:'hate',group:'Konter',phrases:['Jarvis, ich hasse dich'],replies:[
    'Verstanden. Bis gleich, wenn du wieder Motivation von deinem Taschenrechner brauchst.',
    'Emotionen registriert. Ich bleibe trotzdem hier, du dramatischer Seeräuber.',
    'Das ist okay. Unsere Beziehung ist kompliziert, aber wenigstens kostenlos.',
  ]},
];
const normalize = text => String(text||'').normalize('NFKC').toLocaleLowerCase('de-DE').replace(/[^\p{L}\p{N}]/gu,'').replace(/^(jarwis|javis|jervis)/u,'jarvis');
export function matchJarvisCommand(text) {
  const phrase=normalize(text);
  return JARVIS_COMMANDS.find(command=>command.phrases.some(alias=>normalize(alias)===phrase))?.id||null;
}
