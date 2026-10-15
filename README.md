# CubeStats

Prosty, lokalny analizator eksportów CSV z timera kostki Rubika. Pokazuje aktualne tempo, postęp, rekordy i regularność bez wysyłania danych do sieci.

## Źródło danych

CubeStats analizuje pliki `.csv` eksportowane z aplikacji [Cube Timer](https://play.google.com/store/apps/details?id=br.com.mateusfiereck.cubetimer) autorstwa Mateusa Fierecka. Informacja i link służą wyłącznie wskazaniu obsługiwanego źródła danych.

CubeStats jest niezależnym, nieoficjalnym projektem. Nie jest powiązany z autorem Cube Timer ani przez niego sponsorowany lub zatwierdzony. Autor CubeStats nie otrzymuje wynagrodzenia ani innych korzyści za zamieszczenie tego odnośnika; link nie jest afiliacyjny.

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

Przycisk **Pełne dane CSV** pobiera dokładną kopię aktywnego importu, niezależnie od wybranej kategorii i zakresu dat. **Eksport podsumowania** tworzy natomiast przeliczone zestawienie statystyk dla aktualnego zakresu. Pełny eksport pozwala odtworzyć dane po wyczyszczeniu pamięci przeglądarki.

Nadal można również otworzyć `cube_stats.html` bezpośrednio, bez uruchamiania serwera.

## Testy

Wymagany jest Node.js 18 lub nowszy.

```sh
npm test
```

Testy obejmują pełną ścieżkę importu CSV, kary +2, DNF, chronologię, Ao5/Ao12/Ao50/Ao100, historię rekordów, regularność i średnią z dokładnie 20 ukończonych prób. Korzystają wyłącznie z anonimowych danych testowych; prywatne eksporty `cube_timer_csv_*.csv` są ignorowane przez Git. GitHub Actions uruchamia ten sam zestaw testów dla Node.js 20 i 22 po każdym pushu i w pull requestach do `main`.

## Konwencje statystyczne

- Ao5, Ao12, Ao50 i Ao100 odrzucają po 5% najlepszych i najgorszych prób, zaokrąglając liczbę odrzuceń w górę. Oznacza to odpowiednio 1, 1, 3 i 5 prób z każdej strony.
- DNF jest wynikiem najgorszym. Średnia może odrzucić tyle DNF, ile wynosi liczba odrzucanych najgorszych prób; kolejny DNF unieważnia średnią.
- Tylko Ao5 jest oficjalnym formatem WCA. Większe Ao są konwencją analityczną CubeStats.
- „Regularność N” to odchylenie standardowe ostatnich `N` ukończonych prób, maksymalnie 50. Niższa wartość oznacza bardziej stabilne czasy.

## Pliki

- `cube_stats.html` — struktura i wygląd interfejsu;
- `app.js` — interakcje, wykresy i lokalny zapis importów;
- `stats-core.js` — czysta, testowalna logika danych i statystyk;
- `server.js` — ograniczony do localhost serwer plików aplikacji;
- `test/stats-core.test.js` — automatyczne testy rdzenia.
