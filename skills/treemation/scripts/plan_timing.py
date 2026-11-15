"""Tahap 1: plan.json -> video-plan.json (timing PERKIRAAN) + naskah-elevenlabs.txt

Pakai:  python plan_timing.py <folder-proyek>
Membaca <proyek>/plan.json, menulis <proyek>/video-plan.json dan <proyek>/naskah-elevenlabs.txt
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from plan_lib import load_plan, tokenize, PAUSE, build_outputs, naskah_text, tc, hook_lint

SYL_PER_SEC = 5.2   # tempo ElevenLabs bahasa Indonesia yang terukur (~5 suku kata/detik)
LEAD, TAIL = 0.15, 0.25

proj = sys.argv[1] if len(sys.argv) > 1 else "."
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
