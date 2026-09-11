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
7. Chief führt eine eigene Watchlist als verlässlichen Arbeitsbestand. Provider liefern Rohdaten und dürfen bestehende Einträge nur über Symbol und Richtung aktualisieren.
8. Historische Zonen erzeugen kein aktives Signal. Der Nutzer muss sie mit aktuellen Daten erneut bewerten.
9. Automatische Provider Zugriffe gehören nicht in den Browser. Eine spätere Live Anbindung benötigt einen geschützten Server Adapter.

## Module

`src/engine.js` enthält alle Berechnungen und keine Oberfläche. `src/app.js` liest Eingaben, rendert das Ergebnis und verwaltet das lokale Journal. Dadurch kann eine spätere Datenanbindung die Bewertungslogik weiterverwenden.

Die Benutzeroberfläche ist als Arbeitsoberfläche mit vier Ansichten aufgebaut. Dashboard, Watchlist, Setup Analyse und Journal teilen sich denselben lokalen Zustand. Die Navigation wechselt die Ansichten ohne Seitenneuladung. Auf kleinen Bildschirmen ersetzt eine feste untere Navigation die Seitenleiste.

## Nächste Ausbaustufen

1. Ergebnis eines Trades mit Ausstieg, Gebühren und Regelabweichung erfassen.
2. Geschützten Provider Adapter für aktuelle Kurse und Nachrichten ergänzen.
3. Offene Positionen zu Gesamtportfoliorisiko und Korrelation verdichten.
4. Watchlistwerte nach aktuellem Chief Score priorisieren.
