"""Tahap 1: plan.json -> video-plan.json (timing PERKIRAAN) + naskah-elevenlabs.txt

Pakai:  python plan_timing.py <folder-proyek> [--preview]
Membaca <proyek>/plan.json, menulis <proyek>/video-plan.json dan <proyek>/naskah-elevenlabs.txt
--preview: juga menulis timeline.js/json dengan timing perkiraan (mulut bergerak sintetis), supaya
           render.py --stills bisa dipakai SEBELUM ada MP3 (mis. mengecek set 3D). align.py akan
           menimpanya dengan timing asli.
"""
import sys, json, os, math
sys.path.insert(0, os.path.dirname(__file__))
from plan_lib import load_plan, tokenize, PAUSE, build_outputs, naskah_text, tc, hook_lint, set_lint

SYL_PER_SEC = 5.2   # tempo ElevenLabs bahasa Indonesia yang terukur (~5 suku kata/detik)
LEAD, TAIL = 0.15, 0.25

args = [a for a in sys.argv[1:] if not a.startswith("--")]
PREVIEW = "--preview" in sys.argv
proj = args[0] if args else "."
plan = load_plan(os.path.join(proj, "plan.json"))
fps = plan["fps"]
t, words, bounds = 0.0, [], []
for i, sc in enumerate(plan["scenes"]):
    units = tokenize(sc["narration"], plan)
    cur = t + LEAD
    for u in units:
        d = u["syl"] / SYL_PER_SEC
        u.update(start=round(cur, 3), end=round(cur + d, 3), scene=sc["id"])
        cur += d + PAUSE.get(u["punct"], 0)
    end = cur + TAIL + (plan["tail_hold"] if i == len(plan["scenes"]) - 1 else 0)
    bounds.append((round(t, 2), round(end, 2)))
    words.extend(units)
    t = end
doc = build_outputs(plan, words, bounds, t, {
    "audio": {"file": "narasi.mp3", "source": "ElevenLabs"},
    "timing_note": "Waktu masih PERKIRAAN (~5 suku kata/detik). Setelah audio ElevenLabs jadi, jalankan align.py supaya semua waktu mengikuti audio asli."}, fps)
json.dump(doc, open(os.path.join(proj, "video-plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(os.path.join(proj, "naskah-elevenlabs.txt"), "w", encoding="utf-8").write(naskah_text(plan))
words_n = sum(len(s["narration"].split()) for s in plan["scenes"])
print(f"{len(plan['scenes'])} scene, {words_n} kata, perkiraan durasi {tc(t)}")
for s in doc["scenes"]:
    print(f"  {s['start_tc']}–{s['end_tc']}  {s['id']:<16} {s['top_label']}")
print(f"  caption: {len(doc['captions'])}")
w = hook_lint(plan, doc)
print("Cek hook:", "OK" if not w else "")
for x in w:
    print("  ⚠", x)
sw = set_lint(plan, doc)
if any(s.get("set") for s in plan["scenes"]):
    print("Cek set 3D:", "OK" if not sw else "")
    for x in sw:
        print("  ⚠", x)

if PREVIEW:
    from plan_lib import visemes
    frames = int(round(t * fps))
    mouth, vis = [0.0] * frames, ["-"] * frames
    for u in words:
        seq = visemes(u["spoken"], plan); d = (u["end"] - u["start"]) / len(seq)
        for k, v in enumerate(seq):
            for f in range(int(round((u["start"] + k * d) * fps)), min(frames, int(round((u["start"] + (k + 1) * d) * fps)))):
                vis[f] = v; mouth[f] = round(.45 + .35 * abs(math.sin(f * .9)), 3)
    tl = {"fps": fps, "total": round(t, 2), "frames": frames, "visemes": "".join(vis), "render_style": plan.get("render_style", {}),
          "loop_end": plan.get("loop_end", False), "emphasis": [], "auto_punch": plan.get("auto_punch", True),
          "character_exit": plan.get("character_exit", "slide"), "set_keep_stage": plan.get("set_keep_stage", False), "audio_length": round(t, 2), "characters": doc.get("characters", {}),
          "thumbnail": plan.get("thumbnail"), "hook": doc.get("hook"), "scenes": doc["scenes"], "captions": doc["captions"],
          "words": [{k: u[k] for k in ("spoken", "display", "start", "end", "scene")} for u in words], "mouth": mouth, "preview": True}
    json.dump(tl, open(os.path.join(proj, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False)
    open(os.path.join(proj, "timeline.js"), "w", encoding="utf-8").write("window.TL=" + json.dumps(tl, ensure_ascii=False) + ";")
    print("Preview: timeline.js (timing perkiraan) ditulis — render.py --stills bisa dipakai sebelum MP3.")
