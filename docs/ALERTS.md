# Chief Alarmzustände

Issue 4 ergänzt 19 Richtungstrigger und neun eigenständige Krypto Nachkauflevel. Die Zustände pro eindeutiger Kombination aus Symbol, Typ, Richtung, Planversion und Level sind `aktiv`, `Level erreicht` und `Schluss bestätigt`. Der Übergang zum erreichten Level erfordert einen aktuellen manuell gepflegten Watchlist Kurs. Gleiche Werte erzeugen kein zweites Ereignis. Planänderungen mit neuem Level oder Version erzeugen einen neuen Schlüssel.

Eine Bestätigung ist nur für Long und Short möglich. Sie benötigt den im Plan angegebenen H1 oder H4 Schluss, einen Schlusszeitpunkt nach dem ersten Levelkontakt und einen Schlusskurs jenseits des Triggers. Nachkauflevel bleiben ein eigener manueller Prüfpunkt. Historische Ereignisse enthalten Zeit, Kurs und Quelle und können jetzt einer gespeicherten Journalentscheidung zugeordnet werden. Aktueller Speicherort sind die Browser Schlüssel `chief-alert-states-v1` und `chief-alert-history-v1`; der lokale Chief Server gleicht sie nach Aktivierung des Geräteabgleichs versioniert ab.

Yahoo Finanzdaten für Index und Rohstoff Stellvertreter sowie CoinGecko Kryptokurse stimmen nicht zwingend mit XTB CFD Kursen überein. Die automatische Referenzkurs Übernahme löst darum keinen exakten Alarm aus. Für echte automatische Alarme ist ein autoritativer, instrumentgleicher Provider nötig. Ein manueller Schlusskurs wird vom Nutzer bestätigt und ist keine automatische Kerzendaten Prüfung.

Auch der separate manuelle XTB CSV Import löst keinen Alarm aus, weil Chief die Herkunft und korrekte Instrumentkennung der Datei nicht automatisch beweisen kann. Ein anschließend manuell gesetzter Watchlist Kurs kann ein Level als erreicht markieren; die H1/H4 Bestätigung bleibt eine eigene Handlung.

Der tatsächliche Kerzenschlusszeitpunkt muss eingegeben werden. Zukünftige Schlüsse sowie Schlüsse älter als 24 Stunden werden abgewiesen. Die Alarmhistorie mit gespeicherten Journalzuordnungen und die HTML Maskierung werden durch einen Rendering Regressionstest geprüft; dieser ersetzt keinen Browser E2E Test.
