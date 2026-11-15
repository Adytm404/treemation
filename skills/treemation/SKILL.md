---
name: treemation
description: Create short vertical 3D educational videos (9:16, Shorts/Reels/TikTok) entirely in code — pixel-skin host character + mascot, dynamic camera, adaptive backgrounds, yellow keyword captions, lip sync, sound effects, thumbnail — in Bahasa Indonesia, synced to an ElevenLabs MP3 narration. Automatic 2-step flow. A topic request ("buat konten edukasi apa itu domain", "bikin video tentang inflasi", "konten tiktok soal cara kerja email") is answered directly with an ElevenLabs script + scene plan, WITHOUT explaining the topic in chat. An MP3 sent afterwards is processed straight into an MP4 video + thumbnail without further questions. Use this skill whenever the user asks for educational content/videos, TikTok/Reels/Shorts content, a voice-over/ElevenLabs script, says "apa itu …"/"jelaskan …" in the context of making content, or sends a narration MP3 — even if they don't say "3D", "video", or "skill".
---

# Treemation — 3D Educational Videos

This skill produces videos like the example in `examples/zenhosta/` ("Kok website bisa online?"):
a pixel-skin host (blocky sandbox-game style character with a pixelated anime face) adapted to the
user's context, the mascot "Byte", a camera that switches shots (face close-up, mascot close-up,
3D illustration focus, wide, low angle), backgrounds whose theme follows the topic, a step label at
the top with a progress bar, a floating 3D stage for props, UI panels that appear exactly when a
word is spoken, big captions (keywords in yellow), and a host whose mouth follows the voice.

All communication with the user is in **Bahasa Indonesia** (scripts, captions, and chat replies).

## Trigger rules (read first — so one sentence from the user is enough)

**A. The user names a topic** — e.g. "buat konten edukasi apa itu domain", "bikin video soal
cara kerja email, CTA ke tokoku.id", "konten tiktok: kenapa harga emas naik".

- That is a request to **make content**, not a question. **Do not explain the topic in chat**,
  do not summarize the material, and do not ask back ("mau durasi berapa?", "target
  penontonnya siapa?", "pakai CTA?").
- Go straight to **Stage 1** with the defaults below, then reply in the Stage 1 format
  (`references/output-format.md`): ready-to-paste ElevenLabs script, character, thumbnail, scene
  table, path to `video-plan.json`. Close with one sentence: "Kirim MP3 dari ElevenLabs, nanti
  langsung aku jadikan video."
- Defaults when not specified: duration ±60–70 s (120–150 words), 2–4 steps depending on the
  topic, character from `karakter.md` (user context → niche → preset `raka`), closing CTA
  "Follow buat konten edukasi lainnya!" (no brand). If the user names a brand/URL, the CTA uses it.
  Every default can be changed afterwards — mention them briefly in the reply, don't ask first.
- If the topic depends on facts that may change (prices, regulations, recent data) and you have
  web access, check first; otherwise write a script that doesn't rely on current figures.

**B. The user sends an MP3** (with or without a message) — run **Stage 2 to completion** without
asking for confirmation: find the project, align, write `scenes.js`, check stills, render,
thumbnail, encode, check the result, then reply in the Stage 2 format.

- Finding the project: `python <skill>/scripts/find_project.py` lists projects and their status.
  Use the project whose `plan.json` exists but has no audio yet (most recent). The MP3 file name
  or a user message naming the topic beats chronological order. Ask one short question only when
  several candidates are equally plausible.
- No project at all → ask the user to paste the text read in ElevenLabs (alignment needs the
  exact text), then build `plan.json` around that text without changing its words, and continue
  with Stage 2.
- Audio duration far from the estimate (> 25 %) or `align.py` flags many phrases with `<-- cek` →
  the text was probably edited in ElevenLabs. Ask for the text used, update the narration in the
  plan, and repeat.
- The only reasons to stop midway: a missing dependency (ask permission once to install it) or an
  error you cannot fix yourself.
- A full render can take a while; run it in the background, make the thumbnail while waiting,
  and post short progress updates when the session supports it.

**C. The user asks for a revision** ("ganti karakternya jadi cewek berhijab", "judul thumbnail
lebih singkat", "warna merek biru") → change `plan.json`/`scenes.js` in the same project. Before
an MP3 exists: resend only the parts of the Stage 1 reply that changed. If the narration changes,
remind the user that the MP3 must be regenerated. After the video is done: re-render only what is
needed (thumbnail only, or the full video).

The chat reply format for both stages is in `references/output-format.md` — follow it exactly.

## Project folder

One video = one folder `video-<short-topic>/` (lowercase, hyphens, e.g. `video-apa-itu-domain`)
in the working directory. Create it in Stage 1 and set it up once:

```bash
python <skill>/scripts/setup_project.py video-<topic>
```

This copies the engine (`index.html`, `engine.js`, `pixelchar.js`), installs three.js + fonts +
icons via npm, creates `icons.js`, and checks ffmpeg/numpy/playwright. If a line starts with
`PERLU:`, install what it names first (ask the user's permission before installing anything on
their system).

Folder contents when done: `plan.json` (you write it), `scenes.js` (you write it), `narasi.mp3`,
`naskah-elevenlabs.txt`, `video-plan.json`, `timeline.js/json`, `frames/`, `previews/`, `video.mp4`.

## Stage 1 — concept → script + scene plan

1. Read `references/naskah-dan-plan.md` (how to write the script, the `plan.json` schema, the
   list of poses, expressions, mascot actions, and sound effects).
2. Choose the host character from the user's context (read `references/karakter.md`) and write it
   to `characters` in plan.json. Run `python <skill>/scripts/preview_characters.py <project> --plan`
   and look at the result; include `previews/karakter.png` in the reply when possible.
3. Read `references/hook.md`. Write 3 hook versions (different types), and pick the strongest for
   the first narration sentence + `hook` in plan.json (big on-screen text, alternatives). Scene 1
   must satisfy the three-layer rule: a strong shot at `@start`, a sound effect on the first word,
   no greeting/intro.
4. Write `plan.json`: 6–9 scenes following hook → intro (number of points) → steps 1..n → recap →
   CTA, plus `thumbnail` (cover title, props to show, host expression) — see the "Thumbnail"
   section. Plan each scene's `shots` and `background` at the same time (sections "Shot kamera"
   and "Latar adaptif"). Aim for 120–150 words total (≈ 60–70 seconds in ElevenLabs).
5. Run `python <skill>/scripts/plan_timing.py <project>` → creates `video-plan.json` (estimated
   timing) and `naskah-elevenlabs.txt`. Check the output: every trigger word must be found and it
   must print **"Cek hook: OK"** — fix every ⚠ warning and run it again.
6. Reply to the user in the Stage 1 format from `references/output-format.md`: ready-to-paste
   script block, pronunciation notes, scene table with minutes, and the `video-plan.json` path.
   Ask for the MP3.

## Stage 2 — MP3 → video

1. Save the audio as `<project>/narasi.mp3`.
2. Make sure the narration in `plan.json` is **exactly** what was read (the user may have edited
   the script in ElevenLabs — ask if unsure, or check the duration: a big gap from the estimate
   means the text differs).
3. `python <skill>/scripts/align.py <project>` → synced `timeline.js`, `timeline.json`,
   `video-plan.json`. Look at the phrase list: lines marked `<-- cek` have suspicious durations,
   usually because the text differs from the audio or ElevenLabs paused somewhere unexpected.
   Fix the text in the plan if needed and run it again.
4. Read `references/engine-api.md`, then write `<project>/scenes.js`. Start by copying the
   patterns in `examples/zenhosta/scenes.js`. All times use `T(sceneId, 'word')`, never raw
   seconds — so everything stays in sync if the audio is replaced.
5. **Visual check before the full render**:
   `python <skill>/scripts/render.py <project> --stills <3–4 seconds per scene>`
   then **look** at the images in `<project>/previews/`. Take at least one still per shot. Check:
   panels don't cover the host's face, nothing is cut off at the edges, captions are readable,
   props appear on the stage, no page errors. Fix and repeat until clean. This is the most
   important step for quality.
   To check motion (characters stepping aside, background transitions, camera cuts), render a
   short clip with sound: `python <skill>/scripts/render.py <project> --clip 10 18` →
   `previews/clip_10-18.mp4`.
6. Full render: `python <skill>/scripts/render.py <project>` (resumable if interrupted;
   `--workers N` for many-core CPUs). Roughly 0.3–0.6 s per frame per worker.
   Run it in the background and monitor progress if it takes long.
7. Thumbnail: `python <skill>/scripts/thumbnail.py <project>` → `<project>/thumbnail.png`
   (1080×1920 cover) and `previews/thumbnail-cek.png` (safe-area guides). **Look** at the check
   image: title and host face inside the red box, title not covering the face, props visible.
   Adjust `props_from`, `stage`, or `title_y` and repeat. Can be done while the full render runs.
8. `python <skill>/scripts/encode.py <project> <name>.mp4` → sound effects are generated
   automatically, mixed quietly under the narration, then encoded to a 1080×1920 30 fps
   H.264 + AAC MP4. Options: `--no-sfx`, `--music file.mp3`.
9. Check a few frames of the final MP4 (ffmpeg `-ss <seconds> -frames:v 1`), then reply in the
   Stage 2 format from `references/output-format.md`.

## Principles

- **Sync first, pretty second.** Every visual appears on the word that explains it. A panel that
  appears before its word is spoken feels wrong.
- **Hook before content.** The first 3 seconds decide whether the video gets watched: hook
  sentence ≤ 14 words with no greeting, big on-screen text that doesn't copy the narration,
  characters/props moving from the first frame, and the promise starts being answered before
  second 8 (`references/hook.md`).
- **A living camera, not a static one.** Every scene has at least 2 shots (`host_close`,
  `host_medium`, `mascot_close`, `illustration`, `wide`, `low_angle`) with a cut or move on the
  right word — close-ups for hook/punchline/CTA, `illustration` while props are discussed (the
  characters disappear or slide out of frame first, then return), `mascot_close` for reactions.
  UI panels must stay inside the active shot's safe zone.
- **Backgrounds follow the topic.** Each scene (or key word) has a `background`: color theme,
  particle pattern, and motif icons that match the content — cold uses icy blue + snow, servers
  use binary code, the CTA uses warm/brand colors. A static single-color background for the whole
  video feels boring.
- **The mouth follows vowels.** Lip sync uses 5 mouth shapes A, I, U, E, O following each word's
  vowel order — "aku mau makan" → A U A U A A — and closes on pauses. Foreign words are read by
  their pronunciation via `pronunciation` (`references/karakter.md`).
- **Characters never block the camera.** When focusing on an illustration, characters either
  vanish instantly (`hide`, for cuts) or slide straight out to the side before the camera moves
  (`slide`, for moves) — no turning around, no walking in front of the camera. For variety (only
  when needed) a character may pop in from below, the side, or above via `enter`.
- **One idea per moment.** The top area (y 230–900 px) holds one main thing at a time: a UI panel
  *or* a large 3D prop. Clear the previous scene's elements.
- **Context-fitting yet original characters.** The pixel-skin host is built from a spec (preset +
  hair style, outfit, colors, accessories, hijab) chosen from the user's description, brand, and
  niche. Don't copy skins/characters from other creators, game characters, or brand mascots —
  from reference images, take the style only.
- **Accurate facts.** Educational scripts must be correct; example numbers use documentation
  ranges (e.g. IP `203.0.113.x`) or clear labels. Never invent statistics.
- **Honest CTA.** State the user's brand/URL as given, without claims they didn't provide
  (prices, promos, "the best", fake deadlines).
- **Never flash more than 3× per second** (safe for photosensitive viewers).
- If something can't be built (e.g. a style that needs complex 3D models), say so and offer the
  closest voxel version.

## Files in this skill

- `scripts/setup_project.py` — set up a project.
- `scripts/find_project.py` — list video projects + status (waiting for MP3 / ready to render / done).
- `scripts/plan_timing.py` — Stage 1: estimated timing + ElevenLabs text.
- `scripts/align.py` — Stage 2: sync to the audio (ffmpeg + numpy, no AI model).
- `scripts/render.py` — preview stills / render all frames (Playwright Chromium).
- `scripts/encode.py` — sound effects, mix, MP4.
- `scripts/thumbnail.py` — TikTok/Reels cover + safe-area check image.
- `scripts/preview_characters.py` — render all character presets, or the host from plan.json (full body + close-up).
- `scripts/plan_lib.py` — shared by the other scripts.
- `assets/engine/` — `index.html`, `engine.js`, `pixelchar.js` (don't edit per video; change things through `plan.json`/`scenes.js`).
- `references/karakter.md` — pixel-skin style, presets, spec fields, choosing from context.
- `references/hook.md` — TikTok hook research: three layers, 10 hook types + examples, 0–8 s structure, don'ts.
- `examples/zenhosta/` — complete `plan.json` + `scenes.js` for one 69-second video.
- `references/naskah-dan-plan.md` — writing the script and `plan.json`.
- `references/engine-api.md` — API for `scenes.js`, layout, components, props.
- `references/output-format.md` — chat reply format for Stage 1 and Stage 2.

The reference files are written in Bahasa Indonesia; "Tahap 1" and "Tahap 2" in them mean
Stage 1 and Stage 2.
