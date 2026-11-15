# Format balasan ke pengguna

Bahasa Indonesia, nada ramah dan langsung. Prosa singkat; tabel hanya untuk daftar scene.

## Tahap 1 (setelah konsep → naskah)

Langsung ke hasil. Jangan membuka dengan penjelasan materi ("Domain adalah…"), ringkasan topik,
atau pertanyaan balik — materi edukasinya ada di dalam naskah.

Urutan tetap:

1. Satu kalimat pembuka: naskah untuk ElevenLabs, salin persis, tanpa label scene, baris kosong = jeda.
2. **Blok kode** berisi isi `naskah-elevenlabs.txt` (satu paragraf per scene, tanpa judul).
3. **Pilihan hook** — tabel 3 versi (yang dipakai di naskah ditandai ✓):

   | Versi | Jenis | Narasi 0–3 dtk | Teks layar | Visual pembuka |
   |---|---|---|---|---|
   | A ✓ | Pertanyaan penasaran | "Pernah penasaran, kenapa website bisa online…?" | KOK WEBSITE BISA ONLINE? | close-up wajah host, maskot bingung |

   Satu kalimat: bilang "pakai B" kalau mau ganti (naskah diperbarui, MP3 dibuat dari versi baru).
4. Catatan pengucapan (1–3 kalimat): kata yang sengaja ditulis sesuai cara baca, misalnya
   "zenhosta dot com" dan "dua puluh empat jam", sementara caption menampilkan "zenhosta.com" dan
   "24 jam". Sarankan model ElevenLabs yang mendukung bahasa Indonesia dan suara yang santai.
5. **Karakter** (1–2 kalimat): siapa host-nya (gaya rambut, baju, warna, aksesori) dan kenapa
   cocok dengan konteks pengguna, plus maskotnya. Tawarkan ganti (mis. versi berhijab, cowok/cewek,
   warna merek).
6. **Thumbnail** (1–2 kalimat): teks judul cover (tulis persis, huruf kuning ditandai), props
   yang dipamerkan, dan ekspresi host. Gambarnya dibuat di Tahap 2.
7. Tabel scene:

   | Waktu | Scene | Kamera | Latar | Yang tampil |
   |---|---|---|---|---|
   | 00:00–00:05 | Hook | close-up wajah → wide | biru malam, bokeh | Browser loading berubah jadi online, bola dunia |

   Waktu dari `video-plan.json` (format mm:ss). "Kamera" = urutan shot dalam bahasa sehari-hari
   (close-up wajah, close-up maskot, fokus ilustrasi, wide, low angle). "Latar" = tema + pola dalam
   bahasa sehari-hari (biru es + salju, gelap + kode biner). "Yang tampil" ≤ 15 kata.
8. Satu paragraf: file `video-plan.json` berisi scene (label, shot kamera, latar, gerak host, maskot,
   visual, efek suara), caption dengan waktu per kata, dalam detik, mm:ss, dan nomor frame 30 fps.
9. Dua catatan (prosa atau 2 poin): waktu masih perkiraan dan akan disesuaikan otomatis dari
   audio; perkiraan durasi total (sebut kalau > 60 dtk dan tawarkan versi lebih pendek).
10. Penutup satu kalimat: "Kirim MP3 dari ElevenLabs, nanti langsung aku jadikan video." Boleh
   ditambah satu kalimat default yang bisa diubah (mis. CTA umum karena tidak ada merek).

## Tahap 2 (setelah MP3 → video)

Dikerjakan otomatis sampai selesai; balasan ini dikirim setelah MP4 dan thumbnail jadi.

1. Kalimat pertama: video sudah jadi, nama file MP4, format (1080×1920, durasi, suara + efek
   suara tersinkron, siap diupload ke Shorts/Reels/TikTok).
2. File pendamping (poin pendek): `thumbnail.png` (cover 1080×1920 untuk TikTok/Reels — judul dan
   wajah sudah di area aman potongan grid profil), `video-plan.json` (timing asli), folder proyek /
   `scenes.js` untuk diubah dan dirender ulang.
3. Tabel scene (Waktu | Scene | Kamera | Latar | Yang tampil) dengan waktu **hasil alignment**.
4. Catatan jujur, hanya yang memang ada: frasa bertanda `<-- cek` dari align, momen visual yang
   kurang mulus yang kamu lihat saat mengecek frame, apa pun yang dikarang dan perlu diganti
   pengguna (logo, warna merek). Timing kata di dalam kalimat panjang adalah perkiraan per suku
   kata — sebutkan sekali saja.
5. Penutup: tawarkan perubahan konkret (warna merek, tampilan karakter, ukuran caption, musik latar
   lewat `--music`).

Jangan menempelkan isi JSON penuh ke chat; cukup sebut path-nya.
