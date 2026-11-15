"""Daftar proyek video di sebuah direktori beserta statusnya.

Pakai:  python find_project.py [direktori=.]
Proyek = folder berisi plan.json. Urut dari yang paling baru diubah.
"""
import os, sys, json, glob, time
base = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
rows = []
for plan in glob.glob(os.path.join(base, "**", "plan.json"), recursive=True):
    parts = plan.split(os.sep)
    if "node_modules" in parts or "examples" in parts or ".claude" in parts:
        continue
    d = os.path.dirname(plan)
    try:
        title = json.load(open(plan, encoding="utf-8")).get("title", "")
    except Exception:
        title = "(plan.json rusak)"
    audio = any(os.path.exists(os.path.join(d, f)) for f in ("narasi.mp3", "narasi.wav"))
    mp4s = [f for f in os.listdir(d) if f.endswith(".mp4")]
    frames = len(glob.glob(os.path.join(d, "frames", "*.jpg")))
    if mp4s:
        status = "SELESAI (" + ", ".join(mp4s) + ")"
    elif frames:
        status = f"RENDER SEBAGIAN ({frames} frame)"
    elif audio:
        status = "ADA AUDIO, belum dirender"
    else:
        status = "MENUNGGU MP3"
    rows.append((os.path.getmtime(plan), d, title, status))
if not rows:
    print("Belum ada proyek (tidak ada plan.json) di", base)
for mt, d, title, status in sorted(rows, reverse=True):
    print(f"{time.strftime('%Y-%m-%d %H:%M', time.localtime(mt))}  {status:<28} {os.path.relpath(d, base)}  — {title}")
