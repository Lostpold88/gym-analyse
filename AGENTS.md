# AGENTS.md

Hinweise für Coding-Agents, die an diesem Repo arbeiten.

## Die wichtigste Regel

**`gym-analyse.html` wird nie von Hand bearbeitet.** Sie ist ein Build-Artefakt.
Jede Änderung gehört in `dashboard_template.html`, danach:

```bash
python build_dashboard.py
```

Wer direkt in der generierten Datei editiert, verliert die Änderung beim
nächsten Build ersatzlos.

## Aufbau

| Datei | Rolle |
|---|---|
| `dashboard_template.html` | **Die gesamte Logik.** CSV-Parser, Aggregation, Diagramme, Interaktion, Styling. Enthält die Platzhalter `__CSV_DATA__` und `__BUILD_INFO__`. |
| `build_dashboard.py` | Ersetzt die beiden Platzhalter und schreibt die Ausgabe. Sonst nichts. Keine Fremdpakete, keine Auswertungslogik. |
| `FitNotesWorkouts.csv` | Rohexport aus FitNotes. Persönliche Gesundheitsdaten — nicht in öffentliche Kontexte kopieren. |
| `gym-analyse.html` | Generiert. |

Die Auswertung läuft **vollständig im Browser**, nicht in Python. Das ist
Absicht: derselbe Parser bedient die eingebettete CSV und eine per Drag & Drop
nachgeladene Datei. Wer Logik nach Python zieht, erzeugt zwei Codepfade, die
auseinanderlaufen.

## Harte Randbedingungen

- **Keine externen Abhängigkeiten.** Kein CDN, kein `fetch`, keine Chart-
  Bibliothek, keine Web-Fonts. Die Seite muss offline per Doppelklick laufen.
  Diagramme sind handgeschriebenes SVG.
- **Kein `innerHTML` mit Daten.** Übungs- und Splitnamen kommen aus der CSV und
  sind unvertrauenswürdig. Immer `textContent` / `createTextNode` (Helfer `el()`).
- **Kein Diagramm mit zwei Y-Achsen.** Zwei Größen unterschiedlicher Skala
  bekommen zwei Diagramme oder einen Kennzahlen-Umschalter.
- **Jedes Diagramm braucht eine Tabellenansicht.** Kein Wert darf allein über
  Farbe oder nur im Tooltip erreichbar sein.
- **Farben nicht nach Augenmaß wählen.** Die Palette ist gerechnet geprüft
  (siehe unten). Neue Farben nur nach einem bestandenen Validatorlauf.

## Datenfallstricke

Alles hier ist am echten Export aufgetreten, nicht theoretisch:

- **Deutsches Zahlenformat.** Gewichte stehen als `"27,5"` in Anführungszeichen.
  `num()` behandelt Komma als Dezimaltrennzeichen und `.` als Tausender, wenn
  beide vorkommen.
- **Kommas in Feldern.** Übungsnamen wie `"Rudermaschine (Brustgestützt, Eng)"`
  sind quotiert. Der Parser beherrscht RFC 4180 inkl. verdoppelter Quotes —
  kein `split(",")`.
- **Körpergewicht als Last.** Bei Klimmzügen trägt FitNotes das Körpergewicht
  ins Feld `Weight` ein (78–81,6 kg). Volumen und 1RM sind dadurch korrekt
  gerechnet, der „Fortschritt" spiegelt aber teils Gewichtsschwankungen. Steht
  als Fußnote auf der Seite — beim Umbau nicht wegkürzen.
- **Spalten können fehlen.** `BodyWeight`, `Categories`, `EndTime`, `RPE`, `RIR`
  sind optional. Pflicht sind nur `StartTime`, `Exercise`, `Reps`, `Weight`.
  `buildData()` prüft das und meldet fehlende Spalten, statt zu crashen.
- **`Status` kann `Failed` sein.** Solche Sätze zählen mit, werden aber in der
  Satzansicht markiert.
- **Einheiten-Schlüssel ist `StartTime` + `Name`**, nicht das Datum. An einem Tag
  können mehrere Einheiten liegen.
- **Programmzuordnung** steht in `const PROGRAMS` oben im Skriptteil. Unbekannte
  Workout-Namen fallen automatisch auf `"Sonstige"` — nie stillschweigend
  verwerfen.

## Prüfen vor dem Abschluss

1. **Zahlen gegenrechnen.** Kennzahlen unabhängig in Python nachrechnen und mit
   der Seite vergleichen, statt der eigenen JS-Aggregation zu vertrauen.
2. **Ansehen.** Der Validator prüft Farbe, nicht Layout. Seite rendern und auf
   kollidierende Achsenlabels, Überläufe und Geometrie prüfen — auch bei 375 px
   Breite. Ein Label-Kollisionsfehler auf Mobilbreite ist genau so entstanden.
3. **Konsole prüfen.** Muss fehlerfrei sein.
4. **Nachladepfad testen.** `loadCSV()` mit fehlenden Spalten, quotierten Kommas
   und einer kaputten Datei aufrufen — Letztere muss abgelehnt werden, ohne die
   geladenen Daten zu verlieren.

### Werkzeug-Eigenheit

Die Preview-Pane hält für `file://`-URLs einen **eingefrorenen Snapshot**:
Nach einem Rebuild zeigt `navigate` auf dieselbe URL weiterhin den alten Stand,
auch nach `location.reload()`. Für einen echten Frisch-Render unter neuem
Dateinamen bauen und den danach wieder löschen:

```bash
python build_dashboard.py FitNotesWorkouts.csv _render_check.html
```

`_render_check.html` steht in `.gitignore`.

### Farbpalette

Die Palette stammt aus dem `dataviz`-Skill und ist gerechnet geprüft:
Helligkeitsband, Chroma-Untergrenze, Farbfehlsichtigkeits-Abstand und Kontrast
gegen die Flächenfarbe — je für Hell und Dunkel. Der Validator liegt als
Python-Zwilling neben der JS-Fassung im Skill (`scripts/validate_palette.py`,
`node` ist auf diesem Rechner nicht installiert):

```bash
python validate_palette.py "#2a78d6,#eb6834,#1baf7a" --mode light --pairs all
```

Genutzt werden Slot 1 (blau) und 2 (orange) für Serien sowie eine blaue
Sequenzrampe für die Heatmap. Aqua ist definiert, aber ungenutzt — es liegt in
Hell unter 3:1 Kontrast und bräuchte dann sichtbare Direktlabels.

## Stil

- Oberflächentexte, Kommentare und Commit-Messages auf **Deutsch**.
- Bestehende Konventionen der Datei fortführen: `sv()` für SVG-Knoten, `el()`
  für HTML, `de()`/`fVol()`/`fKg()` für Formatierung, ein globales `state` mit
  einem `render()`.
- Kommentardichte am Bestand orientieren: knapp, und nur dort, wo das *Warum*
  nicht aus dem Code hervorgeht.
