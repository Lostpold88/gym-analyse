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
`FitNotesWorkouts.csv`, sie wird nicht angehängt. Vor dem Übernehmen prüfen:

```bash
python check_export.py
```

Meldet, ob der Export versehentlich zeitlich gefiltert war (dann fehlt Historie)
und ob neue Workout-Namen ohne Zuordnung unter „Sonstige" landen würden. Exit 1
heißt: nicht committen.

## Was die Seite zeigt

| Tab | Inhalt |
|---|---|
| **Übersicht** | Gesamtvolumen als Leitzahl, Kennzahlen-Kacheln, Wochenverlauf (Volumen / Sätze / Wdh. / Einheiten / Dauer umschaltbar), Volumen je einzelner Einheit, Trainingskalender als Heatmap, Verteilung auf Wochentage, Körpergewichtsverlauf |
| **Übungen** | Je Übung: bester Satz und geschätztes 1RM im Zeitverlauf, Aufwand je Einheit, Streudiagramm Gewicht × Wiederholungen (Farbe = Zeitpunkt), vollständiger Satzverlauf, sowie alle Übungen indexiert im Vergleich |
| **Muskelgruppen** | Sätze, Volumen oder Sätze pro Woche je Muskelgruppe, umschaltbar zwischen primärer und inklusive sekundärer Zählung, plus Wochenverlauf je Gruppe |
| **Intensität** | Verteilung über die Wiederholungsbereiche, deren Verschiebung im Wochenverlauf, Trainingsdauer je Einheit, Sätze je Übung und Einheit |
| **Rekorde** | Sortierbare Bestenliste je Übung inklusive 1RM-Trend |
| **Sessions** | Alle Einheiten mit Dauer und Volumen, aufklappbar bis auf Satzebene |

Global filterbar nach Zeitraum und Split. Hell-/Dunkelmodus.
Jedes Diagramm hat eine gleichwertige Tabellenansicht.

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
