# Hook: 3 detik pertama

Ringkasan riset hook TikTok/Reels/Shorts (Nov 2026), diterapkan ke video edukasi animasi 3D ini.
Panduan resmi TikTok cukup umum; angka spesifik kebanyakan dari blog marketing/alat analitik —
pakai sebagai patokan arah, bukan janji hasil.

## Yang perlu diingat

- **Hook terjadi di 0–3 dtk, paling lambat 6 dtk.** TikTok for Business menyarankan hook di 6 detik
  pertama dengan rasa penasaran, kejutan, atau emosi, dan tema konten jelas di 3–6 detik pertama.
  Blog analitik menyebut penonton memutuskan lanjut/scroll dalam ±1,5–2 dtk.
- **Tiga lapis sekaligus**: visual (frame pertama), ucapan (kalimat pertama), teks layar. Ketiganya
  menunjuk ke pertanyaan/janji yang sama, tapi **teks layar ≠ salinan narasi**.
- **Bergerak sejak frame pertama.** Teks layar + gerakan di 2 detik pertama dilaporkan menaikkan
  retensi 3 detik dibanding pembuka statis. Caption yang berganti 2–3× di 3 dtk pertama lebih baik
  daripada satu caption diam.
- **Karakter membantu**: konten dengan karakter (animasi atau orang) memberi dampak lebih kuat.
- **Hook = kontrak.** Janji harus mulai dibayar di detik 4–8 dan selesai dijawab di video. Klikbait
  yang tidak dibayar merusak retensi.
- **Ukur**: TikTok Analytics → Content → video → Retention curve; lihat persentase di detik 3.
  Patokan kasar: ≥ 50% berfungsi, ≥ 60% kuat.

## Tiga lapis di engine ini

| Lapis | Aturan | Implementasi |
|---|---|---|
| Visual (0–0,5 dtk) | Tanpa layar hitam/logo/intro; mulai di tengah aksi | Shot pertama `@start` = `host_close`, `mascot_close`, `low_angle`, atau `illustration`; maskot sudah bereaksi; latar bertema topik; efek suara di kata pertama |
| Ucapan (0,2–2,5 dtk) | Satu kalimat, ≤ 12–14 kata, langsung ke inti | Kalimat pertama narasi scene 1 |
| Teks layar (0 → akhir hook) | ≤ 7 kata, kata kunci topik (TikTok mengindeks teks layar), 1–2 kata kuning | `hook.text` di plan.json → teks besar di atas layar, lalu mengecil jadi label atas |

## Jenis hook (contoh topik: "apa itu domain")

| Jenis (`type`) | Pemicu | Narasi | Teks layar | Visual 3D 0–2 dtk |
|---|---|---|---|---|
| `pertanyaan_penasaran` | ingin tahu | "Pernah kepikiran, kenapa ketik nama website langsung kebuka?" | NAMA → *ALAMAT?* | `host_close` menatap kamera, maskot mata `question` |
| `salah_kaprah` | ingin benar | "Banyak yang ngira domain itu sama dengan website. Padahal beda." | DOMAIN *≠* WEBSITE | cut `mascot_close` kaget (`wow`), silang merah |
| `apa_jadinya_kalau` | imajinasi | "Gimana jadinya kalau internet nggak punya domain?" | TANPA *DOMAIN?!* | `illustration`: angka IP berjatuhan, maskot `dizzy` |
| `analogi` | mudah dipahami | "Domain itu alamat rumah… tapi buat website." | ALAMAT *RUMAH* WEBSITE | `illustration`: rumah voxel + papan nama |
| `angka_daftar` | janji jelas | "Cuma butuh 3 hal biar website kamu online." | *3 HAL* WAJIB | kartu muncul berurutan + `pop_x3` |
| `masalah` | relate | "Website kamu susah diingat orang? Masalahnya bisa di sini." | SUSAH *DIINGAT?* | host `scratch`, latar berganti |
| `hasil_dulu` | ingin tahu proses | "Ini yang terjadi sedetik setelah kamu tekan Enter." | 1 DETIK DI *INTERNET* | `low_angle`/kamera melesat ke data center |
| `kuis` | ikut terlibat | "Coba tebak: .com, .id, atau .co.id — mana yang cocok buat bisnismu?" | *TEBAK* DULU! | 3 papan di panggung, maskot menunjuk |
| `pattern_interrupt` | kaget | (0,3 dtk efek "duar") "Ini rumah website kamu." | WEBSITE *TINGGAL* DI SINI | `low_angle`, prop jatuh dari atas + `boing`/`rise_hum` |
| `pov` | membayangkan diri | "POV: kamu baru beli domain pertamamu." | POV: *DOMAIN* PERTAMA | host `hold`, confetti |

Format "apa jadinya kalau" sedang sangat populer untuk animasi edukasi faceless; `analogi` dan
`salah_kaprah` paling aman untuk topik teknis; `angka_daftar` cocok saat isi video memang daftar.

## Struktur 0–8 dtk

| Waktu | Isi | Engine |
|---|---|---|
| 0,0–0,5 | Frame pertama sudah bergerak, teks hook tampil | `hook.text`, shot kuat `@start`, sfx kata pertama |
| 0,5–2,5 | Kalimat hook selesai; caption berganti 2–3×; maskot bereaksi | caption ≤ 3 kata/potong, `mascot.changes` |
| 2,5–3,5 | Teks hook mengecil jadi label; janji dinyatakan | `hook.until` |
| 3,5–8 | Bayar janji: jawaban/visual pertama tampil | scene 2 mulai ≤ 8 dtk, cut ke `illustration`/panel |
| > 8 | Ganti shot/visual tiap 3–6 dtk | `shots` |

## Pembunuh hook

| Hindari | Ganti dengan |
|---|---|
| "Halo guys", "Di video ini…", salam, logo | Kalimat hook sebagai kata pertama |
| Frame pertama diam/kosong | Karakter + props sudah bergerak di frame 0 |
| Teks layar = narasi persis | Teks = inti/pertanyaan, narasi = kalimat lengkap |
| Hook > 3 dtk / > 14 kata | Potong; detail pindah ke scene 2 |
| Janji tidak dibayar | Hook yang dijawab di video |
| Suara datar vs visual heboh | Tanda tanya/seru di naskah, suara ElevenLabs energik |
| Angka mengejutkan karangan | Fakta yang bisa dicek, atau jenis hook lain |
| Panel UI menutupi teks hook | Panel scene 1 muncul setelah `hookEnd()` |

## Cara kerja di Tahap 1

1. Tulis **3 versi hook** dengan jenis berbeda yang cocok untuk topik (lapis ucapan, teks, visual).
2. Pilih yang terkuat: paling spesifik, paling visual di 3D, dan dijawab tuntas di video.
   Pakai sebagai kalimat pertama narasi scene 1 dan `hook.text`; simpan dua lainnya di
   `hook.alternatives` (`type`, `narration`, `text`, `visual`).
3. `plan_timing.py` menjalankan **cek hook** otomatis (sapaan, panjang kalimat, teks = narasi,
   shot pertama, efek suara, scene 2 ≤ 8 dtk). Perbaiki semua peringatan sebelum membalas.
4. Judul thumbnail sejalan dengan hook (janji yang sama), tidak harus kata yang sama.

Kalau pengguna memilih versi lain ("pakai hook B"), ganti kalimat pertama narasi + `hook.text`
+ shot/sfx scene 1, jalankan ulang `plan_timing.py`, kirim ulang naskah (MP3 harus dibuat ulang).

## Sumber

- TikTok for Business — Creative best practices (hook dalam 6 dtk; suspense, surprise, emotion):
  ads.tiktok.com/help/article/creative-best-practices
- TikTok Creative Center — Creative Tips (tema jelas di 3–6 dtk pertama)
- NestScale — hook rate TikTok & Reels 2026 (teks + gerakan di 2 dtk pertama; karakter)
- Autoclip — anatomi klip viral (pergantian caption di 3 dtk pertama)
- SociaVault — kurva retensi iklan TikTok (patokan retensi detik 3; detik 4–8 bayar janji)
- socialk.it, tlinky.com, Coach Alyssa — tiga lapis hook; teks ≠ narasi
