"""Render frame video (Three.js + HTML) dengan Chromium headless.

Pakai:
  python render.py <proyek> --stills 3.5 12 40     # cek beberapa detik -> <proyek>/previews/*.png
  python render.py <proyek> --clip 10 18            # klip pendek dgn suara -> <proyek>/previews/clip_10-18.mp4
  python render.py <proyek> [--workers 4]          # semua frame -> <proyek>/frames/*.jpg (bisa dilanjut)
"""
import os, sys, json, time, argparse, pathlib, multiprocessing as mp
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        "--allow-file-access-from-files", "--disable-gpu-compositing"]


def open_page(p, proj):
    exe = os.environ.get("CHROME_PATH")
    b = p.chromium.launch(args=ARGS, **({"executable_path": exe} if exe else {}))
    pg = b.new_page(viewport={"width": 1080, "height": 1920})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type in ("error", "warning") and "GL Driver Message" not in m.text and errs.append(m.text))
    pg.goto(pathlib.Path(proj, "index.html").resolve().as_uri())
    try:
        pg.wait_for_function("window.ready===true", timeout=90000)
    except Exception:
        raise SystemExit("Halaman gagal siap. Error:\n" + "\n".join(errs))
    return b, pg, errs


def worker(proj, idx, n, total):
    from playwright.sync_api import sync_playwright
    out = os.path.join(proj, "frames")
    with sync_playwright() as p:
        b, pg, errs = open_page(p, proj)
        t0 = time.time(); done = 0
        for f in range(idx, total, n):
            path = os.path.join(out, f"{f:05d}.jpg")
            if os.path.exists(path):
                continue
            pg.evaluate(f"renderFrame({f})")
            pg.screenshot(path=path + ".tmp.jpg", type="jpeg", quality=93)
            os.replace(path + ".tmp.jpg", path)
            done += 1
            if idx == 0 and done % 50 == 0:
                print(f"  ~{f}/{total} frame, {(time.time() - t0) / done:.2f}s/frame (per worker)", flush=True)
        if errs:
            print("Peringatan dari halaman:", *errs[:5], sep="\n  ")
        b.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("proj")
    ap.add_argument("--stills", nargs="*", type=float)
    ap.add_argument("--clip", nargs=2, type=float, metavar=("MULAI", "AKHIR"))
    ap.add_argument("--workers", type=int, default=max(1, min(4, (os.cpu_count() or 2) // 2)))
    a = ap.parse_args()
    proj = os.path.abspath(a.proj)
    tl = json.load(open(os.path.join(proj, "timeline.json"), encoding="utf-8"))
    if a.stills is not None:
        from playwright.sync_api import sync_playwright
        os.makedirs(os.path.join(proj, "previews"), exist_ok=True)
        with sync_playwright() as p:
            b, pg, errs = open_page(p, proj)
            for s in a.stills:
                pg.evaluate(f"renderFrame({round(s * tl['fps'])})")
                pg.screenshot(path=os.path.join(proj, "previews", f"t{s:06.2f}.png"))
            b.close()
        print("Preview:", os.path.join(proj, "previews"))
        if errs:
            print("ERROR/WARNING halaman:", *errs, sep="\n  ")
        return
    if a.clip:
        import subprocess, shutil
        from playwright.sync_api import sync_playwright
        s0, s1 = a.clip; fps = tl["fps"]; tmp = os.path.join(proj, "previews", "_clip")
        shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
        with sync_playwright() as p:
            b, pg, errs = open_page(p, proj)
            for i, f in enumerate(range(round(s0 * fps), min(tl["frames"], round(s1 * fps)))):
                pg.evaluate(f"renderFrame({f})"); pg.screenshot(path=os.path.join(tmp, f"{i:05d}.jpg"), type="jpeg", quality=90)
            b.close()
        vm = json.load(open(os.path.join(proj, "video-plan.json"), encoding="utf-8"))
        audio = os.path.join(proj, vm["meta"]["audio"]["file"])
        out = os.path.join(proj, "previews", f"clip_{s0:g}-{s1:g}.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(tmp, "%05d.jpg")]
        if os.path.exists(audio):
            cmd += ["-ss", str(s0), "-t", str(s1 - s0), "-i", audio, "-c:a", "aac", "-shortest"]
        subprocess.run(cmd + ["-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", out], check=True)
        shutil.rmtree(tmp, ignore_errors=True)
        print("Klip:", out)
        return
    os.makedirs(os.path.join(proj, "frames"), exist_ok=True)
    total = tl["frames"]
    print(f"Render {total} frame dengan {a.workers} worker...")
    ps = [mp.Process(target=worker, args=(proj, i, a.workers, total)) for i in range(a.workers)]
    [p.start() for p in ps]; [p.join() for p in ps]
    missing = [f for f in range(total) if not os.path.exists(os.path.join(proj, "frames", f"{f:05d}.jpg"))]
    print("SELESAI" if not missing else f"Frame belum lengkap ({len(missing)} hilang) — jalankan lagi untuk melanjutkan.")


if __name__ == "__main__":
    main()
