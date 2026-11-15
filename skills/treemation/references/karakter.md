# Karakter: gaya pixel-skin (blok ala game sandbox)

Host dibuat dari balok dengan tekstur piksel — wajah anime berpiksel (mata dengan highlight dan
bulu mata, pipi merona), rambut berlapis yang menonjol dari kepala, baju bermotif piksel —
seperti karakter game blok yang dirender 3D. Proporsi kepala 8 : badan 12 : kaki 12 (kepala
sedikit dibesarkan supaya imut). Lip sync dan ekspresi berganti lewat tekstur wajah; lengan dan
kaki berayun saat berjalan. Maskot ikut bertekstur piksel.

Semua karakter adalah **desain orisinal dari spesifikasi**. Jangan meniru skin/karakter milik
kreator lain, karakter game atau maskot merek. Kalau pengguna mengirim gambar referensi, ambil
gayanya (warna, gaya rambut, aksesori umum), bukan desain persisnya.

## Menentukan karakter dari konteks pengguna

Pilih tanpa bertanya dulu, lalu sebutkan pilihanmu di balasan Tahap 1 dan tawarkan perubahan:

1. **Pengguna mendeskripsikan dirinya / avatar yang dia mau** ("aku cewek berhijab", "cowok
   gondrong pakai kacamata") → ikuti itu. Ini prioritas tertinggi.
2. **Merek / CTA** → warna baju (`top`, `accent`) dari warna merek pengguna kalau diketahui.
3. **Niche & penonton** → teknologi: hoodie + headphones/kacamata; kecantikan/gaya hidup: rambut
   panjang/bob, flower crown, blouse; pendidikan/sekolah: blazer + pita; budaya/UMKM Indonesia:
   batik; anak-anak: twintails, pita, warna cerah; bisnis/keuangan: shirt rapi.
4. Tidak ada petunjuk → preset `raka` (default).

Tulis di `plan.json`:

```json
"characters": {
  "host": { "spec": { "preset": "nara", "top": "#0f4cdb", "accent": "#facc15" },
            "look": "deskripsi singkat untuk dibaca pengguna" },
  "mascot": { "name": "Byte", "spec": { "body": "#7DD3FC" }, "look": "..." }
}
```
`spec` = preset + field yang ditimpa. Bisa juga tanpa preset (semua field diisi sendiri).

## Preset

| Preset | Ringkas |
|---|---|
| `raka` | cowok, rambut hitam acak, kacamata, hoodie tosca, celana abu |
| `nara` | cewek, rambut cokelat panjang, bando telinga kucing, blazer navy list emas + pita tosca, rok lipit |
| `sinta` | cewek, bob abu-pink, flower crown, blouse putih, rok biru |
| `dimas` | cowok, rambut pendek, topi merah, kaos hitam logo kuning, jeans |
| `aira` | cewek, ponytail hitam, headphones, hoodie ungu |
| `budi` | cowok, rambut pendek, jenggot, kemeja batik cokelat |
| `salsa` | cewek berhijab lilac, blouse putih lengan panjang, rok panjang ungu |
| `lala` | cewek, twintails pirang, pita pink, sweater garis pink, rok |

## Field spec

| Field | Nilai |
|---|---|
| `gender` | `male` / `female` (female: bulu mata, lengan ramping) |
| `skin` | hex warna kulit — pilih rentang kulit Indonesia yang beragam (`#F5D3BA` … `#8D5A3B`) |
| `hairStyle` | `short`, `messy`, `long`, `bob`, `ponytail`, `twintails`, `bun`, `hijab` |
| `hair` | warna rambut; `hijab` = warna hijab (untuk `hairStyle: 'hijab'`) |
| `eyes` | warna iris |
| `outfit` | `hoodie`, `shirt`, `blazer`, `blouse`, `tshirt`, `sweater` (bergaris), `batik` |
| `top`, `accent` | warna utama baju & aksen (tali hoodie, list, logo, garis, motif) |
| `inner`, `ribbon` | warna kemeja dalam & pita (blazer) |
| `sleeves` | `long` / `short` (default tergantung outfit) |
| `bottom` | `pants`, `skirt`, `long_skirt`, `shorts` |
| `bottomColor`, `shoes`, `socks` | warna |
| `accessories` | daftar: `glasses`, `cat_ears` (+`earColor`), `flower_crown`, `headphones`, `cap` (+`capColor`), `bow` (+`bowColor`), `beard` |
| `blush` | `true` = pipi merona |
| `headScale` | default 1.08 |
| `style` | `pixel` (default) atau `classic` (host voxel polos versi lama) |

Maskot (`mascot.spec`): `body`, `face`, `trim`, `legs`, `leds` (bool), `pixel` (default ikut host).

## Lip sync vokal (A · I · U · E · O)

Mulut host hanya membaca **vokal** dari kata yang sedang diucapkan dan berganti bentuk mengikuti
urutannya. Konsonan diabaikan. Lima vokal punya bentuk sendiri. Contoh: "aku mau makan" → A U A U A A.

| Bentuk | Vokal | Rupa (pixel-skin) |
|---|---|---|
| A | a | terbuka lebar & tinggi, gigi atas + lidah |
| I | i | lebar pipih, deretan gigi |
| E | e | sedang, gigi + celah merah |
| U | u | kecil & monyong (bibir maju) |
| O | o | bulat, lebih besar dari U |
| tutup | — | saat jeda/diam (volume audio rendah) atau di luar kata; bentuk diam ikut ekspresi (senyum, smirk) |

Cara kerja (otomatis di `align.py`): setiap kata dibagi rata menurut jumlah vokalnya di dalam
waktu kata itu, lalu frame yang audionya hening dipaksa tutup. Hasilnya `TL.visemes` (satu huruf
per frame: `A I U E O -`).

**Kata asing** dibaca sesuai ucapan, bukan ejaan: `website` → "websait" (E A I), `youtube` → "yutub" (U U), `online` →
"onlain", `file` → "fail", `IP` → "aipi". Daftar bawaan ada di `BASE_PRON` (`plan_lib.py`); tambah
sendiri di plan.json:

```json
"pronunciation": {"zenhosta": "zenhosta", "cloudflare": "klaudfler", "AI": "ei ai"}
```

Cek cepat: `python -c "import sys; sys.path.insert(0,'<skill>/scripts'); from plan_lib import visemes; print(visemes('aku mau makan'))"`

## Pratinjau

`python <skill>/scripts/preview_characters.py <proyek>` → semua preset berjajar
(`previews/karakter-preset.png`) — berguna kalau pengguna ingin memilih.
`--plan` → host dari plan.json; `--spec '{"preset":"salsa","hijab":"#0ea5e9"}'` → coba spec cepat.
Keduanya juga membuat `karakter-closeup.png` untuk memeriksa wajah.

## Cek

Selalu render `--stills` satu close-up (`host_close`) dan satu `wide` setelah mengganti karakter:
pastikan wajah tidak tertutup rambut/aksesori, warna baju kontras dengan latar scene, dan
caption tetap terbaca di atas baju.
