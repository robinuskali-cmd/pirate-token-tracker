# Hatikvah

Instrumental performance by the **United States Navy Band** (1974).
Arrangement: Samuel Cohen (1870–1940).

Source and license documentation: https://commons.wikimedia.org/wiki/File:Hatikvah_instrumental.ogg

Wikimedia Commons identifies the composition and recording as public domain
(Public Domain Mark 1.0; recording is a U.S. federal government work).
The unmodified Ogg recording is loaded from Wikimedia only when playback is requested.
The request omits credentials and the referring page URL. No microphone audio is sent to Wikimedia.

# Jarvis

Die selbst geschriebenen Jarvis-Texte wurden vorab mit Microsofts neuronaler Stimme Leni (`de-CH-LeniNeural`, Schweizer Hochdeutsch, Tempo -5 %, unveränderte Tonhöhe) über `edge-tts` erzeugt und mit FFmpeg in MP3 umgewandelt. `jarvis-voice.bin` enthält 288 vollständige MP3-Abschnitte; `js/voice-recordings.js` beschreibt deren Bytebereiche. `jarvis-test.mp3` ist eine separate Testaufnahme derselben Stimme.

Zur Laufzeit werden die Aufnahmen vom eigenen GitHub-Pages-Hosting geladen. Es wird keine Browserstimme oder externe TTS-/KI-API aufgerufen; weder Mikrofonaufnahmen noch Gesprächsinhalte werden zur Spracherzeugung übertragen.

Werkzeug: https://github.com/rany2/edge-tts
