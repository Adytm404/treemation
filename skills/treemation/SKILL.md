---
name: treemation
description: Buat video edukasi pendek 3D vertikal (9:16, Shorts/Reels/TikTok) sepenuhnya dengan code — host karakter pixel-skin + maskot, kamera dinamis, latar adaptif, caption kuning, lip sync, efek suara, thumbnail — berbahasa Indonesia, disinkronkan ke narasi MP3 ElevenLabs. Alur 2 langkah otomatis. Permintaan topik ("buat konten edukasi apa itu domain", "bikin video tentang inflasi", "konten tiktok soal cara kerja email") langsung dijawab dengan naskah ElevenLabs + rencana scene, TANPA menjelaskan topiknya di chat. File MP3 yang dikirim sesudahnya langsung diproses jadi video MP4 + thumbnail tanpa bertanya lagi. Gunakan skill ini setiap kali pengguna minta konten/video edukasi, konten TikTok/Reels/Shorts, naskah voice over/ElevenLabs, menyebut "apa itu …"/"jelaskan …" dalam konteks membuat konten, atau mengirim MP3 narasi — walaupun tidak menyebut "3D", "video", atau "skill".
---

# Video Edukasi 3D

Skill ini menghasilkan video seperti contoh di `examples/zenhosta/` ("Kok website bisa online?"):
host bergaya pixel-skin (karakter blok ala game sandbox, wajah anime berpiksel) yang disesuaikan
dengan konteks pengguna, maskot "Byte", kamera yang berganti shot (close-up wajah, close-up
maskot, fokus ke ilustrasi 3D, wide, low angle), latar yang berganti tema sesuai topik, label langkah di atas
dengan garis progres, panggung 3D melayang untuk props, panel UI yang muncul tepat saat kata
diucapkan, caption besar (kuning untuk kata kunci), dan mulut host bergerak mengikuti suara.

Semua komunikasi dengan pengguna dalam **bahasa Indonesia**.

## Aturan pemicu (baca dulu — supaya cukup satu kalimat dari pengguna)

**A. Pengguna menyebut topik** — contoh: "buat konten edukasi apa itu domain", "bikin video soal
cara kerja email, CTA ke tokoku.id", "konten tiktok: kenapa harga emas naik".

- Itu permintaan **membuat konten**, bukan pertanyaan. **Jangan menjelaskan topiknya di chat**,
  jangan memberi ringkasan materi, jangan bertanya balik ("mau durasi berapa?", "target
  penontonnya siapa?", "pakai CTA?").
- Langsung kerjakan **Tahap 1** dengan default di bawah, lalu balas dengan format Tahap 1
  (`references/output-format.md`): naskah siap tempel ElevenLabs, karakter, thumbnail, tabel scene,
  path `video-plan.json`. Penutupnya satu kalimat: "Kirim MP3 dari ElevenLabs, nanti langsung aku
  jadikan video."
- Default kalau tidak disebut: durasi ±60–70 dtk (120–150 kata), 2–4 langkah sesuai topik,
  karakter dari `karakter.md` (konteks pengguna → niche → preset `raka`), CTA penutup
  "Follow buat konten edukasi lainnya!" (tanpa merek). Kalau pengguna menyebut merek/URL, CTA
  memakai itu. Semua default bisa diubah setelahnya — sebut singkat di balasan, jangan tanya dulu.
- Kalau topik butuh fakta yang mungkin berubah (harga, aturan, data terbaru) dan kamu punya akses
  web, cek dulu; kalau tidak, tulis naskah yang tidak bergantung pada angka terkini.

**B. Pengguna mengirim MP3** (dengan atau tanpa pesan) — langsung kerjakan **Tahap 2 sampai
selesai** tanpa minta konfirmasi: cari proyeknya, alignment, `scenes.js`, cek stills, render,
thumbnail, encode, cek hasil, lalu balas dengan format Tahap 2.

- Mencari proyek: `python <skill>/scripts/find_project.py` menampilkan proyek beserta statusnya.
  Pakai proyek yang `plan.json`-nya sudah ada tapi belum punya audio (paling baru). Nama file MP3
  atau pesan pengguna yang menyebut topik mengalahkan urutan waktu. Tanya satu pertanyaan singkat
  hanya kalau ada beberapa kandidat yang sama-sama masuk akal.
- Tidak ada proyek sama sekali → minta pengguna menempelkan teks yang dibacakan di ElevenLabs
  (alignment butuh teks yang sama persis), lalu susun `plan.json` di sekitar teks itu tanpa
  mengubah kata-katanya, dan lanjut Tahap 2.
- Durasi audio jauh dari perkiraan (> 25 %) atau `align.py` menandai banyak frasa `<-- cek` →
  kemungkinan teks diubah di ElevenLabs. Minta teks yang dipakai, perbarui narasi di plan, ulangi.
- Satu-satunya alasan berhenti di tengah: dependensi belum terpasang (minta izin sekali untuk
  memasang) atau error yang tidak bisa diperbaiki sendiri.
- Render penuh bisa lama; jalankan di latar belakang, kerjakan thumbnail sambil menunggu, dan
  beri kabar progres singkat bila sesi mendukung.

**C. Pengguna minta revisi** ("ganti karakternya jadi cewek berhijab", "judul thumbnail lebih
singkat", "warna merek biru") → ubah `plan.json`/`scenes.js` di proyek yang sama. Sebelum ada MP3:
kirim ulang bagian Tahap 1 yang berubah saja. Kalau narasi berubah, ingatkan bahwa MP3 harus
dibuat ulang. Setelah video jadi: render ulang yang perlu (thumbnail saja, atau video penuh).

Format balasan di chat untuk kedua tahap ada di `references/output-format.md` — ikuti persis.

## Folder proyek

Satu video = satu folder `video-<topik-singkat>/` (huruf kecil, tanda hubung, mis.
`video-apa-itu-domain`) di direktori kerja. Buat di Tahap 1 dan siapkan sekali:

```bash
python <skill>/scripts/setup_project.py video-<topik>
```

Ini menyalin engine (`index.html`, `engine.js`), memasang three.js + font + ikon lewat npm,
membuat `icons.js`, dan memeriksa ffmpeg/numpy/playwright. Kalau ada baris `PERLU:`, pasang dulu
yang disebutkan (minta izin pengguna sebelum menginstal apa pun di sistemnya).

Isi folder setelah selesai: `plan.json` (kamu tulis), `scenes.js` (kamu tulis), `narasi.mp3`,
`naskah-elevenlabs.txt`, `video-plan.json`, `timeline.js/json`, `frames/`, `previews/`, `video.mp4`.

## Tahap 1 — konsep → naskah + rencana scene

1. Baca `references/naskah-dan-plan.md` (cara menulis naskah, skema `plan.json`, daftar pose,
   ekspresi, aksi maskot, efek suara).
2. Tentukan karakter host dari konteks pengguna (baca `references/karakter.md`) dan tulis di
   `characters` plan.json. Jalankan `python <skill>/scripts/preview_characters.py <proyek> --plan`
   dan lihat hasilnya; sertakan gambar `previews/karakter.png` di balasan bila bisa.
3. Baca `references/hook.md`. Tulis 3 versi hook (jenis berbeda), pilih yang terkuat untuk kalimat
   pertama narasi + `hook` di plan.json (teks besar layar, alternatif). Scene 1 harus memenuhi aturan
   tiga lapis: shot kuat di `@start`, efek suara di kata pertama, tanpa sapaan/intro.
4. Tulis `plan.json`: 6–9 scene dengan pola hook → pengantar (jumlah poin) → langkah 1..n → rangkuman → CTA,
   plus `thumbnail` (judul cover, props yang dipamerkan, ekspresi host) — lihat bagian "Thumbnail".
   Rencanakan `shots` dan `background` tiap scene sekalian (bagian "Shot kamera" dan "Latar adaptif").
   Targetkan 120–150 kata total (≈ 60–70 detik di ElevenLabs).
5. Jalankan `python <skill>/scripts/plan_timing.py <proyek>` → membuat `video-plan.json` (timing
   perkiraan) dan `naskah-elevenlabs.txt`. Periksa keluarannya: semua kata pemicu harus ketemu dan
   **"Cek hook: OK"** — perbaiki setiap peringatan ⚠ lalu jalankan ulang.
6. Balas pengguna dengan format Tahap 1 di `references/output-format.md`: blok naskah siap tempel,
   catatan pengucapan, tabel scene + menit, dan path `video-plan.json`. Minta MP3-nya.

## Tahap 2 — MP3 → video

1. Simpan audio sebagai `<proyek>/narasi.mp3`.
2. Pastikan narasi di `plan.json` **sama persis** dengan yang dibacakan (pengguna mungkin mengubah
   naskah di ElevenLabs — tanyakan kalau ragu, atau dengarkan durasinya: selisih besar dari
   perkiraan adalah tanda teksnya beda).
3. `python <skill>/scripts/align.py <proyek>` → `timeline.js`, `timeline.json`, `video-plan.json`
   tersinkron. Lihat daftar frasa: baris bertanda `<-- cek` artinya durasinya janggal; biasanya
   karena teks beda dengan audio atau ElevenLabs berhenti di tempat tak terduga. Perbaiki teks di
   plan bila perlu dan jalankan ulang.
4. Baca `references/engine-api.md`, lalu tulis `<proyek>/scenes.js`. Mulai dengan menyalin pola dari
   `examples/zenhosta/scenes.js`. Semua waktu memakai `T(sceneId, 'kata')`, jangan angka detik
   mentah — supaya tetap sinkron kalau audio diganti.
5. **Cek visual sebelum render penuh**:
   `python <skill>/scripts/render.py <proyek> --stills <3–4 detik per scene>`
   lalu **lihat** gambar di `<proyek>/previews/`. Ambil minimal satu still per shot. Periksa: panel tidak menutupi wajah host,
   tidak ada yang terpotong di tepi, caption terbaca, props muncul di panggung, tidak ada error
   halaman. Perbaiki dan ulangi sampai rapi. Ini langkah paling penting untuk kualitas.
   Untuk mengecek gerakan (karakter minggir, transisi latar, cut kamera), render klip pendek
   bersuara: `python <skill>/scripts/render.py <proyek> --clip 10 18` → `previews/clip_10-18.mp4`.
6. Render penuh: `python <skill>/scripts/render.py <proyek>` (bisa dilanjut kalau terputus;
   `--workers N` untuk CPU banyak core). Kira-kira 0,3–0,6 detik per frame per worker.
   Jalankan di latar belakang dan pantau progresnya kalau lama.
7. Thumbnail: `python <skill>/scripts/thumbnail.py <proyek>` → `<proyek>/thumbnail.png` (cover
   1080×1920) dan `previews/thumbnail-cek.png` (garis area aman). **Lihat** cek-nya: judul dan
   wajah host di dalam kotak merah, judul tidak menutupi wajah, props terlihat. Atur `props_from`,
   `stage`, atau `title_y` lalu ulangi. Bisa dikerjakan sambil render penuh berjalan.
8. `python <skill>/scripts/encode.py <proyek> <nama>.mp4` → efek suara dibuat otomatis, dimix
   pelan di bawah narasi, lalu MP4 1080×1920 30fps H.264 + AAC. Opsi: `--no-sfx`, `--music file.mp3`.
9. Cek beberapa frame dari MP4 akhir (ffmpeg `-ss <detik> -frames:v 1`), lalu balas dengan
   format Tahap 2 di `references/output-format.md`.

## Prinsip

- **Sinkron dulu, cantik kemudian.** Setiap visual muncul pada kata yang menjelaskannya. Sebuah
  panel yang muncul sebelum kata diucapkan terasa salah.
- **Hook dulu, baru materi.** 3 detik pertama menentukan apakah video ditonton: kalimat hook ≤ 14
  kata tanpa sapaan, teks besar di layar yang tidak menyalin narasi, karakter/props bergerak sejak
  frame pertama, dan janjinya mulai dijawab sebelum detik 8 (`references/hook.md`).
- **Kamera hidup, bukan statis.** Setiap scene minimal 2 shot (`host_close`, `host_medium`,
  `mascot_close`, `illustration`, `wide`, `low_angle`) dengan cut atau move di kata yang tepat —
  close-up untuk hook/punchline/CTA, `illustration` saat props dibahas (karakter otomatis minggir
  dulu, lalu kembali), `mascot_close` untuk reaksi.
  Panel UI harus berada di zona aman shot yang sedang aktif.
- **Latar ikut topik.** Tiap scene (atau kata penting) punya `background`: tema warna, pola
  partikel, dan ikon motif yang sesuai isi — dingin pakai salju biru es, server pakai kode biner,
  CTA pakai warna hangat/merek. Latar statis satu warna sepanjang video terasa membosankan.
- **Mulut mengikuti vokal.** Lip sync memakai 4 bentuk mulut A, I, E, O (u = O) sesuai urutan vokal
  tiap kata — "aku mau makan" → A O A O A A — dan tertutup saat jeda. Kata asing dibaca sesuai
  ucapannya lewat `pronunciation` (`references/karakter.md`).
- **Satu ide per momen.** Area atas (y 230–900 px) memuat satu hal utama sekaligus: panel UI
  *atau* prop 3D besar. Bersihkan elemen scene sebelumnya.
- **Karakter sesuai konteks, tetap orisinal.** Host pixel-skin dibangun dari spec (preset + gaya
  rambut, baju, warna, aksesori, hijab) yang dipilih dari deskripsi pengguna, merek, dan niche.
  Jangan meniru skin/karakter milik kreator lain, karakter game, atau maskot merek — dari gambar
  referensi ambil gayanya saja.
- **Fakta benar.** Naskah edukasi harus akurat; angka contoh pakai rentang dokumentasi (mis. IP
  `203.0.113.x`) atau label yang jelas. Jangan mengarang statistik.
- **CTA jujur.** Sebut merek/URL dari pengguna apa adanya, tanpa klaim yang tidak dia berikan
  (harga, promo, "terbaik", tenggat palsu).
- **Jangan berkedip lebih dari 3× per detik** (aman untuk penonton fotosensitif).
- Kalau sesuatu tidak bisa dibuat (mis. gaya yang butuh model 3D kompleks), katakan dan tawarkan
  versi voxel terdekat.

## File di skill ini

- `scripts/setup_project.py` — siapkan proyek.
- `scripts/find_project.py` — daftar proyek video + status (menunggu MP3 / siap render / selesai).
- `scripts/plan_timing.py` — Tahap 1: timing perkiraan + teks ElevenLabs.
- `scripts/align.py` — Tahap 2: sinkron ke audio (ffmpeg + numpy, tanpa model AI).
- `scripts/render.py` — preview stills / render semua frame (Playwright Chromium).
- `scripts/encode.py` — efek suara, mix, MP4.
- `scripts/thumbnail.py` — cover TikTok/Reels + gambar cek area aman.
- `scripts/preview_characters.py` — gambar semua preset karakter, atau host dari plan.json (badan + close-up).
- `scripts/plan_lib.py` — dipakai skrip lain.
- `assets/engine/` — `index.html`, `engine.js`, `pixelchar.js` (jangan diedit per video; ubah lewat `plan.json`/`scenes.js`).
- `references/karakter.md` — gaya pixel-skin, preset, field spec, cara memilih dari konteks.
- `references/hook.md` — riset hook TikTok: tiga lapis, 10 jenis hook + contoh, struktur 0–8 dtk, larangan.
- `examples/zenhosta/` — `plan.json` + `scenes.js` lengkap untuk satu video 69 detik.
- `references/naskah-dan-plan.md` — menulis naskah dan `plan.json`.
- `references/engine-api.md` — API untuk `scenes.js`, tata letak, komponen, props.
- `references/output-format.md` — format balasan chat Tahap 1 dan Tahap 2.
