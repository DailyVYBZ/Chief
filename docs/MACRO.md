# Makro Kontext Kern

`src/macro.js` hält Ereignisse mit Typ, Primärquelle, geplantem Zeitpunkt, Veröffentlichungszeit, Abrufzeit, Marktrelevanz und Ereignisrisiko. Unterstützt werden CPI, Fed, EZB, Arbeitsmarkt, Öl und Krypto. Ein veröffentlichtes Ereignis setzt einen betroffenen Plan auf `review_required`. Trigger, Einstieg, Stop, Ziele, Invalidierung und Szenariowechsel bleiben identisch. Der Journal Kontext kann als eigenständiger Snapshot zum Bewertungszeitpunkt gespeichert werden.

Das ist die fachliche Vorbereitung für Issue 7. Es gibt noch keinen automatischen Nachrichtenimport, keine Anbindung an die Watchlist Oberfläche und keine technische Einstiegssperre. Die manuelle Fed Dokumentation in Notion belegt keine automatische Funktion in Chief. Nach Integration müssen Quelle, Kurs vor und nach dem Ereignis, H1/H4 Prüfung und Sperrverhalten mit einem echten Testfall nachgewiesen werden.
