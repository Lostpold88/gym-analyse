"""
Prueft einen neuen FitNotes-Export gegen den zuletzt committeten Stand.

    python check_export.py

Faengt die beiden Fehler ab, die beim Nachziehen still danebengehen:
ein zeitlich gefilterter Export, der Historie verliert, und ein neuer
Workout-Name, der unbemerkt unter "Sonstige" landet.

Exit 0 = unbedenklich, Exit 1 = nicht committen.
"""

import collections
import csv
import io
import re
import subprocess
import sys

CSV = "FitNotesWorkouts.csv"
TEMPLATE = "dashboard_template.html"

read = lambda t: list(csv.DictReader(io.StringIO(t)))
key = lambda r: (r["StartTime"], r["Name"], r["Exercise"], r["Reps"], r["Weight"])

ref = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
new = read(open(CSV, encoding="utf-8-sig").read())
old = read(subprocess.run(["git", "show", f"{ref}:{CSV}"], capture_output=True,
                          text=True, encoding="utf-8").stdout.lstrip("﻿"))

if not new:
    sys.exit(f"FEHLER: {CSV} enthaelt keine Datenzeilen. Export pruefen, "
             "nicht committen.")
if not old:
    sys.exit("FEHLER: konnte den committeten Stand nicht lesen. Liegt die "
             "Datei im Repo und gibt es schon einen Commit?")

sessions = lambda rows: {(r["StartTime"], r["Name"]) for r in rows}
print(f"Saetze: {len(old)} -> {len(new)}  ({len(new) - len(old):+d})")
print(f"Einheiten: {len(sessions(old))} -> {len(sessions(new))}")
print(f"Zeitraum bis: {max(r['StartTime'][:10] for r in old)} -> "
      f"{max(r['StartTime'][:10] for r in new)}")

# Verlorene Saetze: alles, was im alten Stand steht und im neuen fehlt.
lost = sorted({k[0][:10] for k in
               collections.Counter(map(key, old)) - collections.Counter(map(key, new))})
if lost:
    print(f"\nWARNUNG: {len(lost)} Trainingstag(e) aus dem alten Stand fehlen: "
          f"{', '.join(lost[:5])}{' ...' if len(lost) > 5 else ''}")
    print("Der Export war vermutlich zeitlich gefiltert. NICHT committen.")

# Workout-Namen ohne Eintrag in PROGRAMS landen im Dashboard unter "Sonstige".
known = set(re.findall(r'"([^"]+)"', " ".join(
    re.findall(r"splits:\s*\[([^\]]*)\]",
               open(TEMPLATE, encoding="utf-8").read()))))
unmapped = {r["Name"] for r in new} - known
if unmapped:
    print(f"\nOhne Programm-Zuordnung (landen unter 'Sonstige'): "
          f"{', '.join(sorted(unmapped))}")
    print(f"Falls das ein Programm-Split ist: in PROGRAMS in {TEMPLATE} ergaenzen.")

new_ex = {r["Exercise"] for r in new} - {r["Exercise"] for r in old}
if new_ex:
    print(f"\nNeue Uebungen: {', '.join(sorted(new_ex))}")

sys.exit(1 if lost else 0)
