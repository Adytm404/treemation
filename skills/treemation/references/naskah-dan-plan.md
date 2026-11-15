# Menulis naskah dan plan.json

## Struktur naskah (pola yang terbukti)

| Scene | Fungsi | Panjang |
|---|---|---|
| Hook | Salah satu jenis di `hook.md` (pertanyaan, salah kaprah, apa jadinya kalau, analogi, …) | 1 kalimat, ≤ 14 kata, tanpa sapaan |
| Pengantar | Sebut jumlah poin ("ada empat hal penting") + ajakan "Yuk, kita bahas!" | ±10 kata |
| Langkah 1..n | "Pertama, X. X itu ... contohnya ..." — satu konsep, satu analogi, satu contoh | 20–28 kata |
| Rangkuman | "Jadi, saat kamu ..., lalu ..." — alur sebab-akibat semua poin | ±20 kata |
| CTA | Pertanyaan + ajakan ke merek/URL pengguna | ±12 kata |

Total 120–150 kata ≈ 60–70 detik (ElevenLabs bahasa Indonesia terukur ±5 suku kata/detik).
Lebih dari 4 langkah membuat video terlalu panjang; gabungkan atau buat seri.

## Gaya bahasa

- Santai, sapaan "kamu", kata sehari-hari ("aja", "nggak", "kan?"). Kalimat pendek.
- Buka tiap langkah dengan penanda urutan: Pertama, Kedua, Ketiga, Terakhir.
- Satu analogi konkret per konsep (domain = alamat rumah, server = komputer yang selalu nyala).
- Akurat. Kalau ragu soal fakta, sederhanakan tanpa membuatnya salah.

## Tulis sesuai cara baca (untuk ElevenLabs)

Narasi di plan ditulis **persis seperti diucapkan**; tampilan di layar diatur lewat `phrases`.

| Diucapkan (narasi) | Tampil di caption | Entri `phrases` |
|---|---|---|
| zenhosta dot com | zenhosta.com | `["zenhosta dot com", "zenhosta.com"]` |
| dua puluh empat jam | 24 jam | `["dua puluh empat jam", "24 jam"]` |
| data center | data center | `["data center", "data center"]` (supaya jadi satu caption) |

Angka selalu ditulis dengan huruf di narasi. Singkatan yang dieja: "D N S", "I P". Tanda baca
menentukan jeda: koma = jeda pendek, titik/tanya/seru = jeda panjang. Alignment memakai jeda ini,
jadi beri tanda baca yang wajar. Hindari tanda kurung, emoji, dan simbol di narasi.

## Skema plan.json

```json
{
  "title": "Judul video",
  "fps": 30,
  "tail_hold": 1.0,
  "phrases": [["zenhosta dot com", "zenhosta.com"]],
  "keywords": ["domain", "server", "zenhosta.com"],
  "syllable_overrides": {"zenhosta": 3},
  "pronunciation": {"cloudflare": "klaudfler"},
  "hook": {"type": "pertanyaan_penasaran", "text": ["Kok website", "bisa *online?*"], "until": "online",
           "alternatives": [{"type": "apa_jadinya_kalau", "narration": "…", "text": ["…"], "visual": "…"}]},
  "characters": {"host": {"spec": {"preset": "raka"}, "look": "deskripsi"}, "mascot": {"name": "Byte", "look": "deskripsi"}},
  "scenes": [
    {
      "id": "s1_hook",
      "label": ["KOK BISA", "ONLINE?"],
      "step": null,
      "dashes_from": null,
      "narration": "Pernah penasaran, kenapa website bisa online dan dibuka dari mana aja?",
      "camera": "deskripsi singkat komposisi (untuk dokumentasi)",
      "shots": [["@start", "host_close", "cut"], ["dari", "wide", "move"]],
      "background": {"theme": "ocean", "pattern": "bubbles", "motif": ["house", "map-pin", "link"]},
      "host": {"pose": "idle", "expression": "curious",
               "gestures": [["Pernah", "scratch", "curious"], ["online", "point_up", "happy"]]},
      "mascot": {"action": "tilt", "eyes": "question",
                 "changes": [["online", "bounce", "happy"]]},
      "visuals": [
        {"type": "browser", "content": "Jendela browser dengan spinner", "trigger": "website"},
        {"type": "chips", "content": ["A|ikon", "B|ikon"], "triggers": ["kataA", "kataB"]}
      ],
      "sfx": [["website", "whoosh_in"], ["online", "ding"]]
    }
  ]
}
```

Aturan:

- `pronunciation`: cara baca kata asing untuk lip sync vokal (lihat `karakter.md` → "Lip sync
  vokal"). Isi untuk merek/istilah asing yang ejaannya beda dengan ucapan.
- `hook`: `text` = 1–2 baris teks besar (≤ 7 kata, `*kata*` kuning) yang tampil dari frame 0 lalu
  mengecil jadi label; `until` = kata di scene 1 saat teks hook selesai (default akhir kalimat
  pertama, maks 3,5 dtk); `y` (default 300) dan `size` (default 120 px) opsional; `alternatives` =
  2 versi hook lain untuk ditawarkan. Detail di `hook.md`.
- `characters.host.spec`: lihat `karakter.md` (preset, gaya rambut, baju, warna, aksesori).
- `id` unik, pola `s<n>_<nama>`. Urutan array = urutan video.
- `label`: `[bagian putih, bagian kuning]`, HURUF BESAR, pendek (maks ±22 karakter total).
  Langkah: `["LANGKAH 1 ·", "DOMAIN"]`.
- `step`: jumlah garis progres yang menyala (`null` = sembunyikan). Jumlah garis total = step
  terbesar. Pengantar biasanya `0` + `"dashes_from": "bahas"` supaya garis muncul saat kata itu.
- `keywords`: kata/frasa (bentuk tampilan, huruf kecil) yang caption-nya kuning dan berdiri sendiri.
  Pilih 8–14: istilah inti, merek, angka penting. Terlalu banyak = tidak ada yang menonjol.
- Semua kata pemicu (`shots`, `gestures`, `changes`, `trigger`, `triggers`, `sfx`, `dashes_from`) harus kata
  yang benar-benar ada di narasi scene itu — bentuk tampilan (`zenhosta.com`) atau ucapan
  (`zenhosta`), tanpa tanda baca, tidak peka huruf besar. `@start` = awal scene.
- `visuals` adalah rencana yang dibaca manusia dan dipakai saat menulis `scenes.js`; tipe bebas
  tapi deskriptif.

## Shot kamera (`shots`) — supaya video tidak statis

Setiap scene punya daftar `[kata_pemicu, shot, transisi]`. Shot berlaku sampai shot berikutnya
(juga melewati batas scene). Tanpa `shots`, video memakai `wide` terus — hindari itu.

| Shot | Isi bingkai | Pakai untuk |
|---|---|---|
| `wide` | host + maskot di bawah, panggung/panel di atas | default, rangkuman, saat panel UI besar tampil |
| `wide_far` | sama, lebih lega | penutup scene, setelah momen ramai |
| `host_medium` | host setengah badan, gestur jelas | menjelaskan, menghitung, transisi antar langkah |
| `host_close` | wajah host besar (seperti vlog) | hook, pertanyaan ke penonton, punchline, CTA |
| `mascot_close` | maskot dekat, lengan host kadang masuk | reaksi lucu: pusing, kedinginan, kaget, senang |
| `illustration` | props 3D di panggung memenuhi layar; host dan maskot otomatis berjalan minggir dulu (mulai 0,35 dtk sebelum shot) lalu kembali saat shot berganti | saat props sedang dibahas (rumah, rak, gedung, globe) |
| `low_angle` | dari bawah, heroik | momen sukses, "langsung online!", ajakan akhir |

Transisi: `"cut"` (pindah langsung), `"move"` (kamera bergerak halus 0,7 dtk), atau
`"move:1.2"` (durasi sendiri). `"@start"` = tepat di awal scene.

Ritme yang enak:
- Ganti shot tiap 3–6 detik; tiap scene minimal 2 shot. Jarak antar shot ≥ 1 detik.
- **Cut** saat ide baru mulai (awal scene, punchline, reaksi). **Move** saat sesuatu muncul atau
  membesar (props naik → `illustration` dengan move; kembali ke `wide` dengan move).
- Karakter butuh ±0,8 dtk untuk minggir/kembali; beri jarak ≥ 2 dtk antara masuk dan keluar `illustration`,
  dan jangan pasang gestur penting host saat `illustration` (dia sedang di luar bingkai).
- Hook dibuka `host_close` (wajah langsung bicara ke penonton), lalu move keluar saat visual muncul.
- Saat props 3D jadi bintang, pakai `illustration`; saat panel UI besar (diagram alur, kartu 2×2,
  CTA) tampil, pakai `wide`/`host_medium`/`host_close` dan pastikan panel tidak menutupi wajah
  (zona aman per shot ada di `engine-api.md`).
- Reaksi maskot (mata berubah) paling lucu kalau di-cut ke `mascot_close` tepat di kata itu.
- Jangan bolak-balik cut tiap detik — melelahkan dan bisa memicu fotosensitif.

## Latar adaptif (`background`)

Latar ikut berubah sesuai yang sedang dibahas: warna gradien, warna lantai grid, pola partikel,
dan ikon motif samar yang melayang. Perubahan berlangsung halus (crossfade ±0,9 dtk) di awal
scene, atau di kata tertentu dengan `"at": "kata"`. Scene tanpa `background` mewarisi scene sebelumnya.

```json
"background": {"theme": "tech_dark", "pattern": "code", "motif": ["server", "cpu", "database"], "at": "server", "transition": 0.9}
```

Tema (`theme`): `night_blue` (biru malam, default), `grape` (ungu), `deep_space` (ungu gelap),
`ocean` (biru laut), `arctic` (biru es), `mint` (hijau tosca), `tech_dark` (abu gelap, teknis),
`sunset` (oranye-merah), `berry` (merah muda), `gold` (emas).

Pola (`pattern`): `bokeh` (bulatan cahaya), `stars` (bintang berkelip pelan), `bubbles` (gelembung
naik), `snow` (salju turun), `code` (kolom angka biner jatuh), `none`.

Motif (`motif`): 2–5 nama ikon lucide yang mewakili topik scene (mis. domain → `house`, `map-pin`,
`link`; server → `server`, `cpu`, `hard-drive`; keamanan → `shield-check`, `lock`, `key-round`;
uang → `wallet`, `coins`, `piggy-bank`). Ikon tampil samar di belakang, jadi aman dipakai banyak.

Panduan memilih:
- Cocokkan suasana dengan isi: dingin/pendingin → `arctic` + `snow`; teknis/server → `tech_dark` +
  `code`; jaringan/internet → `ocean` + `bubbles`; sukses/solusi → `mint`; ajakan/CTA → `sunset`,
  `berry`, atau warna merek pengguna; rangkuman → kembali ke tema pembuka + `stars`.
- Ganti tema paling sering sekali per scene. Langkah-langkah boleh punya tema masing-masing supaya
  penonton merasa pindah "bab"; hook dan rangkuman sebaiknya tema yang sama.
- Kalau pengguna punya warna merek, tambahkan tema sendiri di `scenes.js` (lihat `engine-api.md`)
  dan pakai untuk CTA.

## Thumbnail / cover (`thumbnail`)

Setiap video punya satu gambar cover 1080×1920 untuk TikTok/Reels: judul besar + ilustrasi 3D
dari video (props panggung, host dengan ekspresi heboh, maskot melompat) + latar bertema.

```json
"thumbnail": {
  "title": ["Kok website", "bisa *online?*"],
  "subtitle": "Domain, server & hosting dalam 1 menit",
  "badge": "4 HAL PENTING", "badge_icon": "sparkles",
  "footer": "zenhosta.com", "footer_icon": "globe",
  "props_from": {"scene": "s5_datacenter", "word": "pendingin"},
  "background": {"theme": "grape", "pattern": "bokeh", "motif": ["globe", "server", "cloud"]},
  "host": {"pose": "point_up", "expression": "wow", "mouth": 0.6},
  "mascot": {"action": "jump", "eyes": "wow"},
  "sticker": {"icon": "wifi", "x": 800, "y": 820, "color": "#34D399"}
}
```

- `title`: 2–3 baris, ±2–4 kata per baris, otomatis huruf besar dan diperkecil supaya muat.
  Kata di antara `*...*` jadi kuning — pilih 1–2 kata inti. Bentuknya pertanyaan penasaran,
  angka ("3 cara…", "1 menit"), atau janji yang **benar-benar dijawab di video**. Bukan klikbait
  palsu.
- `subtitle` (opsional, ≤ 7 kata): menjelaskan isi. `badge` (opsional, ≤ 3 kata) di atas judul.
- `footer`: merek/URL pengguna dari CTA (kosongkan kalau tidak ada CTA).
- `props_from`: detik props 3D yang mau dipamerkan — pilih momen paling visual (gedung data
  center, rumah dengan papan, globe). `{"scene", "word", "offset"}` atau `{"time": 40.2}`.
- `background`: tema cover (default: tema scene di detik itu). Kontras dengan warna baju host.
- `host`/`mascot`: pose & ekspresi beku. Ekspresi heboh (`wow`, `joy`, mulut terbuka 0,5–0,7)
  lebih menarik daripada datar. `point_up` = menunjuk judul.
- `sticker` (opsional): ikon bulat dekat props. Opsi lanjut: `shot` (default `thumb`), `stage`
  `{x,y,z,scale}` untuk menggeser panggung, `title_y` (default 430), `title_max` (default 170 px),
  `keep_ui` (tampilkan panel UI scene di detik itu).

Area aman: grid profil memotong cover ke tengah (3:4 TikTok, 4:5 Instagram, 1:1 paling ketat).
Judul dan wajah host harus di dalam pita tengah y 420–1500.

## Pose host (`gestures[1]`)

`idle`, `scratch` (garuk kepala), `point_up`, `point_panel` (tunjuk ke area atas kanan),
`present` (tangan terbuka ke samping), `spread` (dua tangan terbuka), `count`, `thumbs`, `shrug`,
`hold` (memegang sesuatu di depan), `shake` (menggeleng dengan tangan), `point_viewer`
(menunjuk penonton), `think`, `wave`, `celebrate` (dua tangan ke atas).

Pola yang enak: tunjuk area atas (`point_panel`/`point_up`) saat panel muncul, `present`/`spread`
saat menjelaskan, `count` saat menyebut angka, `celebrate` di momen sukses dan CTA.
Ganti pose tiap 2–4 detik; jangan lebih sering dari 0,6 detik.

## Ekspresi host (`gestures[2]` / `expression`)

`talk`, `curious`, `happy` (senyum), `wow`, `worried`, `smirk`, `serious`.

## Maskot

Aksi: `idle`, `tilt`, `bounce`, `jump`, `shiver`, `look` (menoleh ke panggung).
Mata: `normal`, `happy` (^ ^), `wow` (o o), `question` (? ?), `dizzy` (spiral), `cold` (> <),
`sad`, `love`.
Maskot bereaksi secara emosional pada isi: bingung di hook, pusing saat hal ribet, senang saat solusi.

## Efek suara (`sfx[1]`)

`whoosh`, `whoosh_in`, `whoosh_label` (pergantian label; otomatis dimajukan 0,25 dtk), `pop`,
`pop_x3`, `pop_x4` (beberapa pop berurutan untuk elemen bertahap), `ding`, `success_chime`,
`typing`, `buzz` (salah/ribet), `rise_hum` (sesuatu naik), `multiply_swell` (banyak muncul),
`scratch` (dicoret), `tick` (langkah diagram), `boing`, `coin`.
Satu atau dua per scene sudah cukup.
