# Engine API untuk scenes.js

`engine.js` sudah mengurus: latar biru + bokeh, lantai grid, kamera, host + maskot (pose,
ekspresi, kedip, lip sync vokal A/I/U/E/O dari `TL.visemes`), panggung melayang, label atas + garis progres, caption,
confetti. Semua itu digerakkan oleh `timeline.js` dari `align.py`.
`scenes.js` hanya menambah **props 3D di panggung** dan **elemen UI per scene**.

Contoh lengkap yang bekerja: `examples/zenhosta/scenes.js`. Mulai dari menyalinnya.

## Daftar isi
1. Kerangka
2. Tata letak layar
3. Waktu dan animasi
4. Komponen UI
5. Props 3D dan efek
6. Kamera, panggung, confetti, tampilan karakter
7. Kesalahan umum

## 1. Kerangka

```js
import { register, T, S, hookEnd, loopStart, env, setPop, P, clamp, lerp, inOut, easeOut, backOut,
         M, box, grp, stage, PROPS, FXP, UI, ANIM, SHOTS, THEMES, SCREENS, smartphone, outline, glow,
         screenOf, css, el, icon, textBoard, THREE } from './engine.js';

let P3 = {}, U = {};
register({
  look: { host: { shirt: '#F97316' }, mascot: { body: '#A7F3D0' } },   // opsional
  setup() { /* buat semua props & elemen UI sekali */ },
  stageWindows: () => [[t0, t1], ...],      // kapan panggung 3D tampil
  camera(t, sid, cam) {},                    // opsional: ubah cam.x/y/z/lookY
  confetti: () => [[t0, x, y, tEnd], ...],   // opsional
  update3D(t, sid) { /* tiap frame, sebelum render 3D */ },
  updateHTML(t, sid) { /* tiap frame, setelah render 3D */ },
});
```

Semua fungsi `update*` harus **deterministik terhadap `t`** (detik). Jangan pakai `Date`,
`Math.random()` di dalam update, `setTimeout`, atau transisi/animasi CSS — tiap frame dirender
terpisah. Untuk acak, pakai `rng(seed)` saat setup.

## 2. Tata letak layar (1080×1920 px) dan shot kamera

Kamera diatur dari `shots` di plan.json (lihat `naskah-dan-plan.md`). Engine menginterpolasi
antar shot, menambah dolly pelan (ken-burns) dan goyang halus. Posisi wajah/karakter berubah
per shot, jadi **zona aman untuk panel UI juga berubah**:

| Shot | Wajah/karakter berada di | Panel UI aman di | Catatan |
|---|---|---|---|
| `wide` | kepala host y 870–1300 | y 230–860 | panggung 3D di y 440–900 |
| `wide_far` | kepala host y 1000+ | y 230–950 | |
| `host_medium` | kepala host y 790–1320 | y 230–760 | panggung terpotong di kanan atas |
| `host_close` | wajah y 620–1500, lebar penuh | y 230–600 | panel kecil saja (url bar, badge, chip) |
| `mascot_close` | maskot y 1150–1920 | y 230–1050 | lengan host bisa masuk di kiri atas |
| `illustration` | props y 300–1450, karakter sudah minggir | pita y 230–420, atau tag yang ditempel ke props via `screenOf` | panel besar akan menutupi props |
| `low_angle` | kepala host y 1250+, bawah panggung y 550–700 | y 230–560 | |

Kalau panel besar harus tampil, pilih shotnya (bukan sebaliknya). Selalu cek dengan
`render.py --stills` di beberapa detik per shot.

Preset bisa diubah atau ditambah di `setup()`:
`SHOTS.desk = { pos: [x,y,z], look: [x,y,z], fov: 36 }` (impor `SHOTS` dari engine), lalu pakai
`"desk"` di plan.json. Host di x≈-1,75 (kepala y 5–7,6, wajah z≈1,6), maskot x≈2,85 (tinggi ±2,7,
z 1,4), panggung (0,55; 8,35; -3) skala 1,28.

Shot dengan `hideChars: true` (bawaan: `illustration`) mengeluarkan karakter dari bingkai tanpa
menghalangi kamera: mode `hide` (langsung hilang/muncul) atau `slide` (geser lurus ke samping,
tetap menghadap kamera, selesai sebelum kamera bergerak). Mode dari elemen ke-4 shot, lalu
`character_exit` plan, lalu default (`cut` → `hide`, `move` → `slide`). Kemunculan variasi dari
bawah/samping/atas diatur `enter` per scene. Shot buatan sendiri yang fokus ke props juga bisa
diberi `hideChars: true`.

`camera(t, sid, cam)` di `register` dipanggil setelah shot dihitung; `cam` = `{x,y,z, lx,ly,lz, fov, shot}`
— ubah kalau butuh gerakan khusus (mis. orbit). Biasanya tidak perlu.

### Tata letak saat `wide` (default)

```
  0–200    label atas + garis progres          (engine)
 230–440   pita panel: url bar, badge, chips, pills
 440–900   panggung 3D (props) ATAU panel besar (diagram, kartu, CTA)
 870–1300  kepala host (x 80–560) — JANGAN ditutup panel
1300–1420  caption                              (engine)
1420–1920  badan host (kiri), maskot (kanan bawah, sebagian terpotong — disengaja)
```

- Margin kiri/kanan ≥ 60 px. Sisi kanan bawah tertutup tombol aplikasi (like, share); jangan
  taruh info penting di x > 900, y > 1100.
- Lebar panel penuh: `left: 90–110px; width: 860–900px`. Panel kiri: `left: 60px; width ≤ 660px`.
- Panggung berada di tengah sedikit ke kanan; props selebar >4 unit akan terpotong di tepi.

## 3. Waktu dan animasi

**Scene pertama & hook**: teks hook besar (dari `plan.json` → `hook`) tampil di y ±300–560 dari
frame 0 sampai `hookEnd()`, lalu mengecil ke posisi label. Panel UI scene 1 muncul **setelah**
`hookEnd()` (impor dari engine), dan props/karakter sudah terlihat bergerak di frame 0 —
mis. `stageWindows` scene 1 boleh dimulai dari `-0.5`.


- `T(sid, 'kata', occ=0)` → detik mulai kata. Juga `'@start'`, `'@end'`.
- `S[sid].start`, `S[sid].end` → batas scene.
- `env(t, tin, tout, inD=.4, outD=.3)` → `null` di luar jendela, atau `{o, sc, pi, po}`.
- `setPop(el, env, base='', extra='')` → tampilkan dengan pop-in (skala back-out) + fade.
  Untuk elemen yang diposisikan dengan `left:50%`, beri `base = 'translateX(-50%)'`.
- `P(t, t0, dur)` → progres 0..1; easing: `easeOut`, `inOut`, `backOut`.
- Biasanya: muncul `T(..)-0.1` s/d `S[sid].end`. Elemen besar bisa mulai 0,2–0,35 dtk sebelum
  kata supaya sudah terbaca saat kata diucapkan.

## 4. Komponen UI

Semua `UI.*(opsi, style)` mengembalikan elemen tersembunyi; `style` = objek CSS (px string).
Ikon = nama ikon lucide (mis. `globe`, `server`, `cloud`, `lock`, `shield-check`, `wallet`,
`smartphone`, `cpu`, `wifi`, `database`, `mail`, `rocket`, `zap`, `clock`, `check`, `x`).

| Komponen | Opsi | Animasi pendamping |
|---|---|---|
| `UI.browser(style)` | jendela browser + spinner + "Online" | `ANIM.browser(el, t, tin, tout, tOnline)` |
| `UI.iconCard({title, icon, color, n})` | kartu 420×250 | `setPop` |
| `UI.urlbar({icon})` | bar alamat | `ANIM.typing(el, teks, t, t0, dur)` |
| `UI.bignum({label, value})` | angka/teks mono besar | `setPop` |
| `UI.xstamp(style)` | silang merah besar (beri width/height) | `setPop` + rotate |
| `UI.chip({text, icon, color})` | pil dengan ikon bulat | `setPop` + slide |
| `UI.file({name, icon})` | chip file putih | `ANIM.fly(el, t, t0, dur, [x0,y0], [x1,y1])` |
| `UI.badge({big, small, icon, color})` | nilai besar + keterangan | `setPop` |
| `UI.bubble({icon, bg, fg})` | lingkaran ikon 96 px | `setPop` |
| `UI.tag({text, icon})` | label kuning (penanda objek 3D) | posisikan dengan `screenOf` |
| `UI.note({title, sub})` | kartu teks kecil | `setPop` |
| `UI.strike(style)` | garis coret merah | `scaleX` progresif |
| `UI.pills([a, b, c])` | langkah berurutan dengan panah | `ANIM.pills(el, t, [t1,t2,t3])` |
| `UI.okbadge({text, icon})` | badge hijau besar | `setPop` + confetti |
| `UI.flow([[icon, judul, sub], ...])` | diagram alur vertikal (168 px/baris) | `ANIM.flow(el, t, triggers, tin, tout)` |
| `UI.cta({q, brand, accent, button, icon})` | kartu CTA | `setPop`, animasi brand/tombol |
| `UI.panel(innerHTML, style)` | panel kosong untuk desain sendiri | — |

Elemen sendiri: `el('<div class="panel">…<span data-icon="globe"></span>…</div>', style)` dan
CSS tambahan lewat `css('...')`. Warna: `var(--y)` kuning, `--green`, `--pink`, `--sky`, `--red`,
`--panel` (ikut tema latar).
Teks yang tampil di layar memakai bahasa Indonesia, sentence case; label atas boleh huruf besar.

## 5. Props 3D dan efek

Satuan dunia: host ±7,6 unit tinggi. Panggung (`stage`) berjari-jari 3, permukaan y = 0,24;
props setinggi 2–3,6 unit pas. Props dibuat sekali di `setup`, lalu diatur `visible`/`scale`
di `update3D`.

- `PROPS.globe(stage, {x})` → `{g, mesh, dots}` (putar `mesh.rotation.y`, munculkan `dots`)
- `PROPS.house(stage, {sign})` → rumah + papan teks
- `PROPS.rack(stage)` → `{g, leds, slots}` rak server
- `PROPS.dataCenter(stage)` → `{g, floorB, walls, racks, ac, battery}`
- `PROPS.cloud`, `PROPS.laptop` (`{lid, screen}`), `PROPS.phone`, `PROPS.coins` (`{coins}`), `PROPS.lock`
- `PROPS.voxels(stage, [[w,h,d,warna,x,y,z,(menyala)], ...])` → prop buatan sendiri dari balok
- `box(parent, w,h,d, warna, x,y,z, basic)`, `grp(parent,x,y,z)`, `textBoard(parent, teks, {...})`
- Efek: `FXP.snow` / `updateSnow`, `FXP.streaks` / `updateStreaks`,
  `FXP.orbitTexts([...])` / `updateOrbit(list, t, tin, tout)` (teks mengorbit maskot)
- `screenOf(obj, [x,y,z])` → posisi px untuk menempelkan UI ke objek 3D.

Pola muncul yang dipakai contoh: `g.scale.setScalar(Math.max(.001, backOut(P(t, t0, .5))))`
(pop) atau skala y dari 0 (naik dari lantai). Jangan biarkan skala 0 persis — pakai `.001`.
Lampu kedip pakai `Math.sin(t * 2.6 + i) > -.3` (lambat, aman).

## 6. Kamera, panggung, confetti, karakter

- `stageWindows` mengembalikan daftar jendela `[t0, t1]`; panggung naik/turun otomatis.
- Kamera: pakai `shots` di plan.json. `camera(t, sid, cam)` hanya untuk gerakan khusus; `cam` berisi
  `x,y,z` (posisi), `lx,ly,lz` (titik tatap), `fov`, `shot`.
- `confetti: () => [[t0, xPx, yPx, tAkhir]]` — satu ledakan per momen sukses.
- Karakter diatur di `plan.json` → `characters.host.spec` (lihat `karakter.md`). `look.host` di
  `register` menimpa spec itu (mis. `{ top: '#0f4cdb' }`). `host.style: 'classic'` memakai host
  voxel polos lama. `look.mascot`: `body, face, trim, legs, leds, pixel`.

## 6a. Aksen otomatis & efek baru

Sudah otomatis tanpa kode di `scenes.js`:
- **Caption karaoke**: kata yang sedang diucapkan menyala kuning dan memantul kecil; caption kata
  kunci seluruhnya kuning.
- **Zoom punch** di caption kata kunci + `punch` dari plan; **guncangan** dari `shake` & efek suara keras.
- **Anggukan host** di kata yang ditekankan (puncak volume + kata kunci, dihitung `align.py` →
  `TL.emphasis`), kepala turun sedikit lalu kembali.
- **Mata melirik** ke kanan layar (ke panel/props) ±1 dtk setelah pose `point_panel`, `point_up`,
  `present`, `spread`, `hold`, lalu kembali menatap kamera.

Dipanggil dari `scenes.js`:
- `ANIM.countUp(elm, t, t0, dur, to, {from, decimals, prefix, suffix})` — angka berjalan di `.v`
  (mis. `UI.bignum`). Pasangkan dengan sfx `count`.
- `PROPS.bars(stage, {values:[.3,.6,1], colors})` + `FXP.growBars(bars, t, t0)` — grafik batang 3D tumbuh.
- `FXP.coinRain(n)` + `FXP.updateCoinRain(list, t, t0)` — hujan koin 3D (±2,4 dtk).
- `sparkles: () => [[t0, xPx, yPx]]` di `register` — percikan kilau di posisi layar (mis. saat angka
  selesai menghitung).

### Props tambahan, diorama, dan HP bergerak

- `PROPS.store`, `bank`, `moneybag`, `megaphone`, `atmCard`, `eye`, `rocket` (`{g, flame}`), `trophy`,
  `calendar` (`{text}`), `cart` — semua `(stage, {x, z, scale, ...})`, voxel dengan warna bisa diatur.
- `PROPS.diorama(stage, 'shops' | 'office' | 'city')` — set kecil yang mengisi panggung
  (deretan toko, meja kantor, gedung kota).
- `smartphone(stage, {x, z, scale})` → `{g, screen, show(t, template, opsi, tap)}`. Panggil `show` tiap
  frame di `update3D`. Template (`SCREENS`): `home {badge, sub}`, `feed {t0, speed, ads, adLabel}`
  (bergulir), `chat {title, msgs:[{t, me, name, text, paid, free}]}` (pesan muncul di waktunya,
  titik "mengetik" 0,8 dtk sebelumnya), `notif {items:[{t, title, text, color}]}` (banner meluncur),
  `status {}`. `tap = {t, x, y}` (0..1) menggambar jari + riak tekan. Tanpa logo merek asli.

### Otomatis dari engine

- Garis tepi kartun pada host, maskot, dan semua props di panggung; halo glow pada benda menyala
  (`render_style` di plan untuk mematikan).
- Latar (bokeh, pola, motif) blur saat kamera dekat (close-up).
- Garis kecepatan pada efek suara `whoosh*`; debu kecil saat karakter mendarat (masuk dari
  atas/bawah, maskot `jump`).
- `loop_end`: kamera & latar kembali ke frame pertama di `loopStart()`.

## 6b. Latar adaptif

Diatur dari `background` di plan.json; engine mengubah variabel CSS `--bg1/2/3` dan `--panel`,
warna grid, kabut, pola partikel, dan ikon motif. Komponen UI memakai `var(--panel)`, jadi panel
ikut menyesuaikan tema. Untuk elemen buatan sendiri, pakai `var(--panel)` juga, bukan warna tetap.

Tema sendiri (mis. warna merek pengguna) di `setup()`:

```js
import { THEMES } from './engine.js';
THEMES.brand = { bg: ['#0f4cdb', '#0a2f8f', '#04123d'], grid: '#60a5fa', fog: '#0a2463',
                 panel: '#06163f', dots: ['#ffffff', '#93c5fd', '#facc15'], motifColor: '#bfdbfe' };
```
Lalu `"background": {"theme": "brand"}` di plan.json. `bg` = gradien tengah→tepi (cukup gelap
supaya caption putih terbaca), `fog` ≈ warna tepi, `panel` = versi sangat gelap dari warna dasar.

## 6c. Thumbnail

`thumbnail.py` memanggil `renderThumbnail()`: engine merender satu frame pada `thumbnail.props_from`
dengan shot `thumb`, panggung digeser ke kanan-tengah (`stage` default `{x:2.2, y:6.8, z:-3.2, scale:.85}`),
host/maskot dibekukan dalam pose & ekspresi dari plan, latar dari `thumbnail.background`, lalu
menyembunyikan label, caption, dan panel scene, dan menampilkan judul/badge/subtitle/footer.
`update3D(t, sid)` tetap dipanggil, jadi props tampil seperti di detik itu — pastikan props yang
mau dipamerkan memang terlihat (skala penuh) pada `props_from`.

## 7. Kesalahan umum

- **Kata pemicu tidak ada** → error `Kata "x" tidak ada di scene ...` di preview. Cocokkan dengan narasi.
- **Panel menutupi wajah** → cek zona aman shot yang aktif saat panel tampil; kecilkan panel atau ganti shot.
- **Prop terpotong saat `illustration`** → lebar prop di panggung maksimal ±2,3 unit dari pusat; pakai opsi `scale`.
- **Elemen scene sebelumnya masih tampil** → setiap `env` harus berakhir di `S[sid].end`.
- **Teks panjang meluber** → `white-space:nowrap` di chip/pill; perpendek teks, bukan kecilkan font
  di bawah 30 px.
- **Prop terpotong** → kurangi lebar atau `x`; data center dikecilkan `stage.scale.multiplyScalar(.86)`.
- **Font salah di tekstur kanvas** → engine sudah memuat Poppins/Mono sebelum `setup`; pakai
  `'800 92px Pop'` atau `'700 84px Mono'`.
