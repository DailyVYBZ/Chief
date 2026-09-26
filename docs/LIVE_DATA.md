# Chief Live Datenmodell

## Grundsatz

Die exakten Trigger des Marktplans wurden auf XTB Kursen festgelegt. Öffentliche Marktprovider können davon abweichen. Chief behandelt externe Live Kurse deshalb standardmäßig als Vergleichsdaten und überschreibt den XTB Referenzkurs nicht automatisch.

## Modi

### Live Vergleich

Standardmodus.

* Provider Kurse werden alle 60 Sekunden geladen.
* Chief zeigt Provider, Kurs und Drift zum gespeicherten XTB Referenzkurs.
* Triggerstatus und gespeicherter XTB Referenzkurs bleiben unverändert.
* Das Command Center kann die Provider Kurse für eine zusätzliche Näherungsanalyse verwenden.

### Live Referenz

Optionaler Modus.

* Vor der Aktivierung speichert Chief den aktuellen XTB Kursstand als manuellen Anker.
* Vor jedem automatischen Kursupdate entsteht zusätzlich ein Kurs Snapshot.
* Provider Kurse werden als aktive Referenzkurse in die Watchlist geschrieben.
* Beim Ausschalten stellt Chief den manuellen Anker wieder her.
* Die Trigger, Stops, Ziele, Invalidierungen und Szenariowechsel werden nie durch den Provider verändert.

## Provider

### Yahoo Finance

Wird für alle zehn Märkte als allgemeiner Referenz Provider verwendet.

Symbolmapping:

* SILVER zu `SI=F`
* GOLD zu `GC=F`
* DE40 zu `^GDAXI`
* US100 zu `^NDX`
* US500 zu `^GSPC`
* OIL zu `BZ=F`
* SOLANA zu `SOL-USD`
* BITCOIN zu `BTC-USD`
* ETHEREUM zu `ETH-USD`
* EURUSD zu `EURUSD=X`

### CoinGecko

Dient als Fallback für Bitcoin, Ethereum und Solana. Optional kann `COINGECKO_DEMO_API_KEY` gesetzt werden.

### XTB Kurse

XTB hat die öffentliche xAPI am 14.03.2025 abgeschaltet ([XTB Mitteilung](https://www.xtb.com/int/company-news?cur=109&p_p_col_count=1&p_p_col_id=column-2&p_p_id=101_INSTANCE_bvR2&p_p_lifecycle=0&p_p_mode=view&p_p_state=normal&p_r_p_564233524_resetCur=false&page=72)). Chief ruft deshalb keine inoffiziellen xStation Endpunkte ab. In der Watchlist kann eine selbst erstellte CSV mit `symbol;instrument;bid;ask;quotedAt` importiert werden. Instrumentkennung und Zeitpunkt müssen aus dem passenden XTB Instrument stammen. Der Import ändert ausschließlich Kurs, Ask, Zeitstempel und Kursquelle; er bestätigt keinen Alarm automatisch. CSV mit deutschem Dezimalformat verwendet Semikolon.

## API

`GET /api/health`

Liefert Version, Modus, unterstützte Symbole und Cache Zeit.

`GET /api/quotes`

Liefert alle zehn Märkte.

`GET /api/quotes?symbols=BITCOIN,ETHEREUM`

Liefert nur die angeforderten unterstützten Symbole.

Jeder Kurs enthält mindestens Symbol, Provider Symbol, Preis, Zeitstempel, Quelle und die Kennzeichnung `authoritative: false`.

## Schutzmechanismen

* Serverseitiger Timeout
* Kurzer Cache gegen unnötige Provider Abrufe
* Teilabdeckung wird explizit gemeldet
* Ein fehlerhafter Provider überschreibt keine Triggerlogik
* Externe Kurse verändern keine Planparameter
* Workspace Backup enthält Watchlist, Journal, Positionen, Risikoeinstellungen, Alarmzustände, Alarmhistorie, Makro Ereignisse, Live Kurse und Snapshots. Es ist ein Export. Der versionierte Geräteabgleich ist separat unter `docs/SYNC.md` beschrieben.
* Portable Datei schaltet den automatischen Live Referenzmodus ab
* Kurse ohne echten Provider Zeitstempel und Kurse älter als 24 Stunden werden verworfen; Zeitstempel aus der Zukunft über fünf Minuten ebenso
* Teilweise fehlgeschlagene Abrufe behalten den letzten gespeicherten Wert, kennzeichnen ihn nach Ablauf der Frist aber nicht als frisch
* Der Server bindet standardmäßig nur an `127.0.0.1`. Für einen bewusst freigegebenen Host sind `CHIEF_HOST`, `CHIEF_SYNC_TOKEN` und ein vertrauenswürdiges TLS Zertifikat erforderlich; siehe `docs/SYNC.md`
* Der HTTP Server liefert ausschließlich die benötigten Oberflächendateien aus. Repository Daten, Konfiguration und Servercode bleiben unerreichbar

Die Provider sind über `server/quote-service.mjs` registriert. Jeder Adapter bietet `name`, `supports(symbol)` und `fetch(symbol)` und liefert das normalisierte Kursmodell. Ein weiterer Adapter lässt sich in der Serverregistrierung ergänzen. Bei einem Fehler versucht Chief den nächsten Adapter für dieses Symbol.

## Nächster Schritt

Für vollständig exakte automatische Signale braucht Chief eine autoritative Kursquelle, die mit den verwendeten XTB Instrumenten übereinstimmt. Sobald eine solche Quelle verfügbar ist, kann sie hinter derselben Provider Schnittstelle ergänzt werden.
