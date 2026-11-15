"""Utilitas bersama untuk plan.json -> video-plan.json / timeline."""
import json, re

PAUSE = {",": 0.22, ".": 0.40, "?": 0.45, "!": 0.40}
BASE_SYL = {"ip": 2, "dua": 2, "online": 2, "website": 2, "file": 1, "address": 2, "center": 2,
            "nonstop": 2, "upload": 2, "download": 2, "email": 2, "google": 2, "youtube": 2,
            "update": 2, "software": 2, "hardware": 2, "game": 1, "save": 1, "share": 1, "like": 1}


# Lip sync vokal: mulut punya bentuk A, I, U, E, O + tutup.
# Kata asing ditulis sesuai cara baca supaya vokalnya benar (bisa ditambah lewat plan["pronunciation"]).
BASE_PRON = {"website": "websait", "online": "onlain", "offline": "oflain", "file": "fail", "upload": "aplod",
             "download": "daunlod", "software": "sofwer", "hardware": "hardwer", "email": "imel", "google": "gugel",
             "youtube": "yutub", "like": "laik", "share": "syer", "update": "apdet", "ip": "aipi", "dns": "dienes",
             "wifi": "waifai", "browser": "brauser", "cloud": "klaud", "center": "senter", "address": "adres",
             "online!": "onlain", "app": "ep", "apps": "eps", "smartphone": "smartfon", "phone": "fon",
             "laptop": "leptop", "game": "gem", "chat": "cet", "data": "data", "ai": "ei", "tiktok": "tiktok",
             "instagram": "instagram", "reels": "rils", "shorts": "syorts", "follow": "folo", "followers": "folowers",
             "content": "konten", "creator": "kriyetor", "online.": "onlain"}
VISEME = {"a": "A", "i": "I", "u": "U", "e": "E", "o": "O"}


def visemes(text, plan=None):
    """Urutan bentuk mulut untuk teks yang diucapkan. 'aku mau makan' -> A U A U A A."""
    pron = {**BASE_PRON, **{k.lower(): v for k, v in ((plan or {}).get("pronunciation") or {}).items()}}
    seq = []
    for w in re.split(r"[\s\-]+", text.lower()):
        w = re.sub(r"[^a-z]", "", pron.get(w, w))
        w = pron.get(w, w)
        seq += [VISEME[c] for c in w if c in VISEME]
    return seq or ["A"]


def load_plan(path):
    plan = json.load(open(path, encoding="utf-8"))
    plan.setdefault("fps", 30)
    plan.setdefault("tail_hold", 1.0)
    plan.setdefault("phrases", [])
    plan.setdefault("keywords", [])
    plan.setdefault("syllable_overrides", {})
    ids = [s["id"] for s in plan["scenes"]]
    assert len(ids) == len(set(ids)), "id scene harus unik"
    return plan


def syl(word, overrides):
    w = re.sub(r"[^a-z\-]", "", word.lower())
    table = {**BASE_SYL, **{k.lower(): v for k, v in overrides.items()}}
    total = 0
    for part in w.split("-"):
        if part:
            total += table.get(part, max(1, len(re.findall(r"[aiueo]+", part))))
    return max(total, 1) if word.strip() else 0


def tc(t):
    m = int(t // 60)
    return f"{m:02d}:{t - m * 60:04.1f}"


def tokenize(text, plan):
    """Pecah narasi jadi unit kata; frasa di plan['phrases'] digabung jadi satu caption."""
    raw = text.split()
    units, i = [], 0
    while i < len(raw):
        matched = False
        for spoken, disp in plan["phrases"]:
            n = len(spoken.split())
            cand = raw[i:i + n]
            if len(cand) == n and " ".join(re.sub(r"[,.?!]", "", w) for w in cand).lower() == spoken.lower():
                punct = re.findall(r"[,.?!]$", cand[-1])
                units.append({"spoken": " ".join(cand).rstrip(",.?!"), "display": disp,
                              "syl": sum(syl(w, plan["syllable_overrides"]) for w in cand),
                              "punct": punct[0] if punct else ""})
                i += n
                matched = True
                break
        if not matched:
            w = raw[i]
            punct = re.findall(r"[,.?!]$", w)
            clean = w.rstrip(",.?!")
            units.append({"spoken": clean, "display": clean, "syl": syl(clean, plan["syllable_overrides"]),
                          "punct": punct[0] if punct else ""})
            i += 1
    return units


def finder(words, sid):
    sw = [w for w in words if w["scene"] == sid]

    def find(word, occ=0, scene_start=None):
        if word == "@start":
            return round(scene_start + 0.1, 2)
        n = 0
        for u in sw:
            if u["display"].lower() == word.lower() or u["spoken"].lower() == word.lower():
                if n == occ:
                    return round(u["start"], 2)
                n += 1
        raise ValueError(f'Kata pemicu "{word}" tidak ada di narasi scene {sid}')
    return find


def build_outputs(plan, words, bounds, total, meta_extra, fps=30):
    """words: list unit bertimestamp (start,end,scene). bounds: list (start,end) per scene."""
    kw = {k.lower() for k in plan["keywords"]}
    scenes_out = []
    for (start, end), sc in zip(bounds, plan["scenes"]):
        find = finder(words, sc["id"])

        def F(w):
            return find(w, scene_start=start)
        vis = []
        for v in sc.get("visuals", []):
            v = dict(v)
            if "trigger" in v:
                v["trigger_word"] = v.pop("trigger")
                v["start"] = F(v["trigger_word"])
                v["start_tc"] = tc(v["start"])
                v["start_frame"] = round(v["start"] * fps)
            if "triggers" in v:
                trg = v.pop("triggers")
                v["timeline"] = [{"item": c, "trigger_word": w, "start": F(w), "start_tc": tc(F(w))}
                                 for c, w in zip(v["content"], trg)]
            v["end"] = round(end, 2)
            v["end_tc"] = tc(end)
            vis.append(v)
        host = sc.get("host", {})
        masc = sc.get("mascot", {})
        out = {
            "id": sc["id"], "label": sc.get("label", ["", ""]),
            "top_label": " ".join(x for x in sc.get("label", ["", ""]) if x),
            "step": sc.get("step"),
            "start": round(start, 2), "end": round(end, 2), "start_tc": tc(start), "end_tc": tc(end),
            "start_frame": round(start * fps), "end_frame": round(end * fps), "duration": round(end - start, 2),
            "narration": sc["narration"], "camera": sc.get("camera", ""),
            "host": {"pose": host.get("pose", "idle"), "expression": host.get("expression", "talk"),
                     "gestures": [{"trigger_word": g[0], "gesture": g[1],
                                   "expression": g[2] if len(g) > 2 else host.get("expression", "talk"),
                                   "start": F(g[0]), "start_tc": tc(F(g[0]))} for g in host.get("gestures", [])],
                     "mouth": "lip sync dari amplitudo audio"},
            "mascot": {"action": masc.get("action", "idle"), "eyes": masc.get("eyes", "normal"),
                       "changes": [{"trigger_word": c[0], "action": c[1], "eyes": c[2], "start": F(c[0]),
                                    "start_tc": tc(F(c[0]))} for c in masc.get("changes", [])]},
            "punch": [{"trigger_word": k[0], "strength": k[1] if len(k) > 1 else .08, "start": F(k[0])} for k in sc.get("punch", [])],
            "shake": [{"trigger_word": k[0], "strength": k[1] if len(k) > 1 else .12, "start": F(k[0])} for k in sc.get("shake", [])],
            "rehook": bool(sc.get("rehook")), "comment_prompt": bool(sc.get("comment_prompt")),
            "enter": [{"trigger_word": e[0], "who": e[1], "from": e[2] if len(e) > 2 else "side",
                       "start": round(start, 2) if e[0] == "@start" else F(e[0])} for e in sc.get("enter", [])],
            "shots": [{"trigger_word": k[0], "shot": k[1], "transition": k[2] if len(k) > 2 else "cut",
                       **({"chars": k[3]} if len(k) > 3 else {}),
                       "start": round(start, 2) if k[0] == "@start" else F(k[0]),
                       "start_tc": tc(start if k[0] == "@start" else F(k[0]))} for k in sc.get("shots", [])],
            "visuals": vis,
            "sfx": [{"trigger_word": w, "sound": s, "start": F(w), "start_tc": tc(F(w))} for w, s in sc.get("sfx", [])],
        }
        if sc.get("background"):
            b = dict(sc["background"])
            at = b.pop("at", None)
            b["start"] = F(at) if at else round(start, 2)
            b["start_tc"] = tc(b["start"])
            out["background"] = b
        if sc.get("dashes_from"):
            out["dashes_from"] = sc["dashes_from"]
            out["dashes_from_t"] = F(sc["dashes_from"])
        scenes_out.append(out)

    # caption: kata kunci berdiri sendiri, lainnya maks 3 kata, putus di tanda baca
    chunks, buf = [], []

    def flush():
        if buf:
            chunks.append(list(buf))
            buf.clear()
    for u in words:
        if u["display"].lower() in kw:
            flush()
            chunks.append([u])
            continue
        if buf and buf[0]["scene"] != u["scene"]:
            flush()
        buf.append(u)
        if u["punct"] or len(buf) == 3:
            flush()
    flush()
    ends = {s["id"]: s["end"] for s in scenes_out}
    caps = []
    for i, ch in enumerate(chunks):
        s, e = ch[0]["start"], ch[-1]["end"]
        nxt = chunks[i + 1][0]["start"] if i + 1 < len(chunks) else None
        if nxt is not None and nxt - e < 0.7 and chunks[i + 1][0]["scene"] == ch[0]["scene"]:
            e = nxt
        else:
            e = min(e + 0.35, ends[ch[0]["scene"]])
        text = " ".join(u["display"] for u in ch)
        if ch[-1]["punct"] in ("?", "!"):
            text += ch[-1]["punct"]
        caps.append({"id": f"c{i + 1:03d}", "scene": ch[0]["scene"], "text": text,
                     "highlight": any(u["display"].lower() in kw for u in ch),
                     "start": round(s, 2), "end": round(e, 2), "start_tc": tc(s), "end_tc": tc(e),
                     "start_frame": round(s * fps), "end_frame": round(e * fps),
                     "words": [{"spoken": u["spoken"], "display": u["display"], "start": round(u["start"], 2),
                                "end": round(u["end"], 2)} for u in ch]})
    hook = None
    if plan.get("hook"):
        hook = dict(plan["hook"])
        first = plan["scenes"][0]["id"]
        fw = [w for w in words if w["scene"] == first]
        u = hook.get("until")
        if isinstance(u, (int, float)):
            hook["until_t"] = float(u)
        elif u:
            hook["until_t"] = round(finder(words, first)(u) + 0.25, 2)
        else:   # default: akhir kalimat pertama
            end = next((w["end"] for w in fw if w["punct"] in ".?!"), fw[-1]["end"] if fw else 2.5)
            hook["until_t"] = round(min(end, 3.5) + 0.1, 2)
    doc = {
        "hook": hook,
        "meta": {"title": plan.get("title", ""), "language": "id-ID",
                 "format": {"width": 1080, "height": 1920, "fps": fps, "aspect": "9:16"},
                 "duration": round(total, 2), "duration_tc": tc(total), "total_frames": round(total * fps),
                 "full_narration": " ".join(s["narration"] for s in plan["scenes"]), **meta_extra},
        "style": plan.get("style", {}),
        "characters": plan.get("characters", {}),
        "thumbnail": plan.get("thumbnail"),
        "scenes": scenes_out,
        "captions": caps,
    }
    return doc


def naskah_text(plan):
    """Teks untuk ditempel ke ElevenLabs: satu paragraf per scene, tanpa label."""
    return "\n\n".join(s["narration"] for s in plan["scenes"]) + "\n"


GREET = re.compile(r"^(halo|hai|hi|hello|selamat|assalamu|guys|balik lagi|kembali lagi|di video|pada video|oke|ok)\b", re.I)
STRONG_OPEN = {"host_close", "mascot_close", "low_angle", "illustration"}


def hook_lint(plan, doc=None):
    """Periksa pembuka video terhadap aturan hook (references/hook.md). Mengembalikan daftar peringatan."""
    warn = []
    s1 = plan["scenes"][0]
    nar = s1["narration"].strip()
    first_sentence = re.split(r"(?<=[.?!])\s", nar)[0]
    nw = len(first_sentence.split())
    if GREET.match(nar):
        warn.append("Pembuka diawali sapaan/intro — mulai langsung dengan kalimat hook.")
    if nw > 14:
        warn.append(f"Kalimat hook {nw} kata (> 14) — terlalu lama, potong supaya selesai ±2,5 dtk.")
    hk = plan.get("hook")
    if not hk:
        warn.append('Belum ada "hook" di plan.json (teks hook besar + alternatif).')
    else:
        txt = " ".join(hk.get("text", [])).replace("*", "")
        if len(txt.split()) > 7:
            warn.append(f"Teks hook {len(txt.split())} kata (> 7).")
        norm = lambda x: re.sub(r"[^a-z0-9 ]", "", x.lower()).split()
        if txt and norm(txt) == norm(first_sentence)[:len(norm(txt))]:
            warn.append("Teks hook sama dengan awal narasi — buat berbeda (inti/pertanyaan, bukan salinan).")
        if len(hk.get("alternatives", [])) < 2:
            warn.append("Sertakan minimal 2 alternatif hook lain di hook.alternatives.")
    shots = s1.get("shots", [])
    if not shots or shots[0][0] != "@start" or shots[0][1] not in STRONG_OPEN:
        warn.append("Shot pertama sebaiknya @start dengan host_close / mascot_close / low_angle / illustration.")
    if not s1.get("sfx"):
        warn.append("Tambahkan efek suara di kata pertama scene 1 (whoosh/pop/boing).")
    if doc:
        sc = doc["scenes"]
        total = doc["meta"]["duration"]
        if total > 40:
            mid = [x for x in sc if x.get("rehook")]
            if not mid:
                warn.append('Belum ada re-hook: tandai satu scene di tengah video dengan "rehook": true dan buka scene itu dengan kalimat pemancing (lihat hook.md).')
            elif not any(.3 * total <= x["start"] <= .7 * total for x in mid):
                warn.append("Re-hook sebaiknya mulai di 30–70% durasi video.")
            if not any(x.get("comment_prompt") for x in sc):
                warn.append('Belum ada ajakan komentar: satu pertanyaan ke penonton sebelum CTA, tandai scene-nya "comment_prompt": true.')
        if not plan.get("metaphor"):
            warn.append('Belum ada metafora visual: isi "metaphor": {"scene": ..., "idea": ...} — satu adegan ilustrasi kiasan (lihat naskah-dan-plan.md).')
        if not plan.get("loop_end"):
            warn.append('Pertimbangkan "loop_end": true — akhir video kembali ke komposisi frame pertama supaya ditonton ulang.')
        if len(sc) > 1 and sc[1]["start"] > 8.5:
            warn.append(f"Scene ke-2 baru mulai di {sc[1]['start']:.1f} dtk — janji hook harus mulai dibayar ≤ 8 dtk.")
    return warn
