# CubeStats

Prosty, lokalny analizator eksportów CSV z timera kostki Rubika. Pokazuje aktualne tempo, postęp, rekordy i regularność bez wysyłania danych do sieci.

## Bezpieczne uruchomienie z terminala

W katalogu projektu uruchom:

```sh
npm start
```

Następnie otwórz adres `http://127.0.0.1:4173`. Serwer nasłuchuje wyłącznie na lokalnym interfejsie `127.0.0.1`, więc nie jest osiągalny z sieci lokalnej ani Internetu. Udostępnia wyłącznie trzy pliki aplikacji, odrzuca metody zapisujące i wysyła restrykcyjne nagłówki bezpieczeństwa. W szczególności plik z czasami, README, testy i pozostała zawartość katalogu nie są dostępne przez HTTP.

Opcjonalnie można zmienić port, nadal bez zmiany lokalnego adresu:

```sh
PORT=4174 npm start
```

Po otwarciu strony wybierz **Importuj CSV** albo przeciągnij plik na stronę. Dane są czytane przez przeglądarkę i nie są wysyłane do serwera. Ostatni import oraz jedna kopia zapasowa pozostają w pamięci lokalnej przeglądarki. Serwer zatrzymasz skrótem `Ctrl+C`.

Nadal można również otworzyć `cube_stats.html` bezpośrednio, bez uruchamiania serwera.

## Testy

Wymagany jest Node.js 18 lub nowszy.

```sh
npm test
```

Testy obejmują parser CSV, kary +2, DNF, chronologię, Ao5/Ao12, historię rekordów i średnią z dokładnie 20 ukończonych prób. Weryfikują także sumy kontrolne dołączonego eksportu.

## Pliki

- `cube_stats.html` — struktura i wygląd interfejsu;
- `app.js` — interakcje, wykresy i lokalny zapis importów;
- `stats-core.js` — czysta, testowalna logika danych i statystyk;
- `server.js` — ograniczony do localhost serwer plików aplikacji;
- `test/stats-core.test.js` — automatyczne testy rdzenia.
