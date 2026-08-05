---
name: gym-analyse
description: Wertet FitNotes-Trainingslogs aus und beantwortet Fragen zu Trainingsfortschritt, Volumen, Satzzahlen pro Muskelgruppe, Bestleistungen und Körpergewichtsverlauf. Nutzen, wenn nach Gym-/Trainingsfortschritt gefragt wird, ein FitNotes-CSV-Export im Spiel ist, das Dashboard neu gebaut werden soll, oder Fragen wie "wie viele Sätze Rücken pro Woche", "stagniert meine Bank", "wie hat sich mein Volumen entwickelt" aufkommen.
---

# FitNotes-Trainingsdaten auswerten

Datenquelle ist ein FitNotes-CSV-Export (`FitNotesWorkouts.csv`): eine Zeile je
**Satz**, mit Datum, Workout-Name, Übung, Wiederholungen, Gewicht, Körpergewicht
und Muskelgruppen.

## Welchen Weg wählen

**Explorative Frage** („wie viele Sätze Bizeps pro Woche?", „stagniert Übung X?")
→ direkt mit einem kurzen Python-Skript über die CSV rechnen. Schneller und
präziser als das Dashboard zu durchsuchen.

**Überblick / laufende Nutzung** → das Dashboard bauen und öffnen:

```bash
python build_dashboard.py
```

Erzeugt `gym-analyse.html`, eine eigenständige Seite ohne Abhängigkeiten. Ein
neuer Export lässt sich auch per Drag & Drop auf die geöffnete Seite ziehen.

**Änderung am Dashboard** → siehe `AGENTS.md`. Kurz: nie die generierte
`gym-analyse.html` editieren, sondern `dashboard_template.html`.

## CSV korrekt einlesen

Vier Fallen, die stillschweigend falsche Ergebnisse liefern:

```python
import csv
rows = list(csv.DictReader(open("FitNotesWorkouts.csv", encoding="utf-8-sig")))

def num(s):                          # "27,5" -> 27.5, deutsches Format
    s = (s or "").strip().replace(",", ".")
    return float(s) if s else 0.0
```

1. **`utf-8-sig`** — der aktuelle Export hat zwar kein BOM, andere FitNotes-
   Exporte können eins haben. `utf-8-sig` entfernt es, falls vorhanden, und ist
   sonst wirkungslos; ohne es hieße die erste Spalte dann `﻿Name` statt `Name`.
2. **Komma als Dezimaltrennzeichen** — `float("27,5")` wirft einen Fehler.
3. **`csv`-Modul benutzen**, kein `split(",")`: Übungsnamen wie
   `"Rudermaschine (Brustgestützt, Eng)"` enthalten quotierte Kommas.
4. **Einheit = `StartTime` + `Name`**, nicht das Datum — an einem Tag können
   mehrere Einheiten liegen.

## Kennzahlen

| Größe | Rechnung |
|---|---|
| Volumen | `Gewicht × Wiederholungen`, über Sätze summiert |
| Geschätztes 1RM | Epley: `Gewicht × (1 + Wdh. ÷ 30)` |
| Bester Satz einer Einheit | höchstes Gewicht (bei Gleichstand mehr Wdh.) |
| Sätze je Muskelgruppe | siehe Zählweise unten |

## Vier Vorbehalte, die in jede Antwort gehören, wenn sie greifen

- **Sekundärmuskeln verzerren Satzzahlen.** `Categories` listet alle beteiligten
  Gruppen, die erste ist die primäre. Wer jeden Satz für jede Gruppe zählt,
  bekommt Unsinn: Trapez landet bei 211 Sätzen, obwohl das fast nur Mitläufer
  aus Seitenheben und Klimmzügen sind — primär gezählt sind es 0. **Standard ist
  primär**; die andere Zählweise nur nennen, wenn sie explizit gefragt ist, und
  dann als solche kennzeichnen.
- **Körpergewichtsübungen.** Bei Klimmzügen steht das Körpergewicht im Feld
  `Weight`. Ein „Fortschritt" dort kann reine Gewichtsschwankung sein. Nie als
  Kraftzuwachs verkaufen.
- **Epley wird bei hohen Wiederholungen ungenau.** Im Bereich 1–10 Wdh. gut
  brauchbar, darüber mit Vorbehalt nennen.
- **Kurze Zeiträume tragen wenig.** Ein Programm mit zwei Einheiten erlaubt
  keine Trendaussage. Fallzahl mitnennen, statt einen Trend zu behaupten.

## Programme vs. Splits

FitNotes kennt nur Workout-Namen. Die Zuordnung zu einem übergeordneten Programm
steht in `const PROGRAMS` in `dashboard_template.html` und muss bei Vergleichen
mitgedacht werden — Programme lösen einander in der Regel zeitlich ab, ein
direkter Vergleich ist deshalb selten ein fairer Vergleich.

Unbekannte Workout-Namen fallen auf `"Sonstige"`. Ad-hoc-Einheiten dort nicht
stillschweigend einem Programm zuschlagen: eine Einzelsitzung mit drei Sätzen
verfälscht sonst die Statistik eines strukturierten Programms.

## Diesen Skill installieren

Damit er automatisch greift, in das Skill-Verzeichnis kopieren:

```bash
mkdir -p ~/.claude/skills/gym-analyse && cp SKILL.md ~/.claude/skills/gym-analyse/
```

Unter Windows/PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills\gym-analyse"; Copy-Item SKILL.md "$env:USERPROFILE\.claude\skills\gym-analyse\"
```
