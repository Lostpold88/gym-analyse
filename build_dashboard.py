"""
Baut aus einem FitNotes-CSV-Export eine eigenstaendige HTML-Analyseseite.

    python build_dashboard.py                      # nutzt FitNotesWorkouts.csv
    python build_dashboard.py mein_export.csv      # andere Quelldatei
    python build_dashboard.py export.csv out.html  # anderes Ziel

Die erzeugte Seite ist eine einzelne Datei ohne externe Abhaengigkeiten:
Doppelklick genuegt, sie laeuft auch offline. Ein neuer Export kann direkt
im Browser per Drag & Drop geladen werden - dafuer ist kein erneuter Lauf
dieses Skripts noetig.

Das Ziel heisst index.html, damit GitHub Pages die Seite direkt unter der
Root-URL des Repos ausliefert.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "dashboard_template.html"
DEFAULT_CSV = HERE / "FitNotesWorkouts.csv"
DEFAULT_OUT = HERE / "index.html"


def js_string(text: str) -> str:
    """Als JS-Stringliteral einbetten. json.dumps escaped Quotes, Backslashes
    und Steuerzeichen; '</' wird zerlegt, damit nichts das <script>-Tag
    vorzeitig schliesst, und U+2028/29 sind in JS Zeilenumbrueche."""
    return (
        json.dumps(text, ensure_ascii=False)
        .replace("</", "<\\/")
        .replace(" ", "\\u2028")
        .replace(" ", "\\u2029")
    )


def read_text(path: Path) -> str:
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    raise SystemExit(f"Konnte die Zeichenkodierung von {path} nicht bestimmen.")


def main(argv: list[str]) -> int:
    csv_path = Path(argv[1]).resolve() if len(argv) > 1 else DEFAULT_CSV
    out_path = Path(argv[2]).resolve() if len(argv) > 2 else DEFAULT_OUT

    if not csv_path.is_file():
        raise SystemExit(f"CSV nicht gefunden: {csv_path}")
    if not TEMPLATE.is_file():
        raise SystemExit(f"Vorlage nicht gefunden: {TEMPLATE}")

    csv_text = read_text(csv_path)
    template = TEMPLATE.read_text(encoding="utf-8")

    for token in ("__CSV_DATA__", "__BUILD_INFO__"):
        if token not in template:
            raise SystemExit(f"Platzhalter {token} fehlt in {TEMPLATE.name}.")

    info = {
        "file": csv_path.name,
        "built": datetime.now().strftime("%d.%m.%Y %H:%M"),
    }
    html = template.replace("__CSV_DATA__", js_string(csv_text))
    html = html.replace("__BUILD_INFO__", json.dumps(info, ensure_ascii=False))
    out_path.write_text(html, encoding="utf-8")

    rows = max(0, csv_text.count("\n") - 1)
    size_kb = out_path.stat().st_size / 1024
    print(f"{csv_path.name}: ~{rows} Datenzeilen eingebettet")
    print(f"-> {out_path}  ({size_kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
