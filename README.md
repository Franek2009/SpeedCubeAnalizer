# SpeedCubeAnalyzer

Prosty analizator eksportów CSV z timera kostki Rubika. Pokazuje aktualne tempo, postęp, rekordy i regularność. Działa bez konta użytkownika, a obliczenia wykonuje lokalnie w przeglądarce.

## Live Demo

**[Uruchom SpeedCubeAnalyzer w przeglądarce](https://franek2009.github.io/SpeedCubeAnalyzer/)** — bez instalowania, klonowania repozytorium i wpisywania komend.

Po otwarciu strony:

1. W aplikacji Cube Timer użyj funkcji eksportu danych i zapisz pełną historię jako plik `.csv`.
2. W SpeedCubeAnalyzer wybierz **Importuj CSV** i wskaż zapisany plik albo przeciągnij go na stronę.
3. Statystyki zostaną przeliczone automatycznie.

Przycisk **Pełne dane CSV** pobiera dokładną kopię aktywnego importu. **Eksport podsumowania** tworzy przeliczone zestawienie dla wybranej kategorii i zakresu dat.

## Prywatność danych

- Zawartość CSV jest odczytywana i analizowana przez kod działający w przeglądarce. Aplikacja nie wysyła jej na serwer.
- Ostatni import oraz jedna kopia zapasowa są przechowywane w `localStorage` przeglądarki, osobno dla adresu Live Demo.
- Wyczyszczenie danych witryny usuwa lokalną kopię. Warto okresowo pobierać **Pełne dane CSV**.
- SpeedCubeAnalyzer nie zawiera kont użytkowników, reklam, narzędzi analitycznych ani zewnętrznych skryptów.
- Live Demo jest udostępniane przez GitHub Pages. GitHub może przetwarzać dane techniczne związane z wejściem na stronę, takie jak adres IP, zgodnie ze swoją [polityką prywatności](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Obsługiwane źródło danych

SpeedCubeAnalyzer analizuje pliki `.csv` eksportowane z aplikacji [Cube Timer](https://play.google.com/store/apps/details?id=br.com.mateusfiereck.cubetimer) autorstwa Mateusa Fierecka. Informacja i link służą wyłącznie wskazaniu obsługiwanego formatu danych.

SpeedCubeAnalyzer jest niezależnym, nieoficjalnym projektem. Nie jest powiązany z autorem Cube Timer ani przez niego sponsorowany lub zatwierdzony. Autor SpeedCubeAnalyzer nie otrzymuje wynagrodzenia ani innych korzyści za zamieszczenie tego odnośnika; link nie jest afiliacyjny.

## Możliwości

- statystyki dla wszystkich kategorii znajdujących się w eksporcie;
- PB oraz bieżące i najlepsze Ao5, Ao12, Ao50 i Ao100;
- średnia z ostatnich 20 ukończonych ułożeń i regularność do 50 prób;
- historia rekordów, sesji i pojedynczych ułożeń;
- wykres prób oraz agregacja tygodniowa i miesięczna;
- filtrowanie według zakresu dat i porównanie kategorii;
- obsługa kar `+2`, DNF i częściowo uszkodzonych plików CSV;
- lokalna kopia ostatniego importu i możliwość przywrócenia poprzedniego zbioru;
- eksport pełnego CSV oraz podsumowania aktualnego widoku.

Presety **Ostatnie 30 dni danych** i **Miesiąc ostatniego ułożenia** są liczone względem najnowszej próby w aktywnym eksporcie, a nie względem daty systemowej. Dzięki temu działają również dla archiwalnych zestawów.

## Opcjonalne uruchomienie lokalne

Wariant lokalny jest przeznaczony głównie do pracy offline i rozwijania projektu. Wymaga Node.js 22 lub nowszego. Po sklonowaniu repozytorium uruchom:

```sh
npm start
```

Następnie otwórz `http://127.0.0.1:4173`. Serwer nasłuchuje wyłącznie na `127.0.0.1`, więc nie jest osiągalny z sieci lokalnej ani Internetu. Udostępnia tylko trzy pliki aplikacji, akceptuje wyłącznie żądania `GET` i `HEAD` oraz wysyła restrykcyjne nagłówki bezpieczeństwa.

Port można zmienić bez zmiany lokalnego adresu:

```sh
PORT=4174 npm start
```

Serwer zatrzymasz skrótem `Ctrl+C`. Plik `cube_stats.html` można również otworzyć bezpośrednio bez uruchamiania serwera.

## Testy i publikacja

Po sklonowaniu repozytorium zainstaluj zależności:

```sh
npm ci
```

Uruchomienie testów rdzenia, serwera i budowy pakietu:

```sh
npm test
```

Testy interfejsu w Chromium:

```sh
npx playwright install chromium
npm run test:ui
```

Wszystkie testy można uruchomić przez `npm run test:all`. Obejmują między innymi import CSV, kary `+2`, DNF, chronologię, średnie, historię rekordów, zapis lokalny, presety dat, eksport oraz zawartość publicznego pakietu.

GitHub Actions uruchamia testy jednostkowe dla Node.js 22 i 24 oraz testy UI w Chromium po każdym pushu i w pull requestach do `main`. Po pushu do `main` Live Demo jest publikowane tylko wtedy, gdy wszystkie testy przejdą pomyślnie. Publiczny pakiet zawiera wyłącznie `index.html`, `app.js` i `stats-core.js`; testowy CSV, README i pliki deweloperskie nie są publikowane w witrynie.

## Konwencje statystyczne

- Ao5, Ao12, Ao50 i Ao100 odrzucają po 5% najlepszych i najgorszych prób, zaokrąglając liczbę odrzuceń w górę. Oznacza to odpowiednio 1, 1, 3 i 5 prób z każdej strony.
- DNF jest wynikiem najgorszym. Średnia może odrzucić tyle DNF, ile wynosi liczba odrzucanych najgorszych prób; kolejny DNF unieważnia średnią.
- Spośród średnich prezentowanych przez aplikację tylko Ao5 odpowiada formatowi używanemu w oficjalnych konkurencjach WCA. Większe Ao są konwencją analityczną SpeedCubeAnalyzer.
- „Regularność N” to odchylenie standardowe ostatnich `N` ukończonych prób, maksymalnie 50. Niższa wartość oznacza bardziej stabilne czasy.

SpeedCubeAnalyzer jest narzędziem treningowym, a nie oficjalnym systemem wyników World Cube Association.

## Najważniejsze pliki

- `cube_stats.html` — struktura i wygląd interfejsu;
- `app.js` — interakcje, wykresy i lokalny zapis importów;
- `stats-core.js` — logika parsowania i statystyk;
- `server.js` — serwer lokalny ograniczony do localhost;
- `scripts/build-pages.js` — minimalny artefakt Live Demo;
- `test/` i `e2e/` — testy automatyczne.

## Autor i licencja

Autor: [Franek2009](https://github.com/Franek2009)

Projekt jest udostępniany na licencji [MIT](LICENSE).
