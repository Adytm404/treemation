"""Buat thumbnail/cover 1080x1920 untuk TikTok/Reels dari plan.json -> "thumbnail".

Pakai:  python thumbnail.py <proyek> [nama.png]
Hasil:  <proyek>/thumbnail.png  dan  <proyek>/previews/thumbnail-cek.png (garis area aman potongan feed)
Butuh timeline.js (jalankan align.py dulu) dan scenes.js.
"""
import os, sys, json, pathlib
sys.path.insert(0, os.path.dirname(__file__))
from render import open_page

proj = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
name = sys.argv[2] if len(sys.argv) > 2 else "thumbnail.png"
out = os.path.join(proj, name)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b, pg, errs = open_page(p, proj)
    info = pg.evaluate("renderThumbnail()")
    pg.screenshot(path=out)
    b.close()
print("Thumbnail:", out, "| props dari detik", round(info["t"], 2))
if errs:
    print("ERROR/WARNING halaman:", *errs, sep="\n  ")
try:
    from PIL import Image, ImageDraw
    im = Image.open(out).convert("RGB"); d = ImageDraw.Draw(im)
    # area yang terlihat di grid profil: 3:4 (TikTok), 4:5 (Instagram), 1:1 (paling ketat)
    for (h, col) in [(1440, (255, 214, 10)), (1350, (52, 211, 153)), (1080, (255, 77, 94))]:
        y0 = (1920 - h) // 2; d.rectangle([0, y0, 1079, y0 + h], outline=col, width=6)
    os.makedirs(os.path.join(proj, "previews"), exist_ok=True)
    cek = os.path.join(proj, "previews", "thumbnail-cek.png"); im.resize((540, 960)).save(cek)
    print("Cek area aman:", cek, "(kuning 3:4, hijau 4:5, merah 1:1 — judul & wajah harus di dalam kotak merah)")
except ImportError:
    print("(pasang Pillow untuk gambar cek area aman: pip install pillow)")
