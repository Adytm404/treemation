// ===== Karakter gaya "pixel skin" (blok ala game sandbox, wajah & baju bertekstur piksel) =====
// Semua karakter dibuat dari spesifikasi (spec) — desain orisinal, bukan karakter milik pihak lain.
// Satuan: 1 "px" kulit = P unit dunia. Tekstur 2× (HD) supaya mata bisa ekspresif.

export const PIXEL_PRESETS = {
  raka:  { gender: 'male',   skin: '#C98E64', hair: '#2a1d17', hairStyle: 'messy',     eyes: '#3b2a20', outfit: 'hoodie',  top: '#14B8A6', accent: '#F8FAFC', bottom: 'pants', bottomColor: '#334155', shoes: '#F1F5F9', accessories: ['glasses'] },
  nara:  { gender: 'female', skin: '#F2C7A5', hair: '#6b3f2a', hairStyle: 'long',      eyes: '#2f7d6d', outfit: 'blazer',  top: '#1f2440', accent: '#e9b949', inner: '#f8fafc', ribbon: '#2dd4bf', bottom: 'skirt', bottomColor: '#1e2a4a', shoes: '#2b2b2b', socks: '#f1f5f9', accessories: ['cat_ears'], earColor: '#f9a8d4', blush: true },
  sinta: { gender: 'female', skin: '#F5D3BA', hair: '#b9a4a0', hairStyle: 'bob',       eyes: '#22a06b', outfit: 'blouse',  top: '#f8fafc', accent: '#3b5bdb', bottom: 'skirt', bottomColor: '#3b5bdb', shoes: '#f8fafc', accessories: ['flower_crown'], blush: true },
  dimas: { gender: 'male',   skin: '#B87A52', hair: '#3b2416', hairStyle: 'short',     eyes: '#2b1d14', outfit: 'tshirt',  top: '#111827', accent: '#FACC15', bottom: 'pants', bottomColor: '#2d4a7a', shoes: '#e5e7eb', accessories: ['cap'], capColor: '#ef4444' },
  aira:  { gender: 'female', skin: '#E9B98F', hair: '#15151d', hairStyle: 'ponytail',  eyes: '#5b3b2a', outfit: 'hoodie',  top: '#8b5cf6', accent: '#f5f3ff', bottom: 'pants', bottomColor: '#1f2937', shoes: '#f8fafc', accessories: ['headphones'], blush: true },
  budi:  { gender: 'male',   skin: '#A86F48', hair: '#121212', hairStyle: 'short',     eyes: '#241811', outfit: 'batik',   top: '#7c3f12', accent: '#f4c27a', bottom: 'pants', bottomColor: '#1f2937', shoes: '#3f2a1d', accessories: ['beard'] },
  salsa: { gender: 'female', skin: '#E8B48C', hair: '#2b2b2b', hairStyle: 'hijab', hijab: '#a78bfa', eyes: '#3b2a20', outfit: 'blouse', top: '#f8fafc', accent: '#7c3aed', sleeves: 'long', bottom: 'long_skirt', bottomColor: '#4c1d95', shoes: '#f8fafc', accessories: [], blush: true },
  lala:  { gender: 'female', skin: '#F7D9C4', hair: '#f4c95d', hairStyle: 'twintails', eyes: '#3b82f6', outfit: 'sweater', top: '#fdf2f8', accent: '#f472b6', bottom: 'skirt', bottomColor: '#be185d', shoes: '#be185d', socks: '#ffffff', accessories: ['bow'], bowColor: '#f472b6', blush: true },
};

const R = 2;                    // tekstur per px kulit
export const P = 0.24;          // unit dunia per px kulit (tinggi total ±32px ≈ 7.7 unit)

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function shade(h, k) { const [r, g, b] = hex2rgb(h); const f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; }

export function buildPixelHost(THREE, parent, spec, opts = {}) {
  const S = { ...PIXEL_PRESETS.raka, ...(spec.preset ? PIXEL_PRESETS[spec.preset] : {}), ...spec };
  S.accessories = S.accessories || [];
  const hijab = S.hairStyle === 'hijab';
  if (hijab) S.hair = S.hijab || '#a78bfa';
  const female = S.gender === 'female', slim = S.arms ? S.arms === 'slim' : female;
  const rnd = rng(S.seed || 7);
  const texs = [];

  // ---------- kanvas & tekstur ----------
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function tex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; texs.push(t); return t; }
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  function noiseFill(x, w, h, col, v = .07, y0 = 0, y1 = h) { for (let Y = y0; Y < y1; Y++) for (let X = 0; X < w; X++) px(x, X, Y, shade(col, (rnd() - .5) * 2 * v)); }
  function hairFill(x, w, h, col, y0 = 0, y1 = h, mask = null) {
    for (let X = 0; X < w; X++) { const strand = hijab ? 0 : (X % 3 === 0 ? -.12 : X % 3 === 1 ? .04 : -.03); for (let Y = y0; Y < y1; Y++) { if (mask && !mask(X, Y)) continue; px(x, X, Y, shade(col, strand + (rnd() - .5) * .1 + (Y % 7 === 3 ? .08 : 0))); } }
  }
  const mat = (t, transparent = false) => new THREE.MeshLambertMaterial({ map: t, transparent, alphaTest: transparent ? .5 : 0 });
  function boxMesh(w, h, d, mats) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), mats); m.castShadow = true; m.receiveShadow = true; return m; }
  function solidTex(w, h, col, v = .06) { const [c, x] = canvas(w * R, h * R); noiseFill(x, w * R, h * R, col, v); return tex(c); }

  // ---------- rambut: panjang poni per kolom & panjang sisi ----------
  const fringe = { messy: [6, 5, 7, 4, 6, 5, 4, 7, 5, 6, 4, 7, 5, 6, 5, 7], short: [5, 5, 4, 4, 5, 5, 4, 4, 4, 4, 5, 5, 4, 4, 5, 5],
    long: [6, 6, 5, 5, 6, 5, 5, 4, 4, 5, 5, 6, 5, 5, 6, 6], bob: [6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6],
    ponytail: [5, 5, 5, 4, 4, 4, 5, 3, 3, 5, 4, 4, 4, 5, 5, 5], hijab: [16, 16, 7, 6, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 16, 16], twintails: [6, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 6, 5, 5, 5, 6], bun: [5, 5, 4, 4, 4, 4, 4, 3, 3, 4, 4, 4, 4, 4, 5, 5] }[S.hairStyle] || [5, 5, 4, 4, 5, 5, 4, 4, 4, 4, 5, 5, 4, 4, 5, 5];
  const sideLen = { messy: 9, short: 8, long: 16, bob: 13, ponytail: 10, twintails: 13, bun: 9, hijab: 16 }[S.hairStyle] ?? 9;
  const F = (X) => fringe[Math.max(0, Math.min(15, X))];

  // ---------- wajah (16×16) per kombinasi mata/mulut ----------
  const faceCache = {};
  const ink = '#1a1420', lash = hijab ? '#2a1d24' : shade(S.hair, -.55);
  function drawEyes(x, state) {
    const eyes = [[2, 1], [10, -1]];            // kolom kiri mata, arah (untuk highlight/sayap)
    for (const [c0, dir] of eyes) {
      const outer = dir > 0 ? c0 : c0 + 3, inner = dir > 0 ? c0 + 3 : c0;
      if (state === 'closed') { for (let i = 0; i < 4; i++) px(x, c0 + i, 10, lash); continue; }
      if (state === 'happy') { px(x, outer, 10, lash); px(x, c0 + 1, 9, lash); px(x, c0 + 2, 9, lash); px(x, inner, 10, lash); continue; }
      const top = state === 'wide' ? 8 : 9, bot = state === 'wide' ? 12 : 11;
      const lashRow = state === 'half' ? 9 : top - 1;
      for (let Y = top; Y <= bot; Y++) for (let i = 0; i < 4; i++) {
        const c = c0 + i; const sclera = c === outer;
        let col = sclera ? '#ffffff' : (Y === top ? shade(S.eyes, -.3) : Y === bot ? shade(S.eyes, .4) : shade(S.eyes, .1));
        if (state === 'wide' && (Y === top || Y === bot) && !sclera) col = '#ffffff';
        if (state === 'half' && Y <= 9) continue;
        px(x, c, Y, col);
      }
      const hlX = dir > 0 ? c0 + 2 : c0 + 1; px(x, hlX, top + (state === 'wide' ? 1 : 0), '#ffffff');
      for (let i = 0; i < 4; i++) px(x, c0 + i, lashRow, lash);
      if (female) { px(x, dir > 0 ? c0 - 1 : c0 + 4, lashRow, lash); px(x, dir > 0 ? c0 - 1 : c0 + 4, lashRow - 1, lash); }
      if (state === 'worried') { px(x, inner, lashRow - 2, lash); px(x, inner + (dir > 0 ? -1 : 1), lashRow - 1, lash); }
      if (state === 'wide') { for (let i = 0; i < 3; i++) px(x, c0 + (dir > 0 ? i + 1 : i), lashRow - 2, hijab ? '#3b2a20' : shade(S.hair, -.3)); }
    }
  }
  function drawMouth(x, m) {      // baris 13–15 (di bawah bingkai kacamata)
    const d = shade(S.skin, -.5), red = '#6b1d24', pink = '#e88a95', W = '#ffffff', sd = shade(S.skin, -.28);
    const row = (Y, cols) => cols.forEach(([c, col]) => px(x, c, Y, col));
    if (m === 'closed') row(13, [[7, d], [8, d]]);
    else if (m === 'smile') { row(13, [[6, d], [9, d]]); row(14, [[7, d], [8, d]]); }
    else if (m === 'smirk') { row(13, [[9, d]]); row(14, [[7, d], [8, d]]); }
    else if (m === 'open1') { row(13, [[6, d], [7, red], [8, red], [9, d]]); row(14, [[7, red], [8, red]]); }
    // ---- lip sync vokal ----
    else if (m === 'vA' || m === 'open2') { row(13, [[6, d], [7, W], [8, W], [9, d]]); row(14, [[6, red], [7, red], [8, red], [9, red]]); row(15, [[6, d], [7, pink], [8, pink], [9, d]]); }  // A: lebar & tinggi
    else if (m === 'vI') { row(13, [[5, d], [6, W], [7, W], [8, W], [9, W], [10, d]]); row(14, [[5, sd], [6, d], [7, d], [8, d], [9, d], [10, sd]]); }                                   // I: lebar pipih, gigi
    else if (m === 'vE') { row(13, [[5, sd], [6, d], [7, W], [8, W], [9, d], [10, sd]]); row(14, [[6, red], [7, red], [8, red], [9, red]]); }                                          // E: sedang
    else if (m === 'vO') { row(13, [[7, d], [8, d]]); row(14, [[6, d], [7, red], [8, red], [9, d]]); row(15, [[7, d], [8, d]]); }                                                     // O/U: bulat
  }
  function faceTex(eyes, mouth) {
    const key = eyes + '|' + mouth; if (faceCache[key]) return faceCache[key];
    const [c, x] = canvas(16, 16);
    noiseFill(x, 16, 16, S.skin, .04);
    for (let X = 0; X < 16; X++) { const len = (X <= 0 || X >= 15) ? sideLen : F(X); hairFill(x, 16, 16, S.hair, 0, Math.min(16, len), (cx) => cx === X); if (!hijab) px(x, X, Math.min(15, len), shade(S.hair, -.35)); }
    if (S.blush) { for (const cc of [[2, 12], [3, 12], [12, 12], [13, 12]]) px(x, cc[0], cc[1], 'rgba(240,120,140,.55)'); }
    if (S.accessories.includes('beard')) { for (let Y = 12; Y < 16; Y++) for (let X = 2; X < 14; X++) if (!(Y >= 13 && X >= 5 && X <= 10)) px(x, X, Y, shade(S.hair, (rnd() - .5) * .2)); }
    drawEyes(x, eyes); drawMouth(x, mouth);
    if (S.accessories.includes('glasses')) { const g = '#111827'; for (const c0 of [1, 9]) { for (let i = 0; i < 6; i++) { px(x, c0 + i, 7, g); px(x, c0 + i, 12, g); } for (let Y = 7; Y <= 12; Y++) { px(x, c0, Y, g); px(x, c0 + 5, Y, g); } } px(x, 7, 9, g); px(x, 8, 9, g); }
    return (faceCache[key] = tex(c));
  }

  // ---------- kepala ----------
  const root = new THREE.Group(); parent.add(root);
  const hs = S.headScale ?? 1.08;   // kepala sedikit besar = lebih imut
  function headSide(flip) {               // sisi kiri/kanan: belakang rambut, depan bawah kulit (kecuali rambut panjang)
    const [c, x] = canvas(16, 16); noiseFill(x, 16, 16, S.skin, .04);
    for (let X = 0; X < 16; X++) { const fromFront = flip ? 15 - X : X; const len = fromFront < 5 ? Math.max(sideLen, 6) : 16; hairFill(x, 16, 16, S.hair, 0, len, cx => cx === X); }
    if (sideLen < 16) { const ex = flip ? 9 : 5; px(x, ex, 10, shade(S.skin, -.15)); px(x, ex + 1, 10, shade(S.skin, -.15)); px(x, ex, 11, shade(S.skin, -.15)); }
    return tex(c);
  }
  function hairOnly(w, h, mask) { const [c, x] = canvas(w, h); hairFill(x, w, h, S.hair, 0, h, mask); return tex(c); }
  const head = new THREE.Group(); head.scale.setScalar(hs);
  const faceMat = mat(faceTex('open', 'closed'));
  const headBox = boxMesh(8, 8, 8, [mat(headSide(true)), mat(headSide(false)), mat(hairOnly(16, 16)), mat(solidTex(8, 8, S.skin)), faceMat, mat(hairOnly(16, 16))]);
  headBox.position.y = 4 * P; head.add(headBox);
  // lapisan luar rambut (volume)
  const L = 1.13;
  const outerFront = hairOnly(16, 16, (X, Y) => Y < ((X <= 0 || X >= 15) ? Math.min(sideLen, 16) : F(X) - 1));
  const outerSide = flip => hairOnly(16, 16, (X, Y) => { const ff = flip ? 15 - X : X; return Y < (ff < 4 ? Math.min(sideLen, 16) - 1 : Math.min(16, Math.max(sideLen, 9) + 2)); });
  const outerBack = hairOnly(16, 16, (X, Y) => Y < Math.min(16, Math.max(sideLen, 10) + 3));
  const [ec] = canvas(4, 4); const empty = tex(ec);
  const hairShell = boxMesh(8 * L, 8 * L, 8 * L, [mat(outerSide(true), true), mat(outerSide(false), true), mat(hairOnly(16, 16)), mat(empty, true), mat(outerFront, true), mat(outerBack, true)]);
  hairShell.position.y = 4 * P + .2 * P; head.add(hairShell);
  const hairBox = (w, h, d, x, y, z, rot = 0) => { const m = boxMesh(w, h, d, mat(hairOnly(Math.max(2, Math.round(w * R)), Math.max(2, Math.round(h * R))))); m.position.set(x * P, y * P, z * P); m.rotation.x = rot; head.add(m); return m; };
  if (S.hairStyle === 'messy') { [[-2.5, 2], [0.5, 2.5], [3, 1.8], [-0.8, 1.6]].forEach(([x, h], i) => hairBox(2.2, h, 3, x, 8.6 + h / 2, -1 + i * .8)); }
  if (S.hairStyle === 'long') { hairBox(9, 13, 1.6, 0, -2.5, -4.6); for (const sx of [-1, 1]) hairBox(1.6, 9, 2.2, sx * 4.3, -1.5, 2.6); }
  if (S.hairStyle === 'bob') { hairBox(9.4, 6, 1.4, 0, 3, -4.6); for (const sx of [-1, 1]) hairBox(1.4, 6, 7, sx * 4.6, 3, -.8); }
  if (S.hairStyle === 'ponytail') { hairBox(3, 3, 3, 0, 5.5, -5); const t = hairBox(2.6, 8, 2.6, 0, 0.5, -6.2, .25); }
  if (S.hairStyle === 'twintails') { for (const sx of [-1, 1]) { hairBox(2.6, 2.6, 2.6, sx * 5, 6.5, -1.5); hairBox(2.4, 10, 2.4, sx * 5.6, 0.5, -1.8); } }
  if (S.hairStyle === 'bun') { hairBox(4, 3.5, 4, 0, 9.5, -2.5); }
  if (hijab) { hairBox(9.4, 3.2, 9.4, 0, -1.5, -.2); hairBox(8, 3.5, 1.2, 0, -2.6, 4.2); hairBox(9.6, 6, 1.4, 0, -2.2, -4.7); }
  // aksesori kepala
  const acc = S.accessories;
  const cube = (w, h, d, col, x, y, z, basic = false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), basic ? new THREE.MeshBasicMaterial({ color: col }) : new THREE.MeshLambertMaterial({ map: solidTex(Math.ceil(w), Math.ceil(h), col, .08) })); m.position.set(x * P, y * P, z * P); m.castShadow = true; head.add(m); return m; };
  if (acc.includes('cat_ears')) for (const sx of [-1, 1]) { const e = cube(2.6, 2.6, 1.2, S.hair, sx * 2.8, 9.8, -.5); e.rotation.z = -sx * .2; cube(1.4, 1.5, .3, S.earColor || '#f9a8d4', sx * 2.75, 9.6, .2); }
  if (acc.includes('flower_crown')) { const cols = ['#f472b6', '#facc15', '#ffffff', '#60a5fa', '#a78bfa']; let i = 0; for (const [x, z] of [[-4, 4], [-2, 4.5], [0, 4.6], [2, 4.5], [4, 4], [4.6, 2], [4.6, 0], [4.6, -2], [4, -4], [-4.6, 2], [-4.6, 0], [-4.6, -2], [-4, -4], [0, -4.6], [2, -4.5], [-2, -4.5]]) { cube(1, 1, 1, i % 2 ? '#22c55e' : cols[(i >> 1) % cols.length], x, 8.9, z); i++; } }
  if (acc.includes('headphones')) { cube(9.4, 1, 1.4, '#1f2937', 0, 9.3, 0); for (const sx of [-1, 1]) { cube(1.2, 4, 1.2, '#1f2937', sx * 4.7, 7.3, 0); cube(1.6, 3, 3, S.accent || '#f43f5e', sx * 4.9, 4.6, .3); } }
  if (acc.includes('cap')) { cube(8.8, 2.4, 8.8, S.capColor || S.accent, 0, 9.2, 0); cube(8, .7, 4, S.capColor || S.accent, 0, 8.3, 5.5); }
  if (acc.includes('bow')) { for (const sx of [-1, 1]) cube(2, 2, 1, S.bowColor || '#f472b6', sx * 3.4 + (sx > 0 ? 0 : 0), 9.2, .5); cube(1, 1, 1.2, shade(S.bowColor || '#f472b6', -.3), 2.4, 9.2, .5); }

  // ---------- badan ----------
  const body = new THREE.Group(); root.add(body);
  const top = S.top, acc2 = S.accent || '#ffffff';
  function torsoFront() {
    const [c, x] = canvas(16, 24); noiseFill(x, 16, 24, top, .06);
    const dk = shade(top, -.25);
    switch (S.outfit) {
      case 'hoodie': for (let X = 5; X <= 10; X++) px(x, X, 0, dk); for (const X of [6, 9]) for (let Y = 1; Y < 9; Y++) px(x, X, Y, acc2); for (let Y = 14; Y < 20; Y++) for (let X = 3; X <= 12; X++) if (Y === 14 || X === 3 || X === 12) px(x, X, Y, dk); break;
      case 'shirt': for (let i = 0; i < 4; i++) { px(x, 4 + i, i, acc2); px(x, 11 - i, i, acc2); } for (const Y of [5, 10, 15, 20]) px(x, 8, Y, acc2); for (let Y = 6; Y < 10; Y++) for (let X = 3; X <= 6; X++) if (Y === 6 || X === 3 || X === 6) px(x, X, Y, dk); break;
      case 'blazer': for (let Y = 0; Y < 20; Y++) for (let X = 6; X <= 9; X++) px(x, X, Y, shade(S.inner || '#f8fafc', (rnd() - .5) * .08)); for (let Y = 0; Y < 22; Y++) { px(x, 5, Y, acc2); px(x, 10, Y, acc2); } for (const [X, Y] of [[6, 2], [7, 3], [8, 3], [9, 2], [6, 4], [9, 4], [7, 5], [8, 6]]) px(x, X, Y, S.ribbon || '#2dd4bf'); for (const Y of [12, 17]) { px(x, 4, Y, acc2); px(x, 11, Y, acc2); } break;
      case 'blouse': for (let i = 0; i < 3; i++) { px(x, 5 + i, i, shade(top, -.12)); px(x, 10 - i, i, shade(top, -.12)); } for (const [X, Y] of [[6, 3], [7, 4], [8, 4], [9, 3], [7, 5], [8, 5]]) px(x, X, Y, acc2); for (const Y of [9, 14, 19]) px(x, 8, Y, shade(top, -.2)); break;
      case 'tshirt': for (let X = 6; X <= 9; X++) px(x, X, 0, S.skin); for (let Y = 7; Y < 11; Y++) for (let X = 9; X <= 12; X++) px(x, X, Y, acc2); break;
      case 'sweater': for (const r0 of [9, 15]) for (let X = 0; X < 16; X++) { px(x, X, r0, acc2); px(x, X, r0 + 1, acc2); } for (let X = 5; X <= 10; X++) px(x, X, 0, shade(top, -.2)); break;
      case 'batik': for (let Y = 0; Y < 24; Y += 4) for (let X = (Y / 4) % 2 ? 2 : 0; X < 16; X += 4) { px(x, X + 1, Y, acc2); px(x, X, Y + 1, acc2); px(x, X + 2, Y + 1, acc2); px(x, X + 1, Y + 2, acc2); px(x, X + 1, Y + 1, shade(top, -.35)); } for (let i = 0; i < 3; i++) { px(x, 5 + i, i, shade(top, .25)); px(x, 10 - i, i, shade(top, .25)); } break;
    }
    for (let X = 0; X < 16; X++) { px(x, X, 22, shade(top, -.3)); px(x, X, 23, S.bottom === 'pants' ? shade(S.bottomColor, -.2) : shade(top, -.3)); }
    return tex(c);
  }
  function plain(w, h, col, stripes = false) { const [c, x] = canvas(w, h); noiseFill(x, w, h, col, .06); if (stripes) for (const r0 of [9, 15]) for (let X = 0; X < w; X++) { px(x, X, r0, acc2); px(x, X, r0 + 1, acc2); } if (S.outfit === 'batik') for (let Y = 0; Y < h; Y += 4) for (let X = 0; X < w; X += 4) { px(x, X + 1, Y + 1, acc2); } return tex(c); }
  const torso = boxMesh(8, 12, 4, [mat(plain(8, 24, top, S.outfit === 'sweater')), mat(plain(8, 24, top, S.outfit === 'sweater')), mat(solidTex(8, 4, shade(top, -.1))), mat(solidTex(8, 4, top)), mat(torsoFront()), mat(plain(16, 24, top, S.outfit === 'sweater'))]);
  torso.position.y = 6 * P; body.add(torso);
  if (S.outfit === 'hoodie') { const h = boxMesh(7, 2.4, 2.2, mat(solidTex(7, 3, shade(top, -.1)))); h.position.set(0, 11.4 * P, -2.6 * P); body.add(h); }
  if (S.outfit === 'blazer') { for (const sx of [-1, 1]) { const lp = boxMesh(2.2, 9, .6, mat(solidTex(3, 9, top))); lp.position.set(sx * 3.1 * P, 7.4 * P, 2.15 * P); body.add(lp); } }

  // ---------- lengan ----------
  const aw = slim ? 3 : 4;
  const sleeveLen = S.sleeves === 'long' ? 20 : S.sleeves === 'short' ? 9 : ({ tshirt: 9, blouse: 10, shirt: 20, batik: 10 }[S.outfit] ?? 20);
  function armTex(w) {
    const [c, x] = canvas(w * R, 24); noiseFill(x, w * R, 24, S.skin, .04);
    for (let Y = 0; Y < sleeveLen; Y++) for (let X = 0; X < w * R; X++) px(x, X, Y, shade(top, (rnd() - .5) * .12));
    if (S.outfit === 'sweater') for (const r0 of [5, 11, 17]) for (let X = 0; X < w * R; X++) { px(x, X, r0, acc2); px(x, X, r0 + 1, acc2); }
    if (S.outfit === 'blazer') for (let X = 0; X < w * R; X++) px(x, X, sleeveLen - 1, acc2);
    if (S.outfit === 'batik') for (let Y = 1; Y < sleeveLen; Y += 4) for (let X = 1; X < w * R; X += 4) px(x, X, Y, acc2);
    if (sleeveLen < 20) for (let X = 0; X < w * R; X++) px(x, X, sleeveLen, shade(top, -.25));
    for (let Y = 20; Y < 24; Y++) for (let X = 0; X < w * R; X++) px(x, X, Y, shade(S.skin, -.08 + (rnd() - .5) * .06));
    return tex(c);
  }
  const arms = {};
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * (4 + aw / 2) * P, 11 * P, 0); body.add(g);
    const t = armTex(aw), endTop = solidTex(aw, 4, top), endBot = solidTex(aw, 4, S.skin);
    const m = boxMesh(aw, 12, 4, [mat(t), mat(t), mat(endTop), mat(endBot), mat(t), mat(t)]); m.position.y = -5 * P; g.add(m);
    arms[sx < 0 ? 'L' : 'R'] = g;
  }

  // ---------- kaki ----------
  const legs = [];
  function legTex() {
    const [c, x] = canvas(8, 24); const skirt = S.bottom === 'skirt';
    if (S.bottom === 'long_skirt') { noiseFill(x, 8, 24, S.bottomColor, .06); noiseFill(x, 8, 24, S.shoes, .05, 21, 24); return tex(c); }
    noiseFill(x, 8, 24, skirt ? S.skin : S.bottomColor, .06);
    if (S.bottom === 'shorts') noiseFill(x, 8, 24, S.skin, .04, 10, 24);
    if (skirt && S.socks) noiseFill(x, 8, 24, S.socks, .04, 10, 21);
    if (!skirt && S.bottom !== 'shorts') for (let Y = 0; Y < 20; Y += 6) px(x, 2, Y + 3, shade(S.bottomColor, -.2));
    noiseFill(x, 8, 24, S.shoes, .05, 20, 24); for (let X = 0; X < 8; X++) px(x, X, 23, shade(S.shoes, -.3));
    return tex(c);
  }
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 2 * P, 12 * P, 0); root.add(g);
    const t = legTex(); const m = boxMesh(4, 12, 4, [mat(t), mat(t), mat(solidTex(4, 4, S.bottomColor)), mat(solidTex(4, 4, S.shoes)), mat(t), mat(t)]); m.position.y = -6 * P; g.add(m);
    legs.push(g);
  }
  if (S.bottom === 'skirt') {
    const sk = (w, h, d, y) => { const [c, x] = canvas(Math.round(w * R), Math.round(h * R)); noiseFill(x, c.width, c.height, S.bottomColor, .06); for (let X = 1; X < c.width; X += 3) for (let Y = 0; Y < c.height; Y++) px(x, X, Y, shade(S.bottomColor, -.25)); const m = boxMesh(w, h, d, mat(tex(c))); m.position.y = y * P; body.add(m); return m; };
    sk(8.6, 3, 4.6, -.5); sk(9.6, 3.2, 5.4, -3.4);
  }
  if (S.bottom === 'long_skirt') {
    const sk = (w, h, d, y) => { const [c, x] = canvas(Math.round(w * R), Math.round(h * R)); noiseFill(x, c.width, c.height, S.bottomColor, .06); for (let X = 2; X < c.width; X += 4) for (let Y = 0; Y < c.height; Y++) px(x, X, Y, shade(S.bottomColor, -.18)); const m = boxMesh(w, h, d, mat(tex(c))); m.position.y = y * P; body.add(m); return m; };
    sk(8.6, 4, 4.6, -1); sk(9.2, 4, 5.0, -5); sk(9.8, 3, 5.6, -8.6);
  }

  body.position.y = 12 * P;            // pinggul
  const neckY = 12 * P;                // relatif body
  head.position.y = neckY; body.add(head);

  // ---------- antarmuka untuk engine ----------
  const host = { root, body, head, arms, legs, bodyY: 12 * P, spec: S, style: 'pixel' };
  host.face = ({ expr, open, blink, pose, viseme }) => {
    let eyes = { wow: 'wide', worried: 'worried', smirk: 'half', joy: 'happy' }[expr] || 'open';
    if (pose === 'celebrate' && expr === 'happy') eyes = 'happy';
    if (blink) eyes = 'closed';
    const rest = expr === 'smirk' ? 'smirk' : (expr === 'happy' || expr === 'joy' || expr === 'wow') ? 'smile' : 'closed';
    let mouth = viseme !== undefined && viseme !== null
      ? (viseme === '-' ? rest : 'v' + viseme)                                  // lip sync vokal A/I/E/O
      : (open > .55 ? 'open2' : open > .2 ? 'open1' : rest);                    // cadangan: dari volume
    faceMat.map = faceTex(eyes, mouth);
  };
  return host;
}

/** tekstur noise piksel untuk benda polos (maskot, props) */
export function pixelSkin(THREE, col, w = 16, h = 16, v = .07, seed = 3) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const r = rng(seed);
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) { x.fillStyle = shade(col, (r() - .5) * 2 * v); x.fillRect(X, Y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** perkecil kanvas jadi piksel (untuk mata maskot gaya piksel) */
export function pixelate(THREE, srcTex, w = 32, h = 16) {
  const src = srcTex.image; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 90 ? 255 : 0; x.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
