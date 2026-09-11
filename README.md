# Gym Progress — FitNotes Analyse

**→ [Live ansehen](https://lostpold88.github.io/gym-analyse/)**

Interaktives Dashboard zur Auswertung von Trainingslogs aus der App FitNotes.
Aus einem CSV-Export entsteht eine **einzelne, eigenständige HTML-Datei**:
keine externen Abhängigkeiten, kein Server, kein CDN. Doppelklick genügt, sie
läuft auch offline.

Ausgewertet wird derzeit ausschließlich das Programm **PPL/UL** (Push, Pull,
Legs, Upper, Lower). Siehe [Auswertung auf ein Programm beschränken](#auswertung-auf-ein-programm-beschränken).

## Nutzung

```bash
python build_dashboard.py
```

Baut `index.html` aus `FitNotesWorkouts.csv`. Andere Dateien:

```bash
python build_dashboard.py mein_export.csv            # andere Quelle
python build_dashboard.py export.csv ausgabe.html    # anderes Ziel
```

Ein neuer Export lässt sich auch **direkt im Browser per Drag & Drop** auf die
geöffnete Seite ziehen — dafür ist kein erneuter Build nötig. Es ist derselbe
Parser-Pfad, die Seite wertet die Datei lokal aus; nichts wird hochgeladen.

### Neuen Export übernehmen

FitNotes exportiert stets die vollständige Historie; die neue Datei *ersetzt*
`FitNotesWorkouts.csv`, sie wird nicht angehängt.

**Option A — Direkt am Smartphone / Web:**
1. In FitNotes den CSV-Export erstellen.
2. Im Browser auf GitHub das Repo öffnen.
3. `FitNotesWorkouts.csv` hochladen und committen (`Add file` → `Upload files`).
4. Eine GitHub Action führt `check_export.py` und `build_dashboard.py` automatisch im Hintergrund aus und aktualisiert GitHub Pages.

**Option B — Lokal per Skript:**
Vor dem Committen prüfen:

```bash
python check_export.py
python build_dashboard.py
```

## Was die Seite zeigt

| Tab | Inhalt |
|---|---|
| **Übersicht** | Kraftentwicklung je Übung mit Status, Suche und direktem Sprung zur Übung; danach Trainingsmenge, Wochenverlauf, Volumen je Einheit, Trainingskalender, Wochentage und Körpergewicht |
| **Übungen** | Kraftvergleich nach Einheiten oder frei wählbarem Zeitraum mit nachvollziehbaren Ausgangswerten; bester Satz und geschätztes 1RM im Zeitverlauf, Aufwand, Wiederholungsvergleich je Gewicht, Satzverlauf und kompakte Krafttrends aller Übungen |
| **Muskelgruppen** | Sätze, Volumen oder Sätze pro Woche je Muskelgruppe, umschaltbar zwischen primärer und inklusive sekundärer Zählung, plus Wochenverlauf je Gruppe |
| **Intensität** | Verteilung über die Wiederholungsbereiche, deren Verschiebung im Wochenverlauf, Trainingsdauer je Einheit, Sätze je Übung und Einheit |
| **Rekorde** | Sortierbare Bestenliste je Übung inklusive 1RM-Trend |
| **Sessions** | Alle Einheiten mit Dauer und Volumen, aufklappbar bis auf Satzebene |

Global filterbar nach Zeitraum und Split. Hell-/Dunkelmodus.
Jedes Diagramm hat eine gleichwertige Tabellenansicht.

## Vergleiche und mobile Nutzung

- **Trainingsmenge:** Einheiten, Sätze, Volumen und Volumen je Einheit werden
  zwischen dem Anfang und Ende der gewählten Auswahl verglichen. Dafür werden
  gleich viele Tage am Anfang und Ende verwendet. Bei einer ungeraden Tageszahl
  bleibt der mittlere Tag für diesen Vergleich außen vor; das steht an der Karte.
  Auch hier fließen ausschließlich Daten innerhalb des gewählten Zeitraums ein.
- **Kraftentwicklung:** „Zuletzt“ vergleicht die letzten drei mit den
  unmittelbar vorherigen drei geeigneten Einheiten. „Seit Beginn“ vergleicht
  die letzten drei mit den ersten drei im gewählten Zeitraum. Die Fenster
  überschneiden sich nicht. Bei weniger Historie werden jeweils ein oder zwei
  Einheiten verglichen; ab zwei getrennten Einheiten ist eine erste Tendenz möglich. Pro
  Einheit zählt der höchste geschätzte 1RM-Wert aus erfolgreichen Sätzen mit
  1–10 Wiederholungen. Je Fenster wird der Median der vorhandenen Werte verwendet.
  Übersicht, Übungsansicht, Mini-Verläufe und Rekordtabelle verwenden dieselbe
  Auswahl. Die Ausgangswerte sind in der Übungsansicht einsehbar.
- **Eigener Kraftvergleich:** „Letzte X Wochen“ erlaubt 1–104 ganze Wochen,
  gerechnet bis zum letzten Training im Export. „Eigener Zeitraum“ erlaubt
  Start- und Enddatum einschließlich beider Tage. Beide Modi vergleichen
  die ersten mit den letzten geeigneten Einheiten **innerhalb dieser Auswahl**:
  „Letzte 6 Wochen“ zeigt die Entwicklung vom Anfang zum Ende dieser sechs Wochen.
  Je Gruppe werden bis zu drei Einheiten genutzt; bei weniger Historie je eine
  oder zwei. Die Gruppen überschneiden sich nicht. Ihr Median liefert Anfangs-
  und Endwert; bei zwei Werten zählt deren Durchschnitt. Es werden keine
  früheren Vergleichs- oder Ersatzdaten herangezogen. Die Datumsauswahl gilt
  für alle Ansichten; ungültige Eingaben ändern die letzte gültige Auswahl nicht.
- **Wenig Daten:** Ab zwei getrennten geeigneten Einheiten in der Auswahl
  ist eine „Erste Tendenz“ möglich. Mit nur einer Einheit gibt es noch keine
  Entwicklung; die Anzeige benennt das ausdrücklich. Ab drei Einheiten je
  Gruppe ist der Vergleich über mehrere Einheiten gestützt.
- **Einordnung:** Über +2,5 % wird „Verbessert“, unter −2,5 % „Zurückgegangen“
  angezeigt; dazwischen „Etwa gleich“. Das ist eine Orientierung für die
  Anzeige, keine statistische Signifikanzschwelle. Körpergewichtsübungen,
  fehlende geeignete Einheiten auf einer Vergleichsseite oder mehr als 28 Tage ohne geeigneten
  Satz vor dem Ende des gewählten Zeitraums bleiben „Noch offen“. Der letzte
  Punkt bezieht sich auf das Zeitraumende im Export, nicht auf heute.
  Körpergewichtsübungen werden über den Übungsnamen (Klimmzüge, Pull-ups,
  Chin-ups, Dips) oder die Equipment-Angabe erkannt; individuelle Namen
  können eine manuelle Einordnung erfordern.
- **Darstellung:** Blaue Balken nach rechts zeigen Zuwachs, orange Balken nach
  links Rückgang. Prozentwerte und Status stehen immer auch als Text dabei.
  Statusfilter, Suche und eine vollständige Tabelle helfen beim Vergleichen.
  Trainingsmenge wird separat ausgewiesen: Weniger Volumen bedeutet nicht
  automatisch weniger Kraft.
- **iPhone:** Einklappbare Filter, feste Navigation unten, Rücksicht auf
  Safe Areas, große Touch-Ziele und eine Übungsauswahl über der unteren
  Navigation. Einheiten erscheinen als aufklappbare Karten. CSV-Import über
  „CSV laden“ und die Dateien-App; kein Upload.
- **Fehlerhafte Exporte:** Fehlende Pflichtspalten, kaputte Quotes, falsche
  Spaltenzahlen sowie ungültige Datums- oder Zahlenwerte werden abgelehnt.
  Die bisher geladenen Daten bleiben dabei erhalten.

## Browserprüfung

Die ausgelieferte Seite benötigt weiterhin keine externen Abhängigkeiten.
Für Entwicklungstests kann Playwright separat im ignorierten `.qa`-Ordner
installiert werden. Python rechnet Referenzwerte unabhängig aus dem CSV-Export;
der Browsertest gleicht sie mit der JavaScript-Auswertung ab und prüft beide
Browser-Engines bei 1440 und 375 Pixeln, Hell-/Dunkelmodus, Filter, Imports,
Tastaturnavigation und Übungstrends. Die Gegenrechnung umfasst alle vier
Vergleichsmodi, ihre Quell-Einheiten und die Statuszuordnung. Weitere
Fälle prüfen Ausreißer, gegenläufige Kurz-/Langzeitentwicklung, zu wenig
Daten sowie Körpergewichtsübungen und veraltete Vergleiche. Der Zeitraumtest
prüft außerdem Datumseingaben, Wochenzahlen, gerade Median-Gruppen, exakte
Datumsgrenzen, unvollständige Historie und den gemeinsamen Filterzustand.

```powershell
python build_dashboard.py
python tests/reference_metrics.py
npm install --prefix .qa playwright
$env:NODE_PATH = "$PWD/.qa/node_modules"
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.qa/browsers"
node .qa/node_modules/playwright/cli.js install chromium webkit
node tests/browser_check.cjs
node tests/period_check.cjs
```

Screenshots und Referenzwerte bleiben unter `.qa/` und werden nicht committet.
WebKit mit mobiler Emulation ersetzt keinen abschließenden Test auf einem
physischen iPhone, insbesondere für Dateien-App und Homescreen-Modus.

## Auswertung auf ein Programm beschränken

FitNotes kennt nur Workout-Namen. Die Vorlage fasst sie zu Programmen zusammen
und wertet standardmäßig nur eines davon aus:

```js
const ONLY_PROGRAM = "PPL/UL";   // null = alle Programme auswerten
```

Einheiten anderer Programme werden gar nicht erst geladen; wie viele das sind
und aus welchen Splits, steht in der Fußzeile der Seite — es verschwindet also
nichts stillschweigend. Die Zuordnung der Namen steht direkt darüber in
`PROGRAMS`.

## Trainingsprogramme anpassen

FitNotes kennt nur Workout-Namen. Die Zuordnung dieser Namen zu einem
übergeordneten Programm steht als Konfigurationsblock oben im Skriptteil von
`dashboard_template.html`:

```js
const PROGRAMS = [
  { name: "PPL/UL",      splits: ["Push", "Pull", "Legs", "Upper", "Lower"] },
  { name: "Torso/Limbs", splits: ["Torso 1", "Torso 2", "Limbs 1", "Limbs 2"] },
];
```

Die Reihenfolge in `splits` bestimmt auch die Reihenfolge der Filter-Chips.
Neue Namen hier ergänzen, dann neu bauen. Alles Unbekannte landet automatisch
unter „Sonstige" — es geht nie ein Datensatz verloren.

`EXCLUDED_EXERCISES` enthält die drei vom Besitzer abgelösten Übungen:
Hammer Curls (KH), JM-Press (Multipresse) und Beinpresse (Sitzend). Ihre Sätze
werden vor jeder Aggregation herausgefiltert, auch bei nachgeladenen CSV-Dateien.
Dadurch tauchen sie weder in Übungen, Rekorden und Einheiten noch in Kennzahlen
oder Muskelgruppen auf. Die Zahl ausgeschlossener Sätze steht in der Fußzeile;
die CSV bleibt als vollständiger Rohexport erhalten.

## Berechnungen

- **Volumen** = Gewicht × Wiederholungen, summiert über alle Sätze.
- **Geschätztes 1RM** nach Epley: `Gewicht × (1 + Wdh. ÷ 30)`. Bei hohen
  Wiederholungszahlen zunehmend ungenau, im Bereich 1–10 Wdh. gut brauchbar.
- **Muskelgruppen**: „nur primär" zählt jeden Satz einmal für die in FitNotes
  erstgenannte Gruppe, „inkl. sekundär" für jede beteiligte. Die zweite
  Zählweise summiert sich daher auf mehr als die Satzzahl.
- **Körpergewichtsübungen**: FitNotes trägt bei z. B. Klimmzügen das
  Körpergewicht als Last ein. Fortschritt dort spiegelt teils
  Gewichtsschwankungen statt Kraftzuwachs.

## Dateien

| Datei | Rolle |
|---|---|
| `dashboard_template.html` | Vorlage mit sämtlicher Logik: CSV-Parser, Aggregation, Diagramme (handgeschriebenes SVG, keine Bibliothek). Hier wird entwickelt. |
| `build_dashboard.py` | Bettet den CSV-Export in die Vorlage ein und schreibt die fertige Seite. Ohne Fremdpakete. |
| `check_export.py` | Prüft einen neuen Export gegen den committeten Stand, bevor er übernommen wird. |
| `FitNotesWorkouts.csv` | Der Rohexport aus FitNotes. |
| `index.html` | Generiert. Das ist die Datei, die man öffnet — und die GitHub Pages ausliefert. |

## Barrierefreiheit & Darstellung

Die Farbpalette ist rechnerisch geprüft, nicht nach Augenmaß: Helligkeitsband,
Chroma-Untergrenze, Farbfehlsichtigkeits-Abstand (Protanopie/Deuteranopie nach
Machado u. a. 2009) und Kontrast gegen die jeweilige Flächenfarbe — je einmal
für Hell und Dunkel sowie für die Sequenzrampe der Heatmap. Diagramme sind per
Tastatur bedienbar (Pfeiltasten am Fadenkreuz), und zu jedem Diagramm gibt es
eine Tabellenansicht, sodass kein Wert allein über Farbe transportiert wird.
