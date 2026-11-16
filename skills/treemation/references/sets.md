# Set 3D — scene penuh di belakang karakter

Pulau melayang (`stage`) cocok untuk **benda**: rumah, rak, globe, koin. Kalau yang dibahas adalah
**tempat** — ruang data center, kantor, gudang, jalan kota — pakai **set**: lingkungan 3D penuh yang
dibangun di belakang host. Host dan maskot otomatis **melayang** di depannya sambil menjelaskan, dan
kamera bisa terbang masuk ke dalam ruangan (lorong, mesin, sudut tertentu) lalu kembali ke host.

## Daftar isi
1. Kapan pakai set
2. Menulis `set` di plan.json
3. Set bawaan: spot dan fx
4. Shot kamera di dalam set
5. Penanda (`mark`)
6. Ritme yang enak + contoh lengkap
7. scenes.js: menempel UI, mengatur objek, membuat set sendiri
8. Performa dan kesalahan umum

## 1. Kapan pakai set

| Pakai set | Pakai pulau melayang |
|---|---|
| Narasi menyebut tempat: "ini gedung…", "di dalam gudang…", "di jalan raya…" | Narasi menyebut benda/konsep: "server itu komputer…", "domain itu alamat…" |
| Penonton perlu merasakan skala/suasana (ribuan rak, rak gudang menjulang) | Satu objek yang berubah/bertransformasi |
| Ada beberapa bagian tempat yang dibahas berurutan (pendingin → listrik → jaringan) | Panel UI besar (diagram, kartu) jadi pusat perhatian |

Aturan: **1–2 set per video**, masing-masing ≥ 4 dtk (idealnya satu langkah penuh 8–12 dtk). Set
paling kuat untuk langkah yang paling "visual" atau sebagai adegan metafora. Scene lain tetap memakai
pulau melayang supaya set terasa istimewa.

## 2. Menulis `set` di plan.json

Per scene (bentuk singkat `"set": "datacenter"` juga boleh):

```json
"set": {
  "name": "datacenter",
  "at": "data center",
  "until": null,
  "in": "build",
  "out": "build",
  "float": true,
  "options": {"sign": "HALL A"},
  "fx":   [["pendingin", "cold"], ["internet", "data"]],
  "mark": [["pendingin", "pendingin", "Pendingin", "snowflake"]]
}
```

| Field | Arti |
|---|---|
| `name` | set bawaan (`datacenter`, `office`, `warehouse`, `city`) atau buatan sendiri (`defineSet`) |
| `at` | kata saat set mulai dibangun (mulai 0,3 dtk sebelum kata). Default awal scene |
| `until` | kata saat set mulai dibongkar. Default akhir scene |
| `in` / `out` | `build` (lantai muncul, dinding naik, isi bermunculan bertahap ±1,5 dtk; bongkar 0,6 dtk) atau `cut` (langsung ada/hilang — pasangkan dengan shot `cut`) |
| `float` | `false` = karakter tetap berdiri (jarang perlu) |
| `options` | opsi builder, mis. `sign` (papan lorong data center), `rowPrefix`, `shopSign` (kota) |
| `fx` | `[kata, nama_fx, (kata_akhir)]` — efek menyala dari kata itu sampai set selesai (atau kata akhir) |
| `mark` | `[kata, spot, label, ikon, (durasi)]` — panah kuning + tag di spot itu (default 2,6 dtk) |

- Scene berikutnya yang memakai set **sama** (dan menyambung) tidak dibangun ulang — kamera tinggal
  lanjut. Cukup tulis `"set": "datacenter"` di scene itu.
- Selama set aktif: panggung melayang turun otomatis, lantai grid & latar partikel memudar, kabut dan
  cahaya mengikuti set. `background` scene tetap dipakai untuk warna panel UI dan untuk langit set
  `city` (tanpa langit-langit). Kalau panggung tetap perlu tampil di dalam set: `"set_keep_stage": true` di plan.
- Kata pemicu (`at`, `until`, `fx`, `mark`) mengikuti aturan yang sama dengan shot: harus ada di narasi scene itu.

## 3. Set bawaan

Koordinat: karakter melayang di x -1,75 / 2,85, z ≈ 1; isi set mulai z ≈ -5 ke belakang.

### `datacenter` — ruang server
Lorong dingin di tengah (ubin berlubang biru), 4 baris rak berlampu LED, 3 kabinet UPS (baterai), 5 unit
pendingin dengan kipas di dinding belakang, tray kabel kuning + kabel data biru di atas rak, lampu panel.

| Spot | Yang terlihat |
|---|---|
| `lorong` | menyusuri lorong rak sampai pendingin di ujung — shot "wow" paling kuat |
| `rak` | dekat muka rak: unit server, LED berkedip |
| `pendingin` | unit pendingin besar dengan kipas |
| `listrik` | kabinet UPS dengan bar baterai |
| `jaringan` | menatap ke atas: tray & kabel data |
| `atas` | pandangan miring dari atas (langit-langit otomatis hilang) |

fx: `cold` (kipas cepat, udara dingin naik dari lantai & keluar dari pendingin), `power` (bar baterai
UPS mengisi berulang), `data` (paket data menyala mengalir di kabel atas).

### `office` — kantor terbuka
6 meja dengan 2 monitor (kode berwarna), kursi, papan tulis kiri, rak buku kanan, tanaman, dinding kaca
belakang dengan gedung kota.

Spot: `meja`, `layar` (close-up monitor), `papan` (papan tulis), `jendela` (pemandangan kota), `atas`.
fx: `work` (teks di monitor bergulir), `write` (garis di papan tulis tergambar satu per satu).

### `warehouse` — gudang / logistik
4×3 rak tinggi berisi kardus, konveyor di tengah, forklift, pintu bongkar muat dengan truk di baliknya.

Spot: `rak`, `konveyor`, `truk` (pintu), `forklift`, `atas`.
fx: `ship` (kardus berjalan di konveyor), `lift` (garpu forklift naik), `open` (pintu terbuka, truk terlihat).

### `city` — persimpangan kota malam (tanpa langit-langit)
Plaza tempat karakter melayang, jalan melintang dengan mobil lewat, jalan raya menjauh dengan gedung
berjendela menyala, lampu jalan, toko di sisi kiri plaza. Langit = gradien tema `background` scene
(pakai tema gelap: `night_blue`, `deep_space`, `grape`).

Spot: `jalan` (menyusuri jalan raya), `gedung` (mendongak ke gedung), `toko`, `persimpangan`, `atas`.
fx: `rush` (lalu lintas lebih cepat), `lights` (jendela gedung menyala bertahap).

## 4. Shot kamera di dalam set

| Shot | Isi bingkai | Karakter |
|---|---|---|
| `set_wide` | ruangan luas, karakter kecil di sepertiga bawah | terlihat, melayang |
| `set_host` | host setengah badan di kiri, ruangan di kanan-belakang | terlihat |
| `set_low` | dari bawah, ruangan menjulang | terlihat |
| `spot:<nama>` | kamera di dalam ruangan menatap spot | otomatis keluar bingkai (seperti `illustration`) |

- Shot biasa (`host_close`, `host_medium`, `mascot_close`, `wide`, `low_angle`) tetap bisa dipakai saat
  set aktif — tingginya otomatis disesuaikan dengan karakter yang melayang, dan ruangan tampil di belakang.
- `spot:` ke `spot:` = karakter tetap tersembunyi. Kembali ke shot karakter → karakter masuk lagi.
- Transisi: `move:1.2` dari `set_wide` ke `spot:lorong` terasa seperti terbang masuk; antar spot boleh
  `cut` atau `move:1.0`. Hindari `move` antar spot yang jauh berseberangan (kamera menembus rak) — pakai `cut`.
- Jangan pakai `spot:` sebelum set selesai dibangun (≥ 1,2 dtk setelah `at`).

## 5. Penanda (`mark`)

Panah kuning memantul dengan ujung menunjuk objek + tag kuning berisi label & ikon lucide, muncul tepat
pada kata itu. Pakai saat narasi menyebut bagian tempat: "lengkap dengan **pendingin**".

- Pasangkan dengan shot yang memperlihatkan spot itu (`spot:pendingin`, atau `set_wide`/`spot:atas`
  untuk spot yang terlihat dari jauh). `plan_timing.py` memperingatkan kalau kamera sedang di spot lain.
- Label ≤ 3 kata, sentence case. Satu penanda sekaligus; maksimal 3–4 per set.
- Penanda menggantikan chip/panel untuk menyebut bagian tempat — jangan dobel dengan panel UI.

## 6. Ritme yang enak + contoh lengkap

Pola satu langkah dengan set (±10 dtk):

1. `@start` shot karakter (`host_medium`/`host_close`) — host memperkenalkan tempat; set dibangun di
   belakangnya pada kata nama tempat (`at`).
2. Kata berikutnya → `set_wide` (`move:1.2`): penonton melihat seluruh ruangan, host masih di depan.
3. Kata yang menyebut isi → `spot:…` (`move:1.2`), lalu spot lain per bagian yang disebut (`cut`),
   masing-masing dengan `mark` + `fx`.
4. Scene berikutnya kembali ke shot karakter; set dibongkar di akhir scene (atau lanjut kalau scene
   berikut memakai set yang sama).

Contoh (zenhosta, langkah 3):

```json
{
  "id": "s5_datacenter",
  "narration": "Ketiga, data center. Ini gedung khusus tempat ribuan server tinggal, lengkap dengan pendingin, listrik cadangan, dan internet super cepat.",
  "shots": [["@start", "host_medium", "cut"], ["Ini", "set_wide", "move:1.2"], ["ribuan", "spot:lorong", "move:1.2"],
            ["pendingin", "spot:pendingin", "cut"], ["internet", "spot:jaringan", "move:1.0"]],
  "set": {"name": "datacenter", "at": "data center",
          "fx": [["pendingin", "cold"], ["listrik", "power"], ["internet", "data"]],
          "mark": [["pendingin", "pendingin", "Pendingin", "snowflake"], ["internet", "jaringan", "Internet super cepat", "rocket"]]},
  "background": {"theme": "tech_dark", "pattern": "code", "motif": ["server", "cpu"]}
}
```

Kenapa "listrik cadangan" tidak punya spot sendiri: kata itu hanya ±0,8 dtk setelah "pendingin", padahal
jarak antar shot minimal 1 dtk. Kalau narasi menyebut beberapa bagian cepat berurutan, pilih 2 yang
paling visual untuk `spot:`, atau pakai `spot:atas` / `set_wide` dengan beberapa `mark` yang berpindah.

Gerak host tetap ditulis seperti biasa (`present`/`spread` saat set muncul, `point_panel` saat menunjuk).
Saat kamera di `spot:` host tidak terlihat, jadi jangan pasang gestur penting di sana.

## 7. scenes.js

Impor dari engine: `getSet, setPoint, defineSet, SETS, FLOAT`.

**Menempel UI ke spot** (mis. badge suhu di samping pendingin):

```js
const p = setPoint('datacenter', 'pendingin', 1.5);   // [x, y] px, null kalau di belakang kamera
if (p) { U.temp.style.left = (p[0] + 40) + 'px'; U.temp.style.top = (p[1] - 40) + 'px'; }
setPop(U.temp, p && env(t, T('s5_datacenter', 'pendingin'), S.s5_datacenter.end));
```

**Mengatur objek set** di `update3D` (dipanggil sebelum set diperbarui). Ubah material/warna dan tulis nilainya tiap frame (di dalam dan di luar jendela) supaya deterministik; posisi, skala, dan `visible` benda yang ikut animasi build diatur ulang engine tiap frame, jadi jangan diubah dari scenes.js:
`getSet('datacenter').handles` berisi `racks`, `ups`, `crac`, `fans`, `trays`; `office` → `desks`,
`screens`, `plants`, `whiteboard`; `warehouse` → `shelves`, `boxes`, `conveyor`, `parcels`, `door`,
`truck`, `forklift`; `city` → `buildings`, `lamps`, `shop`, `crossCars`, `aveCars`.
Contoh: satu rak menyala kuning saat "server kamu" disebut —
`getSet('datacenter').handles.racks[3].m.material = …` (simpan material asli dan kembalikan di luar jendela).

**Membuat set sendiri** (ruang kelas, rumah sakit, dapur, sawah, laboratorium…) di `setup()`:

```js
import { defineSet } from './engine.js';
defineSet('kelas', (K, opts) => {
  const { THREE, box, grp } = K; const g = new THREE.Group();
  const sh = K.shell(g, { w: 30, z0: 48, z1: -36, h: 14, floor: K.texMat(K.tiles('#d6c3a5', '#b9a37f', 2, [14, 40])),
                          wall: '#fde68a', ceiling: K.texMat(K.tiles('#f8fafc', '#e2e8f0', 2, [14, 40]), true) });
  const board = box(g, 14, 6, .3, '#14532d', 0, 7, -35.6); K.part(board, .2, 'rise');      // papan tulis
  const chalk = box(g, 6, .25, .1, '#f8fafc', -2, 8, -35.4, true); K.part(chalk, .5, 'pop');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {                                   // bangku
    const d = grp(g, -9 + c * 6, 0, -12 - r * 7); box(d, 3.4, .25, 2, '#a16207', 0, 2.6, 0); box(d, .3, 2.5, 1.8, '#78350f', 0, 1.3, 0);
    K.part(d, .3 + r * .1 + c * .03, 'pop'); }
  sh.ceiling.push(...[-8, 0, 8].map(x => { const l = box(g, 3, .12, 1.2, '#fffbeb', x, 13.7, -10, true); K.part(l, .14, 'drop'); return l; }));
  return { g, ceilingY: 14, ceiling: sh.ceiling, fog: { color: '#a8a29e', near: 50, far: 120 },
    hemi: { sky: '#ffffff', ground: '#a8a29e', intensity: 2.3 },
    spots: { papan: { pos: [0, 8, -8], look: [0, 6.8, -36], fov: 46, mark: [0, 10.5, -35.5] },
             bangku: { pos: [6, 9, -2], look: [-2, 2.5, -18], fov: 48, mark: [-3, 4.5, -19] } },
    handles: { board, chalk },
    update(t, { fx, fxT }) { chalk.scale.x = fx.write ? Math.max(.001, Math.min(6, (t - fxT.write) * 4)) : 6; } };
});
```

Kit `K`: `box, grp, M, THREE, rng, canvasTex, textBoard`, `K.shell(...)` (lantai, dinding, langit-langit),
`K.tiles(warna, garis, n, [repeatX, repeatZ])` (tekstur ubin), `K.tex(key, w, h, draw, rep)`,
`K.texMat(tex, basic)`, `K.boxM(...)` (material per sisi), `K.inst(parent, n)` (ratusan balok kecil dalam
satu draw call — LED, partikel; `set(i, x,y,z, sx,sy,sz, warna)` lalu `done()`), `K.part(obj, delay 0..1,
'pop'|'grow'|'rise'|'drop')` (ikut animasi build), `K.glow(obj)` (halo pada benda menyala, hemat — maks ±10).

Aturan membuat set:
- Kosongkan area z > -4 di sekitar karakter (x -6…6); lantai & langit-langit memanjang sampai z ≈ 48
  supaya `set_wide` tidak melihat tepi ruangan. Tinggi ruangan 14–18.
- Skala: 1 m ≈ 3,6 unit (host chibi 7,6 unit). Meja 2,7, pintu 8, rak server 7.
- Langit-langit pakai material basic (`texMat(..., true)`) — kalau Lambert, sisi bawahnya gelap.
- Gerakan di `update` harus deterministik terhadap `t` (tanpa `Math.random`/`Date`).
- Spot: `pos` di dalam ruangan, tidak menembus objek; `mark` = titik ujung panah (sedikit di atas objek).
  Cek tiap spot dengan `render.py --stills`.

## 8. Performa dan kesalahan umum

- Frame dengan set ±0,7–0,9 dtk/frame di CPU (tanpa set ±0,35–0,45). Untuk set buatan sendiri: banyak
  benda kecil → `K.inst`, jangan ratusan `box` terpisah; glow hanya lewat `K.glow` untuk beberapa benda.
- **Preview sebelum MP3**: `python <skill>/scripts/plan_timing.py <proyek> --preview` menulis
  `timeline.js` perkiraan, jadi `render.py --stills` bisa mengecek set/spot di Tahap 1.
- Spot terlihat kosong/aneh → shot `spot:` dimulai sebelum set selesai dibangun; geser kata pemicunya.
- Karakter menembus objek set → objek diletakkan di z > -4; pindahkan ke belakang.
- Panah penanda terpotong di atas → kamera spot terlalu dekat; pakai spot lain atau `markScale` di spot buatan sendiri.
- Panel UI di atas set: tetap ikuti zona aman shot (`engine-api.md`); di `spot:` pakai pita y 230–420
  atau tempel ke spot dengan `setPoint`.
- `plan_timing.py` / `align.py` mencetak **"Cek set 3D"**: spot/fx tidak dikenal, `spot:` di luar set,
  penanda yang tidak terlihat, set terlalu singkat, terlalu banyak set. Perbaiki semua ⚠.
