"""Siapkan folder proyek video baru.

Pakai:  python setup_project.py <folder-proyek>
- menyalin engine (index.html, engine.js) dari skill
- npm install three + font + ikon (sekali per proyek)
- membuat icons.js (semua ikon lucide)
- memeriksa ffmpeg, numpy, playwright + chromium
"""
import sys, os, shutil, subprocess, json, glob
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
proj = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
os.makedirs(proj, exist_ok=True)
for f in ("index.html", "engine.js", "pixelchar.js", "sets.js"):
    shutil.copy(os.path.join(SKILL, "assets", "engine", f), os.path.join(proj, f))
pkg = {"name": "video-edukasi", "private": True, "dependencies": {
    "three": "0.160.0", "@fontsource/poppins": "5.0.8", "@fontsource/jetbrains-mono": "5.0.18", "lucide-static": "0.400.0"}}
json.dump(pkg, open(os.path.join(proj, "package.json"), "w"), indent=2)
npm = shutil.which("npm") or shutil.which("npm.cmd")
if not npm:
    sys.exit("npm tidak ditemukan. Install Node.js dulu (https://nodejs.org).")
if not os.path.isdir(os.path.join(proj, "node_modules", "three")):
    subprocess.run([npm, "install", "--no-audit", "--no-fund"], cwd=proj, check=True)
icons = {}
for p in glob.glob(os.path.join(proj, "node_modules", "lucide-static", "icons", "*.svg")):
    icons[os.path.basename(p)[:-4]] = open(p, encoding="utf-8").read().replace("\n", " ")
open(os.path.join(proj, "icons.js"), "w", encoding="utf-8").write("window.ICONS=" + json.dumps(icons) + ";")
print(f"icons.js: {len(icons)} ikon")
problems = []
if not shutil.which("ffmpeg"):
    problems.append("ffmpeg belum ada (Windows: winget install ffmpeg | macOS: brew install ffmpeg)")
try:
    import numpy  # noqa
except ImportError:
    problems.append("numpy belum ada: pip install numpy")
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        p.chromium.launch().close()
except ImportError:
    problems.append("playwright belum ada: pip install playwright && python -m playwright install chromium")
except Exception:
    problems.append("Chromium untuk playwright belum ada: python -m playwright install chromium")
print("Proyek siap:", proj)
for m in problems:
    print("PERLU:", m)
