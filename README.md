# DailyVYBZ Investment Chief

Chief führt eine Watchlist und ein Investmentsetup von der Beobachtung bis zur dokumentierten Entscheidung. Das System bewertet H4 Trend, H1 Bestätigung, Marktstruktur, Katalysator, Fundamentaldaten, Liquidität und Chance Risiko Verhältnis. Es berechnet die Positionsgröße und speichert Entscheidungen im lokalen Journal.

## Start

```bash
npm start
```

Danach `http://localhost:4173` öffnen. Es gibt keine externen Laufzeitabhängigkeiten.

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
