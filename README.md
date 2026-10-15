# CubeStats

Prosty, lokalny analizator eksportów CSV z timera kostki Rubika. Pokazuje aktualne tempo, postęp, rekordy i regularność bez wysyłania danych do sieci.

## Uruchomienie

Otwórz `cube_stats.html` w przeglądarce i wybierz **Importuj CSV** albo przeciągnij plik na stronę. Aplikacja działa bez serwera i bez procesu budowania. Ostatni import oraz jedna kopia zapasowa są przechowywane w pamięci lokalnej przeglądarki.

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
- `test/stats-core.test.js` — automatyczne testy rdzenia.
