"""Unabhängige CSV-Gegenrechnung für die Browserprüfung (nur Standardbibliothek)."""
import csv
import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = list(csv.DictReader((ROOT / "FitNotesWorkouts.csv").open(encoding="utf-8-sig")))
rows = [r for r in rows if r["Name"] in {"Push", "Pull", "Legs", "Upper", "Lower"}]


def number(value):
    return float(value.replace(",", ".") or 0)


def metrics(data):
    groups = {(r["StartTime"], r["Name"]) for r in data}
    volume = sum(number(r["Weight"]) * number(r["Reps"]) for r in data)
    return {"sets": len(data), "sessions": len(groups), "volume": volume,
            "reps": sum(number(r["Reps"]) for r in data),
            "perSession": volume / len(groups) if groups else None}


last = date.fromisoformat(max(r["StartTime"][:10] for r in rows))
start = last - timedelta(days=27)
previous_start = start - timedelta(days=28)
current = [r for r in rows if start.isoformat() <= r["StartTime"][:10] <= last.isoformat()]
previous = [r for r in rows if previous_start.isoformat() <= r["StartTime"][:10] < start.isoformat()]
muscles = defaultdict(int)
for row in rows:
    if row.get("Categories"):
        muscles[row["Categories"].split(",")[0]] += 1
out = ROOT / ".qa" / "reference.json"
out.parent.mkdir(exist_ok=True)
weights = defaultdict(lambda: defaultdict(dict))
for row in rows:
    if row.get("Status", "").lower() == "failed" or number(row["Reps"]) <= 0:
        continue
    per_session = weights[row["Exercise"]][number(row["Weight"])]
    key = (row["StartTime"], row["Name"])
    per_session[key] = max(per_session.get(key, 0), number(row["Reps"]))
progress = {}
for exercise, by_weight in weights.items():
    progress[exercise] = []
    for weight, sessions in sorted(by_weight.items(), reverse=True):
        ordered = sorted(sessions.items())
        def point(item):
            (start, split), reps = item
            return {"date": start[:10], "start": start, "split": split, "reps": reps}
        progress[exercise].append({"weight": weight, "first": point(ordered[0]),
                                   "last": point(ordered[-1]), "count": len(ordered),
                                   "delta": ordered[-1][1] - ordered[0][1] if len(ordered) > 1 else None})
out.write_text(json.dumps({"total": metrics(rows), "current": metrics(current),
                           "previous": metrics(previous), "muscles": dict(muscles),
                           "progress": progress}), encoding="utf-8")
print("Unabhängige Referenzwerte erzeugt.")
