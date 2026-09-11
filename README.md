# DailyVYBZ Investment Chief

Chief führt eine Watchlist und ein Investmentsetup von der Beobachtung bis zur dokumentierten Entscheidung. Das System bewertet H4 Trend, H1 Bestätigung, Marktstruktur, Katalysator, Fundamentaldaten, Liquidität und Chance Risiko Verhältnis. Es berechnet die Positionsgröße und speichert Entscheidungen im lokalen Journal.

## Benutzeroberfläche

Die Anwendung besitzt vier Arbeitsbereiche:

* Dashboard mit Datenqualität, Prioritäten und nächsten Aktionen
* Watchlist mit Kursen, Triggerabstand und Status
* Setup Analyse mit Score, CRV und Positionsgröße
* Decision Journal mit Kennzahlen und gespeicherten Bewertungen

Auf Smartphones steht eine feste Navigation am unteren Bildschirmrand zur Verfügung.

## Start

```bash
npm start
```

Danach `http://localhost:4173` öffnen. Es gibt keine externen Laufzeitabhängigkeiten.

## Direkt auf Windows starten

Die Datei `dist/Investment-Chief.html` herunterladen und doppelt anklicken. Sie enthält die komplette Anwendung und benötigt keinen lokalen Server.

Nach Änderungen wird die portable Datei so neu erstellt:

```bash
npm run build:portable
```

## Test

```bash
npm test
```

## Aktueller Umfang

* Long und Short Setups
* Regelbasierter Score von 0 bis 100
* Pflichtprüfungen für Quelle, Datenstand, Stop, CRV und Invalidierung
* Positionsgröße aus Portfolio, Risiko und 20 Prozent Allokationsgrenze
* Drei Kursziele
* Transparente Punkteverteilung
* Lokales Decision Journal
* Responsive Oberfläche für Smartphone und Desktop
* Zentrale Watchlist mit acht bestätigten Märkten
* Historische Pläne werden klar gesperrt
* Status nach Triggernähe und Datenalter
* CSV und JSON Import mit Duplikatkontrolle
* JSON Export als Sicherung
* Direkte Übernahme eines Watchlistwerts in die Setup Bewertung

Die festgehaltenen Entscheidungen stehen in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Das Importformat steht in [docs/WATCHLIST_IMPORT.md](docs/WATCHLIST_IMPORT.md). Eine ausfüllbare Vorlage liegt unter [examples/watchlist-import.csv](examples/watchlist-import.csv).
