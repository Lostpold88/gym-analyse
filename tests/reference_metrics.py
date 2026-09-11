"""Unabhängige CSV-Gegenrechnung für die Browserprüfung (nur Standardbibliothek)."""
import csv
import json
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parents[1]
rows = list(csv.DictReader((ROOT / "FitNotesWorkouts.csv").open(encoding="utf-8-sig")))
rows = [r for r in rows if r["Name"] in {"Push", "Pull", "Legs", "Upper", "Lower"}]
excluded_names = {"Hammer Curls (KH)", "JM-Press (Multipresse)", "Beinpresse (Sitzend)"}
excluded_sets = sum(r["Exercise"] in excluded_names for r in rows)
rows = [r for r in rows if r["Exercise"] not in excluded_names]


def number(value):
    return float(value.replace(",", ".") or 0)


def metrics(data):
    groups = {(r["StartTime"], r["Name"]) for r in data}
    volume = sum(number(r["Weight"]) * number(r["Reps"]) for r in data)
    return {"sets": len(data), "sessions": len(groups), "volume": volume,
            "reps": sum(number(r["Reps"]) for r in data),
            "perSession": volume / len(groups) if groups else None}


last = date.fromisoformat(max(r["StartTime"][:10] for r in rows))
first_date = date.fromisoformat(min(r["StartTime"][:10] for r in rows))
half_days = ((last - first_date).days + 1) // 2
first_end = first_date + timedelta(days=half_days - 1)
last_start = last - timedelta(days=half_days - 1)
first_half = [r for r in rows if first_date.isoformat() <= r["StartTime"][:10] <= first_end.isoformat()]
last_half = [r for r in rows if last_start.isoformat() <= r["StartTime"][:10] <= last.isoformat()]

muscles = defaultdict(int)
for row in rows:
    if row.get("Categories"):
        muscles[row["Categories"].split(",")[0]] += 1
out = ROOT / ".qa" / "reference.json"
out.parent.mkdir(exist_ok=True)
eligible = defaultdict(dict)
bodyweight = set()
for row in rows:
    name = row["Exercise"]
    if re.search(r"klimm|pull.?up|chin.?up|\bdips?\b", name, re.I) or re.search(r"body.?weight|körpergewicht", row.get("Equipment", ""), re.I):
        bodyweight.add(name)
    reps, weight = number(row["Reps"]), number(row["Weight"])
    if row.get("Status", "").lower() == "failed" or not 1 <= reps <= 10 or weight <= 0:
        continue
    key = (row["StartTime"], row["Name"])
    eligible[name][key] = max(eligible[name].get(key, 0), weight * (1 + reps / 30))
trends = {"recent": {}, "start": {}}
for name in {r["Exercise"] for r in rows}:
    points = sorted(eligible[name].items())
    for mode in trends:
        result = {"count": len(points), "status": "unclear"}
        size = min(3, len(points) // 2)
        if size:
            before = points[-size * 2:-size] if mode == "recent" else points[:size]
            after = points[-size:]
            first_value, last_value = median(v for _, v in before), median(v for _, v in after)
            pct = (last_value - first_value) / first_value * 100
            if name not in bodyweight and (last - date.fromisoformat(points[-1][0][0][:10])).days <= 28:
                result["status"] = "up" if pct > 2.5 else "down" if pct < -2.5 else "stable"
            result.update(first=first_value, last=last_value, pct=pct,
                          before=[list(k) for k, _ in before], after=[list(k) for k, _ in after])
        trends[mode][name] = result
periods = {}
for label, current_start, current_end, split in [
    ("weeks1", last - timedelta(days=6), last, None),
    ("weeks1Push", last - timedelta(days=6), last, "Push"),
    ("weeks4", last - timedelta(days=27), last, None),
    ("weeks6", last - timedelta(days=41), last, None),
    ("custom", date(2026, 7, 20), date(2026, 8, 16), None),
]:
    days = (current_end - current_start).days + 1
    names = {r["Exercise"] for r in rows if current_start.isoformat() <= r["StartTime"][:10] <= current_end.isoformat() and (not split or r["Name"] == split)}
    assessments = {}
    for name in names:
        points = sorted((key, value) for key, value in eligible[name].items()
                        if current_start.isoformat() <= key[0][:10] <= current_end.isoformat() and (not split or key[1] == split))
        size = min(3, len(points) // 2)
        before = points[:size]
        after = points[-size:] if size else points
        result = {"count": len(points), "beforeCount": len(before), "afterCount": len(after), "status": "unclear",
                  "confidence": "solid" if size == 3 else "early"}
        if size:
            first_value, last_value = median(v for _, v in before), median(v for _, v in after)
            pct = (last_value - first_value) / first_value * 100
            if name not in bodyweight and (current_end - date.fromisoformat(after[-1][0][0][:10])).days <= 28:
                result["status"] = "up" if pct > 2.5 else "down" if pct < -2.5 else "stable"
            result.update(first=first_value, last=last_value, pct=pct,
                          before=[list(k) for k, _ in before], after=[list(k) for k, _ in after])
        assessments[name] = result
    periods[label] = {"from": current_start.isoformat(), "to": current_end.isoformat(), "days": days, "assessments": assessments}

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
out.write_text(json.dumps({"total": metrics(rows), "first": metrics(first_half),
                           "last": metrics(last_half), "muscles": dict(muscles),
                           "progress": progress, "trends": trends, "periods": periods,
                           "excludedSets": excluded_sets}), encoding="utf-8")
print("Unabhängige Referenzwerte erzeugt.")
