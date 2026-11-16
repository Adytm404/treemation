// ===== Video Edukasi 3D — library SET (lingkungan 3D penuh di belakang karakter) =====
// Jangan diedit per video. Set baru untuk satu video dibuat di scenes.js lewat defineSet() (lihat references/sets.md).
//
// Satuan dunia: host ±7,6 unit (≈ 1 m ≈ 3,6 unit, karakter chibi). Karakter melayang di depan (x -1,75 / 2,85, z 0,6–1,4).
// Area z > -4 di sekitar karakter dibiarkan KOSONG; isi set mulai z ≈ -5 ke belakang supaya tidak menabrak karakter.
// Lantai set di y = 0 (sama dengan lantai engine). Langit-langit opsional (disembunyikan otomatis saat kamera di atasnya).
//
// Builder: (K, opts) => { g, spots, fog, hemi, ceilingY, update(t, ctx) }
//   K       = kit (lihat makeKit di bawah): box, grp, M, part, shell, tex, inst, …
//   spots   = { nama: { pos:[x,y,z], look:[x,y,z], fov, mark:[x,y,z], chars:false } }  → shot "spot:nama"
//   fog     = { color, near, far } (null = ikut tema latar)
//   update  = dipanggil tiap frame selama set terlihat; ctx = { w, fx:{nama:true}, fxT:{nama:detikMulai}, cam }
// Setiap objek yang didaftarkan lewat K.part(obj, delay 0..1, mode) ikut animasi "build" (muncul bertahap).

export function makeKit(H) {
  const { THREE, box, grp, M, canvasTex, textBoard, rng } = H;
  const K = { THREE, box, grp, M, canvasTex, textBoard, rng, parts: null };
  /** daftarkan objek untuk animasi build: mode 'pop' (skala), 'rise' (naik dari bawah), 'grow' (tinggi dari 0), 'drop' (turun dari atas) */
  K.part = (o, d = 0, mode = 'pop') => { K.parts.push({ o, d, mode }); return o; };
  /** tandai benda menyala yang diberi halo glow (hemat: hanya beberapa per set) */
  K.glow = (...os) => { os.forEach(o => o.userData.glow = true); return os[0]; };
  const texCache = {};
  /** tekstur kanvas berulang (repeat) — dipakai untuk lantai/dinding/panel */
  K.tex = (key, w, h, draw, rep = [1, 1]) => {
    const k = key + rep.join('x'); if (texCache[k]) return texCache[k];
    const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.magFilter = THREE.NearestFilter; return texCache[k] = t;
  };
  K.texMat = (tex, basic = false) => basic ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
  /** ubin lantai: warna dasar + garis */
  K.tiles = (base, line, n = 4, rep = [8, 8], extra = null) => K.tex('tiles' + base + line + n + (extra ? 'x' : ''), 128, 128, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h); c.strokeStyle = line; c.lineWidth = 4; const s = w / n;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    extra?.(c, w, h, s);
  }, rep);
  /** balok dengan material berbeda per sisi: faces = {px,nx,py,ny,pz,nz} (material), sisanya `rest` */
  K.boxM = (parent, w, h, d, faces, rest, x, y, z) => {
    const r = typeof rest === 'string' ? M(rest) : rest;
    const mats = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(f => faces[f] || r);
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats); m.scale.set(w, h, d); m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m;
  };
  /** banyak balok kecil dalam satu draw call (LED, partikel). set(i, x,y,z, sx,sy,sz, warna) */
  K.inst = (parent, n, basic = true) => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basic ? new THREE.MeshBasicMaterial({ color: 0xffffff }) : new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    im.userData.noOutline = im.userData.noGlow = true; im.frustumCulled = false; parent.add(im);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    return { im, n, set(i, x, y, z, sx, sy, sz, col) { p.set(x, y, z); s.set(Math.max(1e-4, sx), Math.max(1e-4, sy), Math.max(1e-4, sz)); mx.compose(p, q, s); im.setMatrixAt(i, mx); if (col) im.setColorAt(i, c.set(col)); },
      done() { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } };
  };
  /** cangkang ruangan: lantai, dinding belakang + samping, langit-langit (opsional).
   *  x: lebar total, z0 (depan, positif) → z1 (belakang, negatif), h: tinggi. */
  K.shell = (g, { w = 32, z0 = 16, z1 = -43, h = 15, floor, wall = '#334155', back, ceiling = '#1e293b', ceilingOn = true, sideWalls = true } = {}) => {
    const d = z0 - z1, zc = (z0 + z1) / 2, out = { ceiling: [] };
    out.floor = box(g, w, .2, d, floor || '#94a3b8', 0, -.1, zc); out.floor.castShadow = false; K.part(out.floor, 0, 'pop');
    const wm = typeof wall === 'string' ? M(wall) : wall;
    out.back = box(g, w, h, .4, back || wm, 0, h / 2, z1); K.part(out.back, .05, 'rise');
    if (sideWalls) { out.left = box(g, .4, h, d, wm, -w / 2, h / 2, zc); out.right = box(g, .4, h, d, wm, w / 2, h / 2, zc); K.part(out.left, .08, 'rise'); K.part(out.right, .08, 'rise'); }
    if (ceilingOn) { const c = box(g, w, .3, d, ceiling, 0, h, zc); c.castShadow = false; out.ceiling.push(c); K.part(c, .12, 'drop'); }
    [out.floor, out.back, out.left, out.right, ...out.ceiling].forEach(o => { if (o) { o.castShadow = false; o.userData.noOutline = true; } });
    return out;
  };
  return K;
}

/* ================= DATA CENTER ================= */
function datacenter(K, o = {}) {
  const { THREE, box, grp, M } = K;
  const g = new THREE.Group();
  const W = 32, Z0 = 48, Z1 = -43, HH = 16;
  const floorTex = K.tiles('#c9d4e2', '#93a3b8', 2, [16, 46]);
  const ceilTex = K.tiles('#64748b', '#526077', 2, [16, 46]);
  const sh = K.shell(g, { w: W, z0: Z0, z1: Z1, h: HH, floor: K.texMat(floorTex), wall: '#2b3648', back: '#243042', ceiling: K.texMat(ceilTex, true) });
  // lajur dingin (ubin berlubang biru) di lorong tengah
  const ventTex = K.tex('vent', 64, 64, (c, w, h) => { c.fillStyle = '#9cc7f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#5b8fc7'; for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 10) c.fillRect(x, y, 5, 5); c.strokeStyle = '#6b86a8'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, [2, 15]);
  const cold = box(g, 4.4, .05, 33, K.texMat(ventTex), 0, .03, -21); cold.castShadow = false; K.part(cold, .02, 'pop');
  // tekstur muka rak: unit server bertumpuk
  const rackTex = K.tex('rackface', 96, 224, (c, w, h) => {
    c.fillStyle = '#111827'; c.fillRect(0, 0, w, h); let y = 10; const r = K.rng(4);
    while (y < h - 14) { const u = r() > .7 ? 22 : 12; c.fillStyle = r() > .5 ? '#374151' : '#2f3a4c'; c.fillRect(8, y, w - 16, u - 2);
      c.fillStyle = '#1f2937'; for (let x = 14; x < w - 34; x += 5) c.fillRect(x, y + 3, 2, u - 8); c.fillStyle = '#9ca3af'; c.fillRect(w - 26, y + u / 2 - 3, 10, 3); y += u; }
  });
  const rackFront = K.texMat(rackTex), rackSide = M('#1f2937');
  const RW = 2.2, RD = 3, RH = 7, N = o.racks ?? 14, zStart = -6.2;
  const rows = [{ x: -4.0, face: 'px' }, { x: 4.0, face: 'nx' }, { x: -11.5, face: 'px' }, { x: 11.5, face: 'nx' }];
  const racks = [], leds = [], ups = [];
  rows.forEach((row, ri) => {
    for (let i = 0; i < N; i++) {
      const z = zStart - i * RW, isUps = ri === 2 && i < 3;
      if (isUps) continue;
      const faces = { px: rackFront, nx: rackFront };
      const m = K.boxM(g, RD, RH, RW - .06, faces, rackSide, row.x, RH / 2, z); m.castShadow = false;
      const cap = box(g, RD + .1, .18, RW, '#0b1220', row.x, RH + .09, z); cap.castShadow = false;
      const d = .15 + .55 * (i / N) + ri * .04; K.part(m, d, 'grow'); K.part(cap, d + .02, 'pop');
      racks.push({ m, x: row.x, z, row: ri });
      const sx = row.face === 'px' ? row.x + RD / 2 + .04 : row.x - RD / 2 - .04;
      for (let k = 0; k < 5; k++) leds.push({ x: sx, y: .9 + k * 1.25, z: z + .55, col: ['#22c55e', '#38bdf8', '#22c55e', '#facc15', '#38bdf8'][(k + i + ri) % 5], ph: (i * 7 + k * 3 + ri * 11) % 10 });
    }
  });
  // tutup ujung baris: panel bernomor + strip menyala
  rows.forEach((row, ri) => { const z = zStart + RW / 2 + .14; const cap = box(g, RD + .2, RH + .3, .26, '#334155', row.x, (RH + .3) / 2, z);
    const strip = box(g, .22, RH - 1, .06, ri % 2 ? '#38bdf8' : '#22d3ee', row.x + (row.face === 'px' ? RD / 2 - .25 : -RD / 2 + .25), RH / 2, z + .15, true);
    const lab = K.textBoard(g, (o.rowPrefix || 'A') + (ri + 1), { w: 1.5, h: .8, x: row.x, y: RH - 1.1, z: z + .2, bg: '#0f172a', fg: '#e2e8f0', font: '800 92px Pop' });
    K.glow(strip); [cap, strip, lab].forEach(p => K.part(p, .12 + ri * .03, 'grow')); });
  // UPS / baterai cadangan (3 kabinet di baris kiri luar, menghadap lorong)
  for (let i = 0; i < 3; i++) {
    const z = zStart - i * RW, x = -11.5;
    const m = box(g, RD, 6.2, RW - .1, '#e5e7eb', x, 3.1, z); m.castShadow = false;
    const stripe = box(g, .06, .5, RW - .3, '#facc15', x + RD / 2 + .02, 5.6, z, true);
    const scr = box(g, .06, .9, 1.2, '#0f172a', x + RD / 2 + .03, 4.5, z, true); K.glow(stripe);
    const bars = [0, 1, 2, 3].map(b => box(g, .07, .62, .9, '#22c55e', x + RD / 2 + .05, 1.0 + b * .8, z, true));
    const d = .2 + i * .05; [m, stripe, scr, ...bars].forEach(p => K.part(p, d, 'pop'));
    ups.push({ m, scr, bars });
  }
  // pendingin (CRAC) di dinding belakang, dengan kipas
  const crac = [], fans = [];
  const grill = K.tex('grill', 64, 64, (c, w, h) => { c.fillStyle = '#e2e8f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#94a3b8'; for (let y = 4; y < h; y += 8) c.fillRect(4, y, w - 8, 3); }, [1, 2]);
  [-12.4, -6.2, 0, 6.2, 12.4].forEach((x, i) => {
    const u = box(g, 5.6, 8, 2.6, '#f1f5f9', x, 4, Z1 + 1.5); u.castShadow = false;
    const gr = box(g, 4.6, 3.2, .06, K.texMat(grill), x, 2.3, Z1 + 2.83);
    const panel = box(g, 1.2, .5, .06, '#0ea5e9', x - 1.4, 6.9, Z1 + 2.84, true); K.glow(panel);
    const fanG = []; for (const fx of [-1.15, 1.15]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .12, 20), M('#64748b')); ring.rotation.x = Math.PI / 2; ring.position.set(x + fx, 5.5, Z1 + 2.86); g.add(ring);
      const hub = grp(g, x + fx, 5.5, Z1 + 2.96); for (let b = 0; b < 3; b++) { const piv = grp(hub); piv.rotation.z = b * 2.094; box(piv, .26, .8, .05, '#cbd5e1', 0, .38, 0); }
      fanG.push(hub); K.part(ring, .6 + i * .03, 'pop'); K.part(hub, .62 + i * .03, 'pop'); }
    crac.push({ u, gr, panel }); fans.push(...fanG); [u, gr, panel].forEach(p => K.part(p, .55 + i * .03, 'rise'));
  });
  // tray kabel kuning di atas tiap baris + kabel turun ke rak
  const trays = [];
  rows.forEach((row, ri) => { const t = box(g, 1.7, .25, 34, '#eab308', row.x, 9.4, -22); t.castShadow = false; K.part(t, .7 + ri * .02, 'drop'); trays.push(t);
    const bundle = box(g, .5, .32, 34, '#1d4ed8', row.x, 9.05, -22); K.part(bundle, .72 + ri * .02, 'drop');
    for (const ix of [1, 5, 9, 12]) { if (ri === 2 && ix < 3) continue; const z = zStart - ix * RW; const cb = box(g, .18, 2.2, .18, ['#38bdf8', '#f472b6', '#22c55e', '#f97316'][(ix + ri) % 4], row.x + (row.face === 'px' ? .5 : -.5), 8.2, z); cb.castShadow = false; K.part(cb, .75, 'drop'); } });
  // lampu langit-langit (panel menyala)
  const lights = [];
  for (const x of [0, -7.75, 7.75]) for (let z = 40; z > -40; z -= 6.5) { const l = box(g, 1.4, .12, 3.8, '#f8fafc', x, HH - .25, z, true); l.castShadow = false; lights.push(l); sh.ceiling.push(l); K.part(l, .14, 'drop'); }
  // papan tanda lorong
  const sign = K.textBoard(g, o.sign || 'HALL A', { w: 3.2, h: .9, x: 0, y: 11.9, z: -5, bg: '#0f172a', fg: '#7dd3fc', font: '800 92px Mono' }); K.part(sign, .8, 'drop'); sh.ceiling.push(sign);
  const hang = box(g, .08, 3.8, .08, '#475569', 0, 14.2, -5); sh.ceiling.push(hang); K.part(hang, .8, 'drop');
  // instanced: LED, partikel udara dingin, paket data
  const LED = K.inst(g, leds.length), AIR = K.inst(g, 90), PKT = K.inst(g, 48), STREAK = K.inst(g, 24);
  const r = K.rng(17); const air = Array.from({ length: 90 }, () => ({ x: (r() - .5) * 4, z: -6 - r() * 30, sp: 1.6 + r() * 1.4, ph: r() * 10, s: .22 + r() * .22 }));
  const pk = Array.from({ length: 48 }, (_, i) => ({ row: i % 4, sp: 7 + r() * 4, ph: r() * 34, col: i % 3 ? '#67e8f9' : '#fde047' }));
  const st = Array.from({ length: 24 }, (_, i) => ({ x: [-12.4, -6.2, 0, 6.2, 12.4][i % 5] + (r() - .5) * 3.6, y: 1.2 + r() * 2.6, ph: r() * 3, sp: 9 + r() * 5 }));
  const spots = {
    lorong:    { pos: [0, 6.2, 4],     look: [0, 4.6, -30],   fov: 52, mark: [0, 7.5, -22] },
    rak:       { pos: [.9, 5.4, -11.5], look: [-2.6, 4.2, -16.4], fov: 42, mark: [-2.4, 7.6, -15.1] },
    pendingin: { pos: [0, 6.4, -24],   look: [0, 5.4, -41],   fov: 50, mark: [0, 8.3, -39.6], markScale: .75 },
    listrik:   { pos: [-5.4, 6.4, 3.5], look: [-10.4, 3.4, -9], fov: 46, mark: [-10, 7.4, -8.4] },
    jaringan:  { pos: [0, 7.4, -3.5],  look: [-4, 9.8, -20],  fov: 50, mark: [-4, 10.2, -16] },
    atas:      { pos: [9, 27, 12],     look: [0, 1, -18],     fov: 50, mark: [0, 8, -20] },
  };
  return {
    g, spots, ceilingY: HH, ceiling: sh.ceiling,
    fog: { color: '#0b1324', near: 38, far: 120 }, hemi: { sky: '#dbeafe', ground: '#1e293b', intensity: 2.2 },
    handles: { racks, ups, crac, fans, trays },
    update(t, { w, fx, fxT }) {
      leds.forEach((l, i) => { const on = Math.sin(t * 2.3 + l.ph * 1.7) > -.35; LED.set(i, l.x, l.y, l.z, .06, .16, .22, on ? l.col : '#1e293b'); }); LED.done();
      const cool = fx.cold, fs = cool ? 9 : 2.2; fans.forEach((f, i) => f.rotation.z = t * fs + i);
      air.forEach((a, i) => { if (!cool) { AIR.set(i, 0, -50, 0, 0, 0, 0); return; } const lt = t - fxT.cold; const u = ((lt * a.sp * .25 + a.ph * .1) % 1); const k = Math.min(1, lt * 2);
        AIR.set(i, a.x + Math.sin(t + a.ph) * .3, .2 + u * 7.5, a.z, a.s * k * (1 - u), a.s * k * (1 - u), a.s * k * (1 - u), i % 3 ? '#bae6fd' : '#e0f2fe'); }); AIR.done();
      st.forEach((s, i) => { if (!cool) { STREAK.set(i, 0, -50, 0, 0, 0, 0); return; } const u = ((t - fxT.cold) * s.sp * .1 + s.ph) % 1; STREAK.set(i, s.x, s.y, Z1 + 3 + u * 14, .14, .14, 2.2 * (1 - u) + .01, '#e0f2fe'); }); STREAK.done();
      pk.forEach((p, i) => { if (!fx.data) { PKT.set(i, 0, -50, 0, 0, 0, 0); return; } const z = -5 - ((t - fxT.data) * p.sp + p.ph) % 34; PKT.set(i, rows[p.row].x, 9.05, z, .62, .44, .9, p.col); }); PKT.done();
      ups.forEach((u, i) => u.bars.forEach((b, j) => { const lit = fx.power ? (Math.floor((t - fxT.power) * 3 + i) % 5) > j : true; b.material = M(lit ? '#22c55e' : '#14532d', true); }));
    },
  };
}

/* ================= KANTOR (open office) ================= */
function office(K, o = {}) {
  const { THREE, box, grp, M } = K;
  const g = new THREE.Group(); const W = 32, Z0 = 48, Z1 = -40, HH = 15;
  const floorTex = K.tiles('#b08a62', '#9a7552', 1, [10, 30], (c, w, h) => { c.fillStyle = '#a07e58'; for (let i = 0; i < 6; i++) c.fillRect(0, i * 22, w, 2); });
  const sh = K.shell(g, { w: W, z0: Z0, z1: Z1, h: HH, floor: K.texMat(floorTex), wall: '#e2e8f0', back: '#cbd5e1', ceiling: K.texMat(K.tiles('#e2e8f0', '#cbd5e1', 2, [16, 44]), true) });
  // dinding kaca belakang + gedung kota di luar
  const sky = box(g, W - 1, 10, .2, '#7dd3fc', 0, 7.5, Z1 + .3, true); sky.castShadow = false; K.part(sky, .1, 'rise');
  const city = []; const r = K.rng(8);
  for (let i = 0; i < 12; i++) { const h = 3 + r() * 6, x = -14 + i * 2.6; const b = box(g, 2.2, h, .3, ['#1e3a8a', '#334155', '#1e40af', '#475569'][i % 4], x, 2.5 + h / 2, Z1 + .5); b.castShadow = false; city.push(b); K.part(b, .15 + i * .01, 'grow');
    for (let y = 3.3; y < 2.5 + h - .4; y += 1.1) { const wl = box(g, 1.4, .35, .05, '#fef9c3', x, y, Z1 + .7, true); K.part(wl, .2, 'pop'); } }
  for (let x = -15; x <= 15; x += 5) { const mul = box(g, .3, 11, .3, '#94a3b8', x, 7.5, Z1 + .9); K.part(mul, .2, 'rise'); }
  const rail = box(g, W - 1, .3, .3, '#94a3b8', 0, 2.5, Z1 + .9); K.part(rail, .2, 'rise');
  // meja kerja: 2 baris × 3, layar menyala
  const desks = [], screens = [];
  const screenTex = K.tex('code', 64, 40, (c, w, h) => { c.fillStyle = '#0f172a'; c.fillRect(0, 0, w, h); const cols = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6']; for (let y = 4; y < h - 2; y += 5) { c.fillStyle = cols[(y / 5 | 0) % 4]; c.fillRect(4 + (y % 3) * 4, y, 14 + ((y * 7) % 30), 2); } });
  [[-8, -12], [0, -12], [8, -12], [-8, -24], [0, -24], [8, -24]].forEach(([x, z], i) => {
    const d = .25 + i * .06; const top = box(g, 6, .3, 3.4, '#f8fafc', x, 2.75, z); K.part(top, d, 'pop'); desks.push(top);
    for (const [lx, lz] of [[-2.8, -1.5], [2.8, -1.5], [-2.8, 1.5], [2.8, 1.5]]) K.part(box(g, .25, 2.6, .25, '#64748b', x + lx, 1.3, z + lz), d, 'grow');
    for (const sx of [-1.5, 1.5]) { const mon = box(g, 2.2, 1.4, .15, '#111827', x + sx, 4.2, z - .9); const scr = K.boxM(g, 2.0, 1.2, .05, { pz: K.texMat(screenTex, true) }, '#111827', x + sx, 4.2, z - .8); const st = box(g, .2, .7, .2, '#334155', x + sx, 3.3, z - .9);
      [mon, scr, st].forEach(p => K.part(p, d + .03, 'pop')); screens.push(scr);
      const chair = grp(g, x + sx, 0, z + 2.4); box(chair, 1.5, .3, 1.5, '#1e293b', 0, 1.9, 0); box(chair, 1.5, 1.8, .25, '#1e293b', 0, 2.9, .7); box(chair, .25, 1.7, .25, '#475569', 0, .9, 0); K.part(chair, d + .05, 'pop'); }
  });
  // tanaman, papan tulis, rak buku
  const plants = [[-14, -6], [14, -6], [-14, -33], [14, -33]].map(([x, z], i) => { const pg = grp(g, x, 0, z); box(pg, 1.4, 1.6, 1.4, '#c2410c', 0, .8, 0); box(pg, 1.9, 1.6, 1.9, '#16a34a', 0, 2.5, 0); box(pg, 1.2, 1.2, 1.2, '#22c55e', .2, 3.7, .1); K.part(pg, .5 + i * .04, 'pop'); return pg; });
  const wb = grp(g, -15.5, 6.5, -16); box(wb, .2, 4.2, 8, '#ffffff', 0, 0, 0); box(wb, .25, 4.5, 8.3, '#94a3b8', -.05, 0, 0);
  const wbLines = [[1.2, '#ef4444'], [.4, '#2563eb'], [-.4, '#16a34a'], [-1.2, '#2563eb']].map(([y, c], i) => box(wb, .05, .22, 4 - i * .6, c, .12, y, -1 + i * .3));
  wb.rotation.y = 0; K.part(wb, .45, 'pop');
  const shelf = grp(g, 15.4, 0, -16); box(shelf, .8, 7, 7, '#92400e', 0, 3.5, 0); for (let y = 1.2; y < 7; y += 1.6) { box(shelf, .9, .15, 7, '#78350f', 0, y, 0); for (let k = 0; k < 8; k++) box(shelf, .6, 1.1, .45, ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#a855f7'][(k + y | 0) % 5], -.1, y + .65, -3 + k * .8); } K.part(shelf, .5, 'pop');
  const lights = []; for (const x of [-8, 0, 8]) for (let z = 40; z > -36; z -= 7) { const l = box(g, 3, .12, 1.2, '#fffbeb', x, HH - .25, z, true); lights.push(l); sh.ceiling.push(l); K.part(l, .14, 'drop'); }
  const spots = {
    meja:  { pos: [3.2, 7.4, -3],   look: [0, 3.6, -13],  fov: 48, mark: [0, 6.2, -12.9] },
    layar: { pos: [1.5, 4.6, -7.2], look: [1.5, 4.2, -12.9], fov: 40, mark: [1.5, 5.6, -12.9] },
    papan: { pos: [-6.5, 7, -8.5],  look: [-15.4, 6.3, -16.2], fov: 46, mark: [-15.2, 9.4, -16] },
    jendela: { pos: [0, 7, -16],    look: [0, 7.2, -40],  fov: 54, mark: [0, 11, -39] },
    atas:  { pos: [0, 30, 6],       look: [0, 0, -16],    fov: 50, mark: [0, 6, -18] },
  };
  return { g, spots, ceilingY: HH, ceiling: sh.ceiling, fog: { color: '#8ea3bf', near: 55, far: 130 }, hemi: { sky: '#ffffff', ground: '#94a3b8', intensity: 2.2 },
    handles: { desks, screens, plants, whiteboard: wb, wbLines },
    update(t, { fx, fxT }) {
      screenTex.offset.y = fx.work ? ((t - fxT.work) * .35) % 1 : 0;
      wbLines.forEach((l, i) => { const k = fx.write ? Math.min(1, Math.max(0, (t - fxT.write) * 1.4 - i * .6)) : 1; l.scale.z = Math.max(.001, (4 - i * .6) * k); });
    } };
}

/* ================= GUDANG (warehouse / logistik) ================= */
function warehouse(K, o = {}) {
  const { THREE, box, grp, M } = K;
  const g = new THREE.Group(); const W = 34, Z0 = 48, Z1 = -44, HH = 18;
  const floorTex = K.tiles('#9ca3af', '#8b929c', 1, [6, 10], (c, w, h) => { c.fillStyle = '#facc15'; c.fillRect(w * .46, 0, w * .08, h); });
  const sh = K.shell(g, { w: W, z0: Z0, z1: Z1, h: HH, floor: K.texMat(floorTex), wall: '#64748b', back: '#475569', ceiling: K.texMat(K.tiles('#475569', '#3b4556', 1, [10, 30]), true) });
  // rak tinggi berisi kardus
  const shelves = [], boxes = [];
  const r = K.rng(12);
  for (const x of [-12, -6.5, 6.5, 12]) for (let s = 0; s < 3; s++) {
    const z = -9 - s * 9; const sg = grp(g, x, 0, z); const d = .2 + s * .12 + (Math.abs(x) > 8 ? .05 : 0);
    for (const [px, pz] of [[-1.3, -3.9], [1.3, -3.9], [-1.3, 3.9], [1.3, 3.9]]) box(sg, .3, 12, .3, '#ea580c', px, 6, pz);
    for (let lv = 0; lv < 4; lv++) { const y = .6 + lv * 3.4; box(sg, 2.9, .25, 8.1, '#1d4ed8', 0, y, 0);
      for (let k = 0; k < 4; k++) if (r() > .18) { const bx = box(sg, 2.2 + r() * .3, 1.6 + r() * 1.1, 1.7, r() > .3 ? '#c08a4f' : '#a87442', 0, y + 1.1, -2.9 + k * 1.95); bx.position.y = y + .12 + bx.scale.y / 2; boxes.push(bx); } }
    K.part(sg, d, 'grow'); shelves.push(sg);
  }
  // konveyor di tengah dengan kardus berjalan
  const conv = grp(g, 0, 0, -16); box(conv, 3, .5, 26, '#334155', 0, 2.2, 0); box(conv, 2.6, .1, 26, '#111827', 0, 2.5, 0); for (let z = -12; z <= 12; z += 4) box(conv, .3, 2, .3, '#64748b', 1.3, 1, z), box(conv, .3, 2, .3, '#64748b', -1.3, 1, z);
  K.part(conv, .3, 'grow');
  const parcels = Array.from({ length: 7 }, (_, i) => { const p = grp(conv, 0, 3.15, 0); box(p, 1.5, 1.2, 1.4, i % 3 ? '#c08a4f' : '#d1a46a', 0, 0, 0); box(p, 1.52, .2, .3, '#f8fafc', 0, .2, 0); return p; });
  // pintu bongkar muat + truk
  const door = box(g, 9, 10, .3, '#94a3b8', 0, 5, Z1 + .4); const doorLines = []; for (let y = 1; y < 10; y += 1) doorLines.push(box(g, 9, .08, .1, '#64748b', 0, y, Z1 + .6));
  const truck = grp(g, 0, 0, Z1 - 5); box(truck, 6.5, 6, 9, '#f8fafc', 0, 4, 0); box(truck, 6.6, 1, 9.1, '#ef4444', 0, 2, 0); [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([x, z]) => box(truck, .8, 1.6, 1.6, '#111827', x, .8, z)); K.part(truck, .4, 'pop');
  // forklift
  const fork = grp(g, -3.4, 0, -30); box(fork, 2.2, 1.6, 3, '#facc15', 0, 1.6, 0); box(fork, 1.8, 1.8, 1.6, '#1f2937', 0, 3.3, .3); box(fork, .2, 4.6, .2, '#111827', -.8, 2.5, -1.7); box(fork, .2, 4.6, .2, '#111827', .8, 2.5, -1.7); const tines = grp(fork, 0, .5, -1.9); box(tines, 1.8, .15, 1.6, '#111827', 0, 0, -.8); const fbox = box(tines, 1.6, 1.3, 1.4, '#c08a4f', 0, .75, -.8);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => box(fork, .4, .9, .9, '#111827', x * 1.15, .45, z * 1.0)); fork.rotation.y = .35; K.part(fork, .5, 'pop');
  const lights = []; for (const x of [-9, 0, 9]) for (let z = 40; z > -40; z -= 8) { const l = box(g, 1.2, .3, 1.2, '#fef3c7', x, HH - .5, z, true); lights.push(l); sh.ceiling.push(l); K.part(l, .14, 'drop'); }
  const spots = {
    rak:      { pos: [1.5, 8.5, 4],   look: [-9, 6, -14],   fov: 50, mark: [-6.5, 13.2, -9] },
    konveyor: { pos: [4.5, 6.8, -4],  look: [0, 2.6, -18],  fov: 46, mark: [0, 5.6, -12] },
    truk:     { pos: [0, 7, -18],     look: [0, 4.5, -46],  fov: 52, mark: [0, 11, -43] },
    forklift: { pos: [2, 9, -16],     look: [-3.4, 2.6, -30], fov: 46, mark: [-3.4, 6.4, -30] },
    atas:     { pos: [0, 34, 8],      look: [0, 0, -18],    fov: 52, mark: [0, 6, -16] },
  };
  return { g, spots, ceilingY: HH, ceiling: sh.ceiling, fog: { color: '#1f2937', near: 40, far: 125 }, hemi: { sky: '#fef3c7', ground: '#334155', intensity: 2.3 },
    handles: { shelves, boxes, conveyor: conv, parcels, door, truck, forklift: fork },
    update(t, { fx, fxT }) {
      parcels.forEach((p, i) => { const run = fx.ship ? (t - fxT.ship) : 0; const u = ((i / parcels.length) + run * .09) % 1; p.position.z = 12.5 - u * 25; p.visible = true; });
      const lift = fx.lift ? Math.min(1, (t - fxT.lift) * .6) : 0; tines.position.y = .5 + Math.sin(lift * Math.PI / 2) * 3.2;
      const open = fx.open ? Math.min(1, (t - fxT.open) * .7) : 0; door.scale.y = Math.max(.001, 10 * (1 - open * .85)); door.position.y = 10 - door.scale.y / 2; doorLines.forEach(l => l.visible = l.position.y > 10 - door.scale.y);
    } };
}

/* ================= KOTA (persimpangan malam, tanpa langit-langit — langit = gradien tema) =================
 * Karakter melayang di plaza depan; jalan melintang (mobil lewat kiri↔kanan) di z -6…-14; jalan raya menjauh ke belakang. */
function city(K, o = {}) {
  const { THREE, box, grp, M } = K;
  const g = new THREE.Group();
  const plazaTex = K.tiles('#cbd5e1', '#a8b3c4', 2, [20, 18]);
  const plaza = box(g, 120, .3, 54, K.texMat(plazaTex), 0, -.15, 21); K.part(plaza, 0, 'pop');
  const flat = (...os) => os.forEach(o => o.userData.noOutline = true);
  const cross = box(g, 120, .2, 8, '#1f2937', 0, -.1, -10); K.part(cross, .02, 'pop');
  const ave = box(g, 12, .2, 70, '#1f2937', 0, -.1, -49); K.part(ave, .04, 'pop'); flat(plaza, cross, ave);
  for (const sx of [-1, 1]) { const sw = box(g, 9, .5, 70, '#94a3b8', sx * 10.5, .05, -49); K.part(sw, .05, 'pop'); }
  const lines = [];
  for (let x = -40; x <= 40; x += 5) { const l = box(g, 2.4, .05, .35, '#fde047', x, .03, -10, true); lines.push(l); K.part(l, .06, 'pop'); }
  for (let z = -18; z > -84; z -= 5) { const l = box(g, .35, .05, 2.4, '#fde047', 0, .03, z, true); lines.push(l); K.part(l, .06, 'pop'); }
  for (let x = -5; x <= 5; x += 1.4) { const zc = box(g, .8, .05, 3, '#f8fafc', x, .04, -16.2); K.part(zc, .07, 'pop'); }
  const buildings = [], wins = []; const r = K.rng(31);
  const tower = (x, z, w, d, h, col, face, dl) => { const b = box(g, w, h, d, col, x, h / 2, z); buildings.push(b); K.part(b, dl, 'grow');
    for (let y = 2.2; y < h - 1; y += 2.4) for (let k = 0; k < 3; k++) { if (r() < .28) continue;
      const off = (k - 1) * (face === 'z' ? w : d) * .28; const wl = face === 'z' ? box(g, 1.3, 1.1, .06, '#fef08a', x + off, y, z + d / 2 + .03, true) : box(g, .06, 1.1, 1.3, '#fef08a', x + (face === 'x+' ? w / 2 + .03 : -w / 2 - .03), y, z + off, true);
      wins.push({ m: wl, ph: r() * 40 }); K.part(wl, dl + .05, 'pop'); } };
  const cols = ['#312e81', '#1e3a8a', '#3730a3', '#334155', '#4c1d95'];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) { const h = 9 + r() * 16, w = 7, z = -22 - i * 8.5; tower(sx * (15 + w / 2), z, w, 7.6, h, cols[(i + (sx > 0 ? 2 : 0)) % 5], sx < 0 ? 'x+' : 'x-', .12 + i * .05); }
    for (let i = 0; i < 4; i++) { const h = 8 + r() * 14, w = 9; tower(sx * (19 + i * 10), -20, w, 6, h, cols[(i + 3) % 5], 'z', .1 + i * .04); }
  }
  // toko di sudut kiri (menghadap kamera)
  const shop = grp(g, -14, 0, -.5); shop.rotation.y = Math.PI / 2; box(shop, 7, 4.2, .3, '#fde68a', 0, 2.4, 0); box(shop, 4, 2.6, .1, '#7dd3fc', .8, 2.2, .2, true); box(shop, 1.4, 3, .1, '#7c2d12', -2.4, 1.5, .2);
  for (let k = 0; k < 7; k++) box(shop, 1, .5, 1.6, k % 2 ? '#ffffff' : '#ef4444', -3 + k, 4.9, .9).rotation.x = .35;
  K.textBoard(shop, o.shopSign || 'TOKO', { w: 3, h: .8, x: 0, y: 5.8, z: .2, bg: '#FFD60A' }); K.part(shop, .35, 'pop');
  const lamps = [];
  for (const sx of [-1, 1]) for (let z = -20; z > -80; z -= 13) { const lg = grp(g, sx * 7, 0, z); box(lg, .3, 9, .3, '#475569', 0, 4.5, 0); box(lg, 1.8, .3, .3, '#475569', -sx * .8, 9, 0); K.glow(box(lg, .9, .3, .7, '#fef3c7', -sx * 1.5, 8.8, 0, true)); lamps.push(lg); K.part(lg, .3, 'rise'); }
  for (const sx of [-1, 1]) { const lg = grp(g, sx * 9, 0, -4.5); box(lg, .3, 9, .3, '#475569', 0, 4.5, 0); box(lg, .3, .3, 1.8, '#475569', 0, 9, -.8); box(lg, .7, .3, .9, '#fef3c7', 0, 8.8, -1.5, true); lamps.push(lg); K.part(lg, .3, 'rise'); }
  const mkCar = (col) => { const cg = grp(g); box(cg, 2.6, 1.3, 5, col, 0, 1.1, 0); box(cg, 2.2, 1.1, 2.6, col, 0, 2.2, .2); box(cg, 2.25, .8, 2.3, '#93c5fd', 0, 2.25, .2, true);
    for (const [x, z] of [[-1.3, -1.6], [1.3, -1.6], [-1.3, 1.6], [1.3, 1.6]]) box(cg, .4, .9, .9, '#111827', x, .45, z);
    box(cg, .5, .3, .1, '#fef9c3', -.8, 1.3, -2.52, true); box(cg, .5, .3, .1, '#fef9c3', .8, 1.3, -2.52, true); box(cg, .5, .3, .1, '#ef4444', -.8, 1.3, 2.52, true); box(cg, .5, .3, .1, '#ef4444', .8, 1.3, 2.52, true); return cg; };
  const CC = ['#ef4444', '#3b82f6', '#f8fafc', '#facc15', '#22c55e', '#f97316', '#a855f7', '#14b8a6'];
  // jalan melintang: lajur depan ke kanan, lajur belakang ke kiri
  const crossCars = [0, 1, 2, 3].map(i => { const c = mkCar(CC[i]); c.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2; return { g: c, lane: i % 2 ? -12 : -8, dir: i % 2 ? -1 : 1, ph: i * 21 }; });
  // jalan raya: menjauh di lajur kanan, mendekat di lajur kiri (muncul/hilang mengecil di ujung)
  const aveCars = [4, 5, 6, 7].map(i => { const c = mkCar(CC[i]); if (i % 2) c.rotation.y = Math.PI; return { g: c, x: i % 2 ? -2.8 : 2.8, dir: i % 2 ? 1 : -1, ph: i * 15 }; });
  const spots = {
    jalan:  { pos: [0, 6, -17],     look: [0, 3.5, -55],  fov: 50, mark: [0, 6, -30] },
    gedung: { pos: [5, 4, -14],     look: [13, 15, -30],  fov: 56, mark: [11.2, 18, -30] },
    toko:   { pos: [-4.5, 6.4, 6],  look: [-13.6, 3.4, -.5], fov: 46, mark: [-13.4, 7.6, -.5] },
    persimpangan: { pos: [12, 14, 6], look: [0, 1, -14], fov: 48, mark: [0, 5, -10] },
    atas:   { pos: [0, 44, 14],     look: [0, 0, -26],    fov: 50, mark: [0, 6, -30] },
  };
  return { g, spots, ceilingY: null, ceiling: [], fog: null, hemi: { sky: '#c7d2fe', ground: '#1e1b4b', intensity: 2.0 },
    handles: { buildings, lamps, shop, crossCars, aveCars },
    update(t, { fx, fxT }) {
      const sp = fx.rush ? 2.2 : 1;
      crossCars.forEach(c => { const u = ((t * 8 * sp + c.ph) % 90); c.g.position.set(c.dir > 0 ? -45 + u : 45 - u, 0, c.lane); });
      aveCars.forEach(c => { const u = ((t * 6 * sp + c.ph) % 62) / 62; const z = c.dir < 0 ? -24 - u * 56 : -80 + u * 56; const k = Math.min(1, Math.min(u, 1 - u) * 14);
        c.g.position.set(c.x, 0, z); c.g.scale.setScalar(Math.max(.001, k)); });
      wins.forEach(w => { w.m.visible = fx.lights ? (t - fxT.lights) * 6 > w.ph * .25 : true; });
    } };
}

export const SET_LIBRARY = { datacenter, office, warehouse, city };
