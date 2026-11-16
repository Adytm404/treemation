"""Tahap 2: sinkronkan plan.json ke audio narasi.

Pakai:  python align.py <folder-proyek> [path-audio] [--whisper[=small]]
        --whisper: pakai faster-whisper (pip install faster-whisper) untuk waktu kata yang presisi
Audio default: <proyek>/narasi.mp3. Menulis timeline.js + timeline.json (untuk engine)
dan video-plan.json (timing asli). Butuh ffmpeg + numpy.

Cara kerja: cari jeda hening di audio, lalu cocokkan dengan tanda baca naskah memakai
dynamic programming (frasa boleh berbagi satu segmen suara, segmen boleh pecah di tengah
frasa — keduanya kena penalti). Kata di dalam frasa dibagi menurut jumlah suku kata.
Narasi di plan.json HARUS sama dengan teks yang dibacakan ElevenLabs.
"""
import sys, os, json, subprocess, wave, re
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from plan_lib import load_plan, tokenize, build_outputs, tc, visemes, set_lint

args_ = [a for a in sys.argv[1:] if not a.startswith("--")]
WHISPER = next((a.split("=", 1)[1] if "=" in a else "small" for a in sys.argv[1:] if a.startswith("--whisper")), None)
proj = args_[0] if args_ else "."
audio = args_[1] if len(args_) > 1 else os.path.join(proj, "narasi.mp3")
plan = load_plan(os.path.join(proj, "plan.json"))
fps = plan["fps"]

wav = os.path.join(proj, ".narasi16k.wav")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio, "-ac", "1", "-ar", "16000", wav], check=True)
w = wave.open(wav)
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
w.close()
AUDIO_LEN = len(x) / 16000
hop = 160
n = len(x) // hop
rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
db = 20 * np.log10(rms + 1e-6)
thr = np.percentile(db, 90) - 35
sil = db < thr
gaps, i = [], 0
while i < n:
    if sil[i]:
        j = i
        while j < n and sil[j]:
            j += 1
        if j - i >= 7:
            gaps.append((i / 100, j / 100))
        i = j
    else:
        i += 1
speech_start = gaps[0][1] if gaps and gaps[0][0] == 0 else 0.0
speech_end = gaps[-1][0] if gaps and gaps[-1][1] >= AUDIO_LEN - 0.05 else AUDIO_LEN
inner = [g for g in gaps if g[0] > speech_start and g[1] < speech_end]

phrases = []
for si, sc in enumerate(plan["scenes"]):
    cur = []
    for u in tokenize(sc["narration"], plan):
        cur.append(u)
        if u["punct"]:
            phrases.append((si, cur)); cur = []
    if cur:
        phrases.append((si, cur))
Pn = len(phrases)
psyl = [sum(u["syl"] for u in p[1]) for p in phrases]
punct = [p[1][-1]["punct"] for p in phrases]
segs, prev = [], speech_start
for g in inner:
    segs.append((prev, g[0])); prev = g[1]
segs.append((prev, speech_end))
Sn = len(segs)
rate = sum(psyl) / sum(b - a for a, b in segs)

INF = 1e18
dp = np.full((Pn + 1, Sn + 1), INF); dp[0][0] = 0; bk = {}
for k in range(Pn):
    for j in range(Sn):
        if dp[k][j] >= INF:
            continue
        for k2 in range(k + 1, min(Pn, k + 4) + 1):
            ex = sum(psyl[k:k2]) / rate
            pen_in = sum(1.2 if punct[m] in ".?!" else 0.45 for m in range(k, k2 - 1))
            for j2 in range(j + 1, min(Sn, j + 5) + 1):
                skipped = sum((segs[m + 1][0] - segs[m][1]) * 7 + 0.3 for m in range(j, j2 - 1))
                dur = sum(segs[m][1] - segs[m][0] for m in range(j, j2))
                c = dp[k][j] + (k2 - k) * np.log(max(dur, .05) / ex) ** 2 + pen_in + skipped
                if c < dp[k2][j2]:
                    dp[k2][j2] = c; bk[(k2, j2)] = (k, j)
if dp[Pn][Sn] >= INF:
    sys.exit("Gagal menyelaraskan. Pastikan narasi di plan.json sama persis dengan audio.")
groups, cur = [], (Pn, Sn)
while cur != (0, 0):
    pk, pj = bk[cur]; groups.append((pk, cur[0], pj, cur[1])); cur = (pk, pj)
groups.reverse()
ptimes = [None] * Pn
for (k, k2, j, j2) in groups:
    pieces = [segs[m] for m in range(j, j2)]
    total_sp = sum(b - a for a, b in pieces); tot_syl = sum(psyl[k:k2])

    def at(frac):
        r = frac * total_sp
        for a, b in pieces:
            if r <= b - a + 1e-9:
                return a + r
            r -= b - a
        return pieces[-1][1]
    acc = 0
    for m in range(k, k2):
        f0 = acc / tot_syl; acc += psyl[m]; ptimes[m] = (at(f0), at(acc / tot_syl))

words = []
for k, (si, us) in enumerate(phrases):
    t0, t1 = ptimes[k]
    wts = [u["syl"] + 0.3 for u in us]; tot = sum(wts); c = t0
    for u, wi in zip(us, wts):
        d = (t1 - t0) * wi / tot
        u = dict(u); u.update(start=round(c, 3), end=round(c + d, 3), scene=plan["scenes"][si]["id"]); c += d
        words.append(u)

# --- opsional: timestamp kata dari Whisper (lebih presisi), dicocokkan ke kata naskah ---
def norm_w(x):
    return re.sub(r"[^a-z0-9]", "", x.lower())


def apply_asr(words, asr):
    """words: unit naskah (spoken bisa >1 kata). asr: [(kata, start, end)]. Cocokkan urutan kata,
    pakai waktu ASR untuk yang cocok, sisanya diinterpolasi dari tetangga."""
    import difflib
    toks, owner = [], []
    for ui, u in enumerate(words):
        for w in u["spoken"].split():
            if norm_w(w):
                toks.append(norm_w(w)); owner.append(ui)
    asr_t = [norm_w(a[0]) for a in asr]
    sm = difflib.SequenceMatcher(None, toks, asr_t, autojunk=False)
    tt = [None] * len(toks)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            tt[a + k] = (asr[b + k][1], asr[b + k][2])
    hit = sum(1 for x in tt if x)
    for ui, u in enumerate(words):
        idx = [i for i, o in enumerate(owner) if o == ui and tt[i]]
        if idx:
            u["start"], u["end"] = round(tt[idx[0]][0], 3), round(tt[idx[-1]][1], 3)
    return hit, len(toks)


if WHISPER:
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(WHISPER, device="auto", compute_type="int8")
        segs_, _ = model.transcribe(audio, language="id", word_timestamps=True, vad_filter=False)
        asr = [(w.word.strip(), w.start, w.end) for sg in segs_ for w in (sg.words or [])]
        hit, tot = apply_asr(words, asr)
        print(f"Whisper ({WHISPER}): {hit}/{tot} kata cocok; waktu kata memakai hasil Whisper.")
        if hit < tot * .6:
            print("  ⚠ Banyak kata tidak cocok — kemungkinan narasi di plan.json beda dengan audio.")
    except ImportError:
        print("Whisper tidak terpasang (pip install faster-whisper) — memakai alignment jeda + suku kata.")
    except Exception as ex:
        print("Whisper gagal (" + str(ex)[:120] + ") — memakai alignment jeda + suku kata.")

first = {}
for k, (si, _) in enumerate(phrases):
    first.setdefault(si, k)
total = round(AUDIO_LEN + plan["tail_hold"], 2)
sid_order = [sc["id"] for sc in plan["scenes"]]
fw = {sid: [w for w in words if w["scene"] == sid] for sid in sid_order}
sb = [0.0] + [round((fw[sid_order[i - 1]][-1]["end"] + fw[sid_order[i]][0]["start"]) / 2, 2) for i in range(1, len(sid_order))] + [total]
bounds = [(sb[i], sb[i + 1]) for i in range(len(plan["scenes"]))]

doc = build_outputs(plan, words, bounds, total, {
    "audio": {"file": os.path.basename(audio), "source": "ElevenLabs", "length": round(AUDIO_LEN, 2)},
    "timing_note": "Waktu SUDAH disinkronkan ke audio: jeda audio dicocokkan dengan tanda baca naskah, kata dibagi menurut suku kata di dalam frasa."}, fps)
json.dump(doc, open(os.path.join(proj, "video-plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

frames = int(round(total * fps)); mouth = []
for f in range(frames):
    a = int(f / fps * 100); seg = db[max(0, a - 2):a + 3]
    v = float(np.max(seg)) if len(seg) else -90
    mouth.append(round(float(np.clip((v + 50) / 28, 0, 1)), 3))
# kata yang ditekankan (untuk anggukan host): puncak volume tertinggi + kata kunci, jarak ≥ 1,2 dtk
kwset = {k.lower() for k in plan["keywords"]}
cand = []
for w_ in words:
    f0, f1 = int(w_["start"] * fps), max(int(w_["start"] * fps) + 1, int(w_["end"] * fps))
    peak = max(mouth[f0:f1] or [0])
    cand.append((peak + (0.35 if w_["display"].lower() in kwset else 0), w_["start"]))
thr_e = sorted(c[0] for c in cand)[int(len(cand) * .82)] if cand else 1
emph, last_e = [], -9
for sc_, st_ in sorted(cand, key=lambda c: c[1]):
    if sc_ >= thr_e and st_ - last_e >= 1.2:
        emph.append(round(st_, 2)); last_e = st_
# bentuk mulut per frame: tiap vokal kata mendapat porsi waktu sama; diam (audio pelan) = tutup
vis = ["-"] * frames
for w_ in words:
    seq = visemes(w_["spoken"], plan); d = (w_["end"] - w_["start"]) / len(seq)
    for k_, v_ in enumerate(seq):
        for f in range(int(round((w_["start"] + k_ * d) * fps)), min(frames, int(round((w_["start"] + (k_ + 1) * d) * fps)))):
            vis[f] = v_
vis = "".join(v_ if mouth[f] >= .12 else "-" for f, v_ in enumerate(vis))
tl = {"fps": fps, "total": total, "frames": frames, "visemes": vis, "render_style": plan.get("render_style", {}), "loop_end": plan.get("loop_end", False), "emphasis": emph, "auto_punch": plan.get("auto_punch", True), "character_exit": plan.get("character_exit", "slide"), "set_keep_stage": plan.get("set_keep_stage", False), "audio_length": round(AUDIO_LEN, 2), "characters": doc.get("characters", {}), "thumbnail": plan.get("thumbnail"), "hook": doc.get("hook"), "scenes": doc["scenes"], "captions": doc["captions"],
      "words": [{k: u[k] for k in ("spoken", "display", "start", "end", "scene")} for u in words], "mouth": mouth}
json.dump(tl, open(os.path.join(proj, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False)
open(os.path.join(proj, "timeline.js"), "w", encoding="utf-8").write("window.TL=" + json.dumps(tl, ensure_ascii=False) + ";")
os.remove(wav)

print(f"Audio {AUDIO_LEN:.1f}s, video {total:.1f}s ({frames} frame), tempo {rate:.2f} suku kata/detik")
print("Frasa (cek yang durasinya jauh dari perkiraan):")
for k, (si, us) in enumerate(phrases):
    got, exp = ptimes[k][1] - ptimes[k][0], psyl[k] / rate
    flag = "  <-- cek" if got / exp > 1.8 or got / exp < 0.55 else ""
    print(f"  {ptimes[k][0]:6.2f}-{ptimes[k][1]:6.2f}  {' '.join(u['spoken'] for u in us)[:60]}{flag}")
print("Scene:")
for s in doc["scenes"]:
    print(f"  {s['start_tc']}–{s['end_tc']}  {s['id']}")
if any(s_.get("set") for s_ in plan["scenes"]):
    _sw = set_lint(plan, doc)
    print("Cek set 3D:", "OK" if not _sw else "")
    for _x in _sw:
        print("  ⚠", _x)
