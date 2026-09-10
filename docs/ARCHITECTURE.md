# Architekturentscheidungen

## Ziel des ersten Meilensteins

Ein Instrument durchläuft den vollständigen Prozess Eingabe, Bewertung, Risiko, Entscheidung, Begründung und Dokumentation. Das Ergebnis muss reproduzierbar und für den Nutzer prüfbar sein.

## Verbindliche Entscheidungen

1. Externe Plattformen liefern Daten. Chief trifft die Bewertung mit einem eigenen, versionierten Regelwerk.
2. Fehlende Quelle, fehlender Datenstand, ein ungültiger Stop, ein CRV unter 1,50 oder eine fehlende Invalidierung blockieren eine Handelsfreigabe.
3. Die Positionsgröße wird durch das Risikobudget und zugleich durch maximal 20 Prozent Portfolioallokation begrenzt.
4. H4 Trend und H1 Bestätigung erhalten im MVP zusammen 40 von 100 Punkten.
5. Jede gespeicherte Entscheidung enthält Eingaben, Ergebnis, Regelversion und Bewertungszeitpunkt.
6. Das MVP speichert lokal im Browser. Eine zentrale Datenbank folgt erst nach Validierung des Ablaufs.

## Module

`src/engine.js` enthält alle Berechnungen und keine Oberfläche. `src/app.js` liest Eingaben, rendert das Ergebnis und verwaltet das lokale Journal. Dadurch kann eine spätere Datenanbindung die Bewertungslogik weiterverwenden.

## Nächste Ausbaustufen

1. Ergebnis eines Trades mit Ausstieg, Gebühren und Regelabweichung erfassen.
2. Watchlist nach Score, Triggernähe und Datenalter sortieren.
3. Offene Positionen zu Gesamtportfoliorisiko und Korrelation verdichten.
4. Datenadapter für Kursdaten, Unternehmensdaten und Nachrichten ergänzen.
