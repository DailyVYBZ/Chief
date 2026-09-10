# DailyVYBZ Investment Chief

Chief führt ein Investmentsetup von der Eingabe bis zur dokumentierten Entscheidung. Das erste MVP bewertet H4 Trend, H1 Bestätigung, Marktstruktur, Katalysator, Fundamentaldaten, Liquidität und Chance Risiko Verhältnis. Es berechnet die Positionsgröße und speichert Entscheidungen im lokalen Journal.

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

Die festgehaltenen Entscheidungen stehen in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
