"""Buat efek suara, mix dengan narasi (+ musik latar dengan ducking), lalu gabungkan frame jadi MP4.

Pakai:  python encode.py <proyek> [nama-output.mp4] [--no-sfx] [--music musik.mp3 | --music auto] [--music-volume 0.35]
Musik juga bisa diatur di plan.json: "music": {"file": "musik.mp3", "volume": 0.35}
"""
import os, sys, json, wave, subprocess, argparse
import numpy as np
SR = 44100


def make_sfx(tl, path):
    total = tl["total"]; out = np.zeros(int(SR * (total + 1))); rng = np.random.default_rng(1)

    def env(n, a, d):
        t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)

    def tone(f0, f1, dur, dec, amp=1.0, sq=False):
        n = int(SR * dur); f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
        s = np.sign(np.sin(ph)) * .5 if sq else np.sin(ph); return s * env(n, .003, dec) * amp

    def noise(dur, lo, hi, amp=1.0, swell=True):
        n = int(SR * dur); X = np.fft.rfft(rng.standard_normal(n)); fr = np.fft.rfftfreq(n, 1 / SR)
        X[(fr < lo) | (fr > hi)] = 0; x = np.fft.irfft(X, n); x /= np.abs(x).max() + 1e-9
        tt = np.linspace(0, 1, n); return x * (np.sin(np.pi * tt) ** 2 if swell else np.exp(-tt * 8)) * amp

    def chime():
        s = np.zeros(int(SR * 1.1))
        for i, f in enumerate([784, 988, 1318]):
            x = tone(f, f, .8, .22, .4); o = int(i * .09 * SR); s[o:o + len(x)] += x
        return s

    def typing():
        s = np.zeros(int(SR * 1.0))
        for i in range(12):
            c = noise(.025, 2000, 8000, .35, False); o = int((i * .075 + rng.random() * .01) * SR); s[o:o + len(c)] += c
        return s
    def coin():
        out_ = np.zeros(int(SR * .6)); a = tone(988, 988, .08, .05, .4); b = tone(1318, 1318, .5, .15, .4)
        out_[:len(a)] += a; o = int(SR * .08); out_[o:o + len(b)] += b[:len(out_) - o]; return out_
    def count_ticks():
        out_ = np.zeros(int(SR * .9))
        for i in range(10):
            a = tone(1700 + i * 40, 1700 + i * 40, .03, .015, .3); o = int(i * .085 * SR); out_[o:o + len(a)] += a
        return out_
    def boom():
        return tone(120, 40, .5, .25, .9) + noise(.5, 40, 400, .4, False)
    LIB = {"count": count_ticks, "boom": boom, "pop": lambda: tone(900, 320, .12, .04, .9), "whoosh": lambda: noise(.32, 600, 5000, .5),
           "ding": lambda: tone(1318, 1318, .9, .25, .5) + tone(1976, 1976, .9, .18, .25), "success_chime": chime,
           "typing": typing, "buzz": lambda: tone(140, 110, .35, .3, .35, True),
           "rise_hum": lambda: tone(90, 180, .7, .6, .35) + noise(.7, 200, 1200, .15),
           "multiply_swell": lambda: noise(.9, 300, 3000, .45) + tone(220, 440, .9, .8, .15),
           "scratch": lambda: noise(.25, 800, 3000, .45, False), "tick": lambda: tone(1500, 1500, .06, .02, .4),
           "boing": lambda: tone(200, 600, .35, .15, .5), "coin": coin}

    def add(x, t):
        o = int(max(0, t) * SR); x = x[:len(out) - o]; out[o:o + len(x)] += x
    for s in tl["scenes"]:
        for e in s["sfx"]:
            snd, t = e["sound"], e["start"]
            base = snd.split("_x")[0]; times = int(snd.split("_x")[1]) if "_x" in snd else 1
            if base.startswith("whoosh"):
                base, t = "whoosh", t - .25
            if base not in LIB:
                print("sfx tidak dikenal, dilewati:", snd); continue
            gap = .22 if times == 4 else .28
            for i in range(times):
                add(LIB[base](), t - (.15 if times > 1 else 0) + i * gap - (.2 if base == "typing" else 0))
    if np.abs(out).max() > 0:
        out = out / np.abs(out).max() * .22
    w = wave.open(path, "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()


def make_music(path, dur, bpm=100, seed=4):
    """Musik latar sederhana buatan code (bebas royalti): progresi C–G–Am–F, pad lembut, arpeggio, kick pelan."""
    rng = np.random.default_rng(seed); n = int(SR * dur); out = np.zeros(n); beat = 60 / bpm
    chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    bar = beat * 4; t_all = np.arange(n) / SR
    for b in range(int(dur / bar) + 1):
        ch = chords[b % 4]; s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR))
        if s0 >= n: break
        tt = t_all[s0:s1] - b * bar
        env = np.minimum(1, tt / .4) * np.minimum(1, (bar - tt) / .3)
        for m in ch:
            out[s0:s1] += .05 * env * (np.sin(2 * np.pi * f(m) * tt) + .3 * np.sin(2 * np.pi * f(m + 12) * tt))
        for k in range(8):   # arpeggio seperdelapan
            m = ch[k % 3] + 12 * (k // 3 % 2); a0 = s0 + int(k * beat / 2 * SR); L = int(.25 * SR)
            if a0 + L > n: break
            tl_ = np.arange(L) / SR; out[a0:a0 + L] += .045 * np.sin(2 * np.pi * f(m + 12) * tl_) * np.exp(-tl_ / .09)
        for k in range(4):   # kick lembut
            a0 = s0 + int(k * beat * SR); L = int(.18 * SR)
            if a0 + L > n: break
            tl_ = np.arange(L) / SR; fr = 110 * np.exp(-tl_ / .05) + 45; out[a0:a0 + L] += .09 * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tl_ / .07)
    out /= np.abs(out).max() + 1e-9; out *= .7
    w = wave.open(path, "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("proj"); ap.add_argument("out", nargs="?", default="video.mp4")
    ap.add_argument("--audio", default=None); ap.add_argument("--no-sfx", action="store_true")
    ap.add_argument("--music", default=None, help="file musik latar, atau 'auto' (musik sederhana buatan code). Default: plan.json → music.file")
    ap.add_argument("--music-volume", type=float, default=None, help="volume musik sebelum ducking (default 0.35)")
    a = ap.parse_args(); proj = os.path.abspath(a.proj)
    tl = json.load(open(os.path.join(proj, "timeline.json"), encoding="utf-8"))
    vm = json.load(open(os.path.join(proj, "video-plan.json"), encoding="utf-8"))
    audio = a.audio or os.path.join(proj, vm["meta"]["audio"]["file"])
    total = tl["total"]; mix = os.path.join(proj, "mix.wav")
    inputs = ["-i", audio]; filt = f"[0:a]aresample={SR},apad=pad_dur={total}[v]"; labels = "[v]"; n = 1
    if not a.no_sfx:
        make_sfx(tl, os.path.join(proj, "sfx.wav")); inputs += ["-i", os.path.join(proj, "sfx.wav")]; labels += f"[{n}:a]"; n += 1
    plan = json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8")) if os.path.exists(os.path.join(proj, "plan.json")) else {}
    mus = a.music or (plan.get("music") or {}).get("file")
    mvol = a.music_volume if a.music_volume is not None else (plan.get("music") or {}).get("volume", .35)
    if mus == "auto":
        mus = os.path.join(proj, "musik-auto.wav"); make_music(mus, total + 1)
    elif mus and not os.path.isabs(mus):
        mus = os.path.join(proj, mus)
    if mus:
        # ducking: musik otomatis mengecil saat narasi bicara (sidechain), fade in/out
        inputs += ["-stream_loop", "-1", "-i", mus]
        filt = filt.replace("[v]", "[v0]", 1) + ";[v0]asplit=2[v][vsc]"
        filt += (f";[{n}:a]aresample={SR},volume={mvol},afade=t=in:d=0.6,afade=t=out:st={max(0, total - 1.6)}:d=1.5,atrim=0:{total}[mraw]"
                 f";[mraw][vsc]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=400:makeup=1[m]")
        labels += "[m]"; n += 1
    filt += f";{labels}amix=inputs={n}:duration=first:normalize=0,atrim=0:{total},alimiter=limit=0.95[a]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", filt, "-map", "[a]", "-ac", "2", mix], check=True)
    out = a.out if os.path.isabs(a.out) else os.path.join(proj, a.out)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(tl["fps"]), "-i", os.path.join(proj, "frames", "%05d.jpg"),
                    "-i", mix, "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
    print("Video:", out)


if __name__ == "__main__":
    main()
