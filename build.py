#!/usr/bin/env python3
"""Собирает один самодостаточный HTML (dist/tear-calendar.html) из index.html, styles.css и calendar.js.

Порядок работы:
    npx -p typescript@5.4.5 tsc -p .      # calendar.ts -> calendar.js
    python3 build.py                      # -> dist/tear-calendar.html
"""
from pathlib import Path

root = Path(__file__).parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")
js = (root / "calendar.js").read_text(encoding="utf-8")

out = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>")
out = out.replace('<script src="calendar.js"></script>', "<script>\n" + js + "\n</script>")
assert "styles.css" not in out and "calendar.js" not in out, "не удалось встроить CSS/JS"

(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "tear-calendar.html").write_text(out, encoding="utf-8")
print("dist/tear-calendar.html:", len(out.encode()), "байт")
