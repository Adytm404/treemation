// ===== Video Edukasi 3D — engine =====
// Jangan diedit per video. Semua isi video ditulis di scenes.js (lihat references/engine-api.md).
import * as THREE from 'three';
import { buildPixelHost, pixelSkin, pixelate, PIXEL_PRESETS } from './pixelchar.js';
export { THREE, PIXEL_PRESETS };
export const TL = window.TL, W = 1080, H = 1920, FPS = TL.fps;

/* ---------- helpers ---------- */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const backOut = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const P = (t, t0, d) => clamp((t - t0) / d);
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const S = {}; TL.scenes.forEach(s => S[s.id] = s);
/** waktu mulai kata `word` di scene `sid` (occ = kemunculan ke-n, mulai 0) */
export function T(sid, word, occ = 0) {
  if (word === '@start') return S[sid].start + .1;
  if (word === '@end') return S[sid].end;
  let n = 0;
  for (const w of TL.words) {
    if (w.scene !== sid) continue;
    if (w.display.toLowerCase() === word.toLowerCase() || w.spoken.toLowerCase() === word.toLowerCase()) { if (n === occ) return w.start; n++; }
  }
  throw new Error(`Kata "${word}" tidak ada di scene ${sid}`);
}
/** detik teks hook selesai (0 kalau tidak ada hook) — panel UI scene pertama sebaiknya muncul setelah ini */
export const hookEnd = () => (TL.hook && TL.hook.until_t) || 0;
export function sceneAt(t) { for (const s of TL.scenes) if (t >= s.start && t < s.end) return s; return TL.scenes[TL.scenes.length - 1]; }
/** amplop muncul/hilang: null jika di luar [tin,tout]. o=opacity, sc=skala pop, pi=progres masuk */
export function env(t, tin, tout, inD = .4, outD = .3) {
  if (t < tin || t > tout) return null;
  const pi = clamp((t - tin) / inD), po = clamp((tout - t) / outD);
  return { pi, po, o: Math.min(easeOut(pi), easeOut(po)), sc: lerp(.55, 1, backOut(pi)) * lerp(.85, 1, easeOut(po)) };
}
export function setPop(el, e, base = '', extra = '') {
  if (!e) { el.style.display = 'none'; return; }
  el.style.display = ''; el.style.opacity = e.o; el.style.transform = `${base} scale(${e.sc}) ${extra}`;
}
export const $ = id => document.getElementById(id);
export function icon(name) { const s = window.ICONS[name]; if (!s) throw new Error('Ikon tidak ada: ' + name); return s; }
export function css(text) { const s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); }
/** buat elemen dari HTML; data-icon="nama" diganti SVG lucide */
export function el(markup, style = {}, parent = $('scene-ui')) {
  const w = document.createElement('div'); w.innerHTML = markup.trim(); const e = w.firstElementChild;
  e.querySelectorAll('[data-icon]').forEach(x => { x.outerHTML = icon(x.dataset.icon); });
  if (!e.classList.contains('abs')) e.classList.add('abs');
  Object.assign(e.style, style); e.style.display = 'none'; parent.appendChild(e); return e;
}

/* ---------- fonts ---------- */
for (const f of ['600 40px Pop', '700 40px Pop', '800 92px Pop', '900 104px Pop', '700 84px Mono']) await document.fonts.load(f);

/* ---------- three ---------- */
export const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x16216f, 30, 64);
export const camera = new THREE.PerspectiveCamera(36, W / H, .1, 200);
export const CAM = { x: 0, y: 8.7, z: 24, lookY: 7.9, drift: .25 };
/** Preset shot kamera. pos/look = koordinat dunia, fov = derajat vertikal.
 *  Host berdiri di x≈-1.75 (kepala y≈5–7.6), maskot di x≈2.85 (tinggi ≈2.7), panggung di (0.55, 8.35, -3). */
export const SHOTS = {
  wide:         { pos: [0, 8.7, 24],      look: [0, 7.9, 0],      fov: 36 },   // dua karakter + panggung (default)
  wide_far:     { pos: [0, 9.8, 29.5],    look: [0, 8.6, 0],      fov: 36 },   // lebih lega, karakter lebih kecil
  host_medium:  { pos: [-1.2, 6.9, 14.5], look: [-1.45, 6.2, 0],  fov: 36 },   // host setengah badan, gestur terlihat
  host_close:   { pos: [-1.45, 6.7, 12.2], look: [-1.7, 6.45, .6], fov: 34 },   // wajah host memenuhi bawah layar
  mascot_close: { pos: [2.1, 4.0, 12.6],  look: [2.6, 3.7, 1.4],  fov: 36 },  // maskot dekat, lengan host di kiri
  illustration: { pos: [.55, 12.4, 12.6], look: [.55, 10.2, -3],  fov: 38, hideChars: true },   // fokus props; karakter minggir dulu ke luar bingkai
  low_angle:    { pos: [0, 3.6, 18.5],    look: [0, 7.3, 0],      fov: 40 },
  thumb:        { pos: [.2, 8.6, 21],     look: [.2, 8.1, 0],     fov: 36 },   // khusus thumbnail   // dari bawah, kesan heroik
};
export const SHOT_MOVE = .7;   // durasi default transisi 'move' (detik)
scene.add(new THREE.HemisphereLight(0xd4dcff, 0x26307a, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-7, 15, 13); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 16, bottom: -4, near: 1, far: 50 }); key.shadow.bias = -0.0008; scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6); rim.position.set(8, 7, -10); scene.add(rim);
const grid = new THREE.GridHelper(90, 60, 0xffffff, 0xffffff); grid.material.vertexColors = false; grid.material.color = new THREE.Color('#4d6bff'); grid.material.transparent = true; grid.material.opacity = .5; grid.position.y = .002; scene.add(grid);
const hemi = scene.children.find(o => o.isHemisphereLight);

/* ---------- tema latar (adaptif per scene) ----------
 * bg: 3 warna gradien (tengah→tepi), grid: garis lantai, fog: kabut jauh (≈ warna tepi),
 * panel: warna dasar panel UI, dots: palet partikel (bokeh/bintang/gelembung), motifColor: warna ikon latar.
 * Tambah tema sendiri di setup(): THEMES.namaku = {...}. */
export const THEMES = {
  night_blue: { bg: ['#2536b0', '#1a2788', '#0d1656'], grid: '#4d6bff', fog: '#16216f', panel: '#0d1442', dots: ['#ff5fa2', '#5fb4ff', '#ffd23f', '#ffffff', '#aa8cff'], motifColor: '#9fb4ff' },
  deep_space: { bg: ['#3b1d8f', '#22115c', '#0a0524'], grid: '#8b5cf6', fog: '#1b0f45', panel: '#160b3d', dots: ['#ffffff', '#c4b5fd', '#f0abfc', '#93c5fd'], motifColor: '#c4b5fd' },
  ocean:      { bg: ['#0e86a8', '#0b5874', '#062b3d'], grid: '#22d3ee', fog: '#0a4258', panel: '#06283a', dots: ['#67e8f9', '#a5f3fc', '#ffffff', '#38bdf8'], motifColor: '#a5f3fc' },
  arctic:     { bg: ['#3a8fd6', '#1f5fa3', '#0b2a55'], grid: '#bae6fd', fog: '#17497f', panel: '#0b2550', dots: ['#ffffff', '#e0f2fe', '#bae6fd'], motifColor: '#e0f2fe' },
  mint:       { bg: ['#12907f', '#0f665c', '#05302b'], grid: '#34d399', fog: '#0b4a43', panel: '#062b27', dots: ['#6ee7b7', '#ffffff', '#fde68a', '#5eead4'], motifColor: '#a7f3d0' },
  tech_dark:  { bg: ['#253246', '#151d2b', '#05080f'], grid: '#38bdf8', fog: '#111827', panel: '#0b1220', dots: ['#38bdf8', '#22c55e', '#ffffff'], motifColor: '#7dd3fc' },
  sunset:     { bg: ['#e0592a', '#9a2f2a', '#3b0f24'], grid: '#fb923c', fog: '#6b1d2a', panel: '#33101f', dots: ['#fde68a', '#fb923c', '#ffffff', '#f472b6'], motifColor: '#fed7aa' },
  berry:      { bg: ['#b0246a', '#73124a', '#2a0520'], grid: '#f472b6', fog: '#4f0d35', panel: '#2a0620', dots: ['#f9a8d4', '#ffffff', '#fde68a', '#c4b5fd'], motifColor: '#fbcfe8' },
  gold:       { bg: ['#b7791f', '#7c4a12', '#2b1806'], grid: '#facc15', fog: '#4a2c0b', panel: '#2a1806', dots: ['#fde68a', '#ffffff', '#fbbf24'], motifColor: '#fef3c7' },
  grape:      { bg: ['#6d3fd6', '#4a23a0', '#1a0b45'], grid: '#a78bfa', fog: '#2f1670', panel: '#1b0d48', dots: ['#ffd23f', '#f0abfc', '#ffffff', '#5fb4ff'], motifColor: '#ddd6fe' },
};
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixHex(a, b, k) { _c1.set(a); _c2.set(b); _c1.lerp(_c2, k); return '#' + _c1.getHexString(); }
function hexRgb(h) { _c1.set(h); return `${Math.round(_c1.r * 255)},${Math.round(_c1.g * 255)},${Math.round(_c1.b * 255)}`; }
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: .32 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const mats = {};
export function M(c, basic = false) { const k = c + basic; if (!mats[k]) mats[k] = basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c }); return mats[k]; }
const GEO = new THREE.BoxGeometry(1, 1, 1);
/** balok voxel: box(parent, w,h,d, warna, x,y,z, basic=false) — basic=true untuk lampu/menyala */
export function box(parent, w, h, d, c, x, y, z, basic = false) { const m = new THREE.Mesh(GEO, typeof c === 'string' ? M(c, basic) : c); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
export function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
/** papan teks 3D (tekstur kanvas di sisi depan) */
export function textBoard(parent, text, { w = 2.2, h = .7, bg = '#ffffff', fg = '#0b1033', font = '800 92px Pop', x = 0, y = 0, z = 0 } = {}) {
  const tex = canvasTex(640, Math.round(640 * h / w), (c, cw, ch) => { c.fillStyle = bg; c.fillRect(0, 0, cw, ch); c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; let fs = parseInt(font.match(/(\d+)px/)[1]); while (c.measureText(text).width > cw * .9 && fs > 20) { fs -= 4; c.font = font.replace(/\d+px/, fs + 'px'); } c.fillText(text, cw / 2, ch / 2 + 4); });
  const side = M('#e5e7eb'); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .12), [side, side, side, side, new THREE.MeshBasicMaterial({ map: tex }), side]);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
/** sprite teks yang selalu menghadap kamera */
export function textSprite(text, { color = '#FFD60A', font = '700 84px Mono', scale = 1.5 } = {}) {
  const tex = canvasTex(256, 128, (c, w, h) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = '#0b1033'; c.strokeText(text, w / 2, h / 2); c.fillStyle = color; c.fillText(text, w / 2, h / 2); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sp.scale.set(scale, scale / 2, 1); scene.add(sp); return sp;
}
const _v = new THREE.Vector3();
/** posisi layar (px) dari objek 3D + offset lokal */
export function screenOf(obj, off = [0, 0, 0]) { _v.set(...off); obj.localToWorld(_v); _v.project(camera); return [(_v.x + 1) / 2 * W, (1 - _v.y) / 2 * H]; }

/* ---------- characters ---------- */
export const host = {}, mascot = {};
export const POSES = {
  idle: () => ({}),
  scratch: (lt, w) => ({ Lz: -2.55, Lx: -.55 + w * .08, tilt: .12 }),
  point_up: () => ({ Rz: 2.75, Rx: -.2 }),
  point_panel: () => ({ Rz: 2.15, Rx: -.45, tilt: -.05 }),
  present: () => ({ Rz: 1.25, Rx: -.75, Lz: -.5, Lx: -.4 }),
  spread: () => ({ Rz: 1.35, Lz: -1.35, Rx: -.2, Lx: -.2 }),
  count: lt => ({ Rz: .55, Rx: -1.75 + Math.sin(lt * 3) * .06 }),
  thumbs: () => ({ Rz: .35, Rx: -1.45 }),
  shrug: () => ({ Rz: .9, Lz: -.9, Rx: -.8, Lx: -.8, tilt: .1 }),
  hold: () => ({ Rz: .45, Rx: -1.35 }),
  shake: (lt, w) => ({ Rz: .55 + w * .22, Rx: -1.55 }),
  point_viewer: () => ({ Rz: .3, Rx: -1.6 }),
  think: () => ({ Lz: -.6, Lx: -2.3, tilt: .1 }),
  wave: lt => ({ Rz: 2.4 + Math.sin(lt * 8) * .3, Rx: -.2 }),
  celebrate: lt => ({ Rz: 2.75 + Math.sin(lt * 7) * .2, Lz: -2.75 - Math.sin(lt * 7) * .2, body: Math.abs(Math.sin(lt * 7)) * .12 }),
};
export const EXPR = { joy: { bl: .1, br: .1, sm: 1, tilt: 0 }, talk: { bl: 0, br: 0, sm: 0, tilt: 0 }, curious: { bl: .14, br: -.02, sm: 0, tilt: .12 }, happy: { bl: .08, br: .08, sm: 1, tilt: 0 }, wow: { bl: .18, br: .18, sm: .4, tilt: 0 }, worried: { bl: .1, br: .1, sm: 0, tilt: .3 }, smirk: { bl: 0, br: .16, sm: 1, tilt: 0 }, serious: { bl: -.06, br: -.06, sm: 0, tilt: 0 } };

function buildHost(c) {
  host.root = grp(scene, -1.75, 0, 0.6); host.root.rotation.y = .2;
  const r = host.root;
  for (const sx of [-1, 1]) { box(r, .95, .38, 1.25, c.shoes, sx * .55, .19, .12); box(r, .9, .1, .95, '#c9d0de', sx * .55, .42, .0); box(r, .86, 2.0, .92, c.pants, sx * .55, 1.38, 0); }
  host.body = grp(r, 0, 2.38, 0); const b = host.body;
  box(b, 2.35, 2.3, 1.2, c.shirt, 0, 1.15, 0);
  box(b, 2.37, .28, 1.22, '#1f2937', 0, .14, 0);
  box(b, .5, .45, .08, c.shirtDark, -.55, 1.55, .62);
  box(b, .7, .32, .1, c.collar, -.27, 2.18, .58).rotation.z = -.35; box(b, .7, .32, .1, c.collar, .27, 2.18, .58).rotation.z = .35;
  box(b, .22, .22, .06, '#e2fbf6', 0, 1.82, .62); box(b, .22, .22, .06, '#e2fbf6', 0, 1.3, .62);
  host.arms = {};
  for (const sx of [-1, 1]) { const a = grp(b, sx * 1.5, 2.1, 0); box(a, .72, 1.05, .82, c.shirt, 0, -.48, 0); box(a, .66, 1.15, .74, c.skin, 0, -1.55, 0); box(a, .7, .45, .78, c.skinDark, 0, -2.25, 0); host.arms[sx < 0 ? 'L' : 'R'] = a; }
  box(b, .8, .35, .8, c.skin, 0, 2.42, 0);
  host.head = grp(b, 0, 2.55, 0); const h = host.head;
  box(h, 2.1, 2.05, 1.95, c.skin, 0, 1.02, 0);
  for (const sx of [-1, 1]) box(h, .18, .5, .4, c.skinDark, sx * 1.12, .95, 0);
  box(h, 2.22, .5, 2.06, c.hair, 0, 2.18, -.02); box(h, 2.22, 1.5, .38, c.hair, 0, 1.45, -.88);
  for (const sx of [-1, 1]) box(h, .26, .95, 1.7, c.hair, sx * 1.07, 1.62, -.15);
  box(h, 1.35, .42, .3, c.hair, -.42, 1.86, .94); box(h, .6, .3, .3, c.hair, .55, 1.95, .94); box(h, .45, .62, .3, c.hair, -.95, 1.7, .9);
  box(h, .9, .35, .5, c.hair, .3, 2.48, .2).rotation.z = -.15;
  host.eyes = [];
  for (const sx of [-1, 1]) {
    const eg = grp(h, sx * .47, 1.05, .99); box(eg, .46, .46, .04, '#FFFFFF'); const p = box(eg, .2, .26, .05, '#111827', -sx * .04, -.02, .02); host.eyes.push({ g: eg, p, sx });
    if (c.glasses) { box(h, .72, .09, .08, '#0f172a', sx * .47, 1.36, 1.04); box(h, .72, .09, .08, '#0f172a', sx * .47, .74, 1.04); box(h, .09, .7, .08, '#0f172a', sx * .47 + .36, 1.05, 1.04); box(h, .09, .7, .08, '#0f172a', sx * .47 - .36, 1.05, 1.04); }
  }
  if (c.glasses) { box(h, .26, .08, .08, '#0f172a', 0, 1.18, 1.04); for (const sx of [-1, 1]) box(h, .36, .08, .08, '#0f172a', sx * .92, 1.25, .9); }
  if (c.beard) { box(h, 2.0, .55, .2, c.hair, 0, .25, .9); box(h, .7, .15, .1, c.hair, 0, .55, 1.0); }
  host.brows = [-1, 1].map(sx => { const g = grp(h, sx * .47, 1.58, 1.0); box(g, .55, .14, .06, c.hair, 0, 0, 0); return { g, sx }; });
  box(h, .28, .38, .2, c.skinDark, 0, .62, 1.04);
  host.mouthG = grp(h, 0, .3, 1.0 + (c.beard ? .12 : 0));
  host.mouth = box(host.mouthG, .62, .1, .04, '#3b0f14'); host.teeth = box(host.mouthG, .5, .08, .05, '#ffffff', 0, 0, .01);
  host.corners = [-1, 1].map(sx => box(host.mouthG, .12, .1, .05, '#3b0f14', sx * .36, .06, 0));
  host.bodyY = 2.38; host.legs = []; host.style = 'classic';
  host.face = ({ e, open, blink, expr, pose, viseme }) => {
    host.brows[0].g.position.y = 1.58 + e.bl; host.brows[1].g.position.y = 1.58 + e.br;
    host.brows[0].g.rotation.z = -e.bl * .6 + (expr === 'worried' ? -.25 : 0); host.brows[1].g.rotation.z = e.br * .6 + (expr === 'worried' ? .25 : 0);
    if (viseme) { const V = { A: [.56, .42, .9], I: [.78, .13, .3], U: [.2, .2, .35], E: [.66, .24, .6], O: [.34, .34, .55], '-': [.5 + .14 * e.sm, .09, 0] }[viseme] || [.5, .09, 0]; open = V[2]; host.mouth.scale.set(V[0], V[1], .04); host.mouth.position.y = -V[1] * .35; }
    else { host.mouth.scale.set(.5 + .14 * e.sm + open * .1, .09 + open * .34, .04); host.mouth.position.y = -open * .14; }
    host.teeth.visible = open > .25; host.teeth.position.y = .02 - open * .02; host.teeth.scale.x = .42 + open * .1;
    host.corners.forEach((c, j) => { c.visible = e.sm > .3; c.position.set((j ? 1 : -1) * (.3 + open * .05), .04, 0); });
    host.eyes.forEach(o => { o.g.scale.y = blink ? .12 : 1; o.p.position.x = -o.sx * .04 + .05; o.p.position.y = -.02 + (pose === 'point_up' ? .07 : 0); });
  };
}
function buildPixel(spec) {
  const h = buildPixelHost(THREE, scene, spec);
  Object.assign(host, h); host.root.position.set(-1.75, 0, .6); host.root.rotation.y = .2;
}
function buildMascot(c) {
  mascot.root = grp(scene, 2.85, 0, 1.4); mascot.root.rotation.y = -.35; const r = mascot.root;
  for (const [x, z] of [[-.7, .5], [.7, .5], [-.7, -.5], [.7, -.5]]) box(r, .38, .5, .38, c.legs, x, .25, z);
  mascot.body = grp(r, 0, .5, 0); const b = mascot.body;
  box(b, 2.5, 2.2, 2.1, c.body, 0, 1.1, 0); box(b, 2.2, 1.9, .06, c.face, 0, 1.12, 1.05);
  for (let i = 0; i < 4; i++) box(b, .06, .12, 1.4, c.trim, 1.26, .55 + i * .22, 0);
  mascot.leds = c.leds ? [box(b, .55, .1, .06, '#22c55e', -.55, 1.86, 1.09, true), box(b, .55, .1, .06, '#38bdf8', .15, 1.86, 1.09, true), box(b, .14, .1, .06, '#facc15', .75, 1.86, 1.09, true)] : [];
  mascot.hands = [-1, 1].map(sx => { const g = grp(b, sx * 1.3, .9, .2); box(g, .35, .55, .4, c.body, sx * .12, -.15, 0); return g; });
  const ink = '#0b1033'; const mk = f => canvasTex(512, 256, (cx) => { cx.strokeStyle = ink; cx.fillStyle = ink; cx.lineWidth = 34; cx.lineCap = 'square'; f(cx); });
  mascot.eyeTex = {
    happy: mk(cx => { for (const x of [150, 362]) { cx.beginPath(); cx.moveTo(x - 62, 165); cx.lineTo(x, 95); cx.lineTo(x + 62, 165); cx.stroke(); } }),
    normal: mk(cx => { for (const x of [160, 352]) cx.fillRect(x - 26, 70, 52, 110); }),
    wow: mk(cx => { cx.lineWidth = 26; for (const x of [160, 352]) { cx.beginPath(); cx.arc(x, 128, 50, 0, 6.3); cx.stroke(); cx.fillRect(x - 16, 112, 32, 32); } }),
    question: mk(cx => { cx.font = '900 170px Pop'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('?', 160, 135); cx.fillText('?', 352, 135); }),
    dizzy: mk(cx => { cx.lineWidth = 16; for (const x of [160, 352]) { cx.beginPath(); for (let a = 0; a < 14; a += .1) { const rr = 4 + a * 4.2; cx.lineTo(x + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } cx.stroke(); } }),
    cold: mk(cx => { cx.beginPath(); cx.moveTo(100, 80); cx.lineTo(190, 128); cx.lineTo(100, 176); cx.stroke(); cx.beginPath(); cx.moveTo(412, 80); cx.lineTo(322, 128); cx.lineTo(412, 176); cx.stroke(); }),
    sad: mk(cx => { for (const x of [150, 362]) { cx.beginPath(); cx.moveTo(x - 62, 105); cx.lineTo(x, 165); cx.lineTo(x + 62, 105); cx.stroke(); } }),
    love: mk(cx => { cx.fillStyle = '#e11d48'; for (const x of [160, 352]) { cx.beginPath(); cx.moveTo(x, 185); cx.bezierCurveTo(x - 90, 120, x - 50, 50, x, 95); cx.bezierCurveTo(x + 50, 50, x + 90, 120, x, 185); cx.fill(); } }),
    blink: mk(cx => { for (const x of [160, 352]) cx.fillRect(x - 40, 118, 80, 22); }),
  };
  if (c.pixel) {
    for (const k in mascot.eyeTex) mascot.eyeTex[k] = pixelate(THREE, mascot.eyeTex[k], 36, 18);
    b.traverse(o => { if (o.isMesh && o.material?.isMeshLambertMaterial && !o.material.map) { const col = '#' + o.material.color.getHexString(); o.material = new THREE.MeshLambertMaterial({ map: pixelSkin(THREE, col, 12, 12, .06, col.length) }); } });
  }
  mascot.eyes = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .95), new THREE.MeshBasicMaterial({ map: mascot.eyeTex.normal, transparent: true }));
  mascot.eyes.position.set(0, 1.1, 1.1); b.add(mascot.eyes);
}

/* ---------- stage (panggung melayang tempat props 3D) ---------- */
export const stage = grp(scene, .55, 0, -3);
export const STAGE = { y: 8.35, scale: 1.28 };
{ const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.7, .45, 40), M('#1c2a90')); base.castShadow = base.receiveShadow = true; stage.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, .04, 40), M('#2a3cc0')); top.position.y = .24; top.receiveShadow = true; stage.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, .07, 8, 64), M('#7aa2ff', true)); ring.rotation.x = Math.PI / 2; ring.position.y = .2; stage.add(ring);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshBasicMaterial({ color: 0x6f8dff, transparent: true, opacity: .18, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -.4; stage.add(glow); }

/* ---------- prop library (semua di atas stage, y=0.24 = permukaan) ---------- */
export const PROPS = {
  globe(parent = stage, { r = 1.75, x = 0, y = 2.2 } = {}) {
    const g = grp(parent, x, y, 0);
    const geo = new THREE.IcosahedronGeometry(r, 2); const cols = []; const rr = rng(3); const ocean = new THREE.Color('#3b82f6'), land = new THREE.Color('#34d399'), land2 = new THREE.Color('#22c55e');
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i += 3) { const yy = pos.getY(i), xx = pos.getX(i); const n = Math.sin(xx * 2.1) + Math.cos(yy * 2.7) + Math.sin((xx + yy) * 1.3); const c = n > .7 ? (rr() > .5 ? land : land2) : ocean; for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); mesh.castShadow = true; g.add(mesh);
    const dots = []; const r2 = rng(11); for (let i = 0; i < 9; i++) { const v = new THREE.Vector3(r2() - .5, r2() - .3, r2() * .8 + .2).normalize().multiplyScalar(r * 1.02); const c = box(mesh, .2, .2, .2, '#FFD60A', v.x, v.y, v.z, true); c.lookAt(0, 0, 0); dots.push(c); }
    return { g, mesh, dots };
  },
  house(parent = stage, { sign = null, x = -.2, scale = .9 } = {}) {
    const g = grp(parent, x, .26, 0); g.scale.setScalar(scale);
    box(g, 2.6, 1.8, 2.2, '#FEF3C7', -.5, .9, 0); box(g, .6, 1.0, .1, '#92400e', -.5, .5, 1.11); box(g, .6, .55, .1, '#7dd3fc', -1.3, 1.1, 1.11, true); box(g, .6, .55, .1, '#7dd3fc', .3, 1.1, 1.11, true);
    [[3.0, 2.6], [2.2, 1.9], [1.4, 1.2], [.6, .5]].forEach(([w, d], i) => box(g, w, .38, d, i % 2 ? '#dc2626' : '#ef4444', -.5, 1.99 + i * .38, 0));
    box(g, .5, .8, .5, '#b45309', .2, 2.6, -.3);
    if (sign) { box(g, .14, 1.3, .14, '#78350f', 1.3, .65, 1.45); textBoard(g, sign, { w: 1.9, h: .62, x: 1.3, y: 1.5, z: 1.5 }); }
    return { g };
  },
  rack(parent = stage, { scale = 1, x = 0, y = .24, z = 0 } = {}) {
    const g = grp(parent, x, y, z); box(g, 1.9, 3.6, 1.6, '#1f2937', 0, 1.8, 0); box(g, 2.0, .14, 1.7, '#111827', 0, 3.62, 0);
    const leds = [], slots = [];
    for (let i = 0; i < 6; i++) { const yy = .45 + i * .52; slots.push(box(g, 1.6, .4, .06, '#374151', 0, yy, .81)); for (let k = 0; k < 2; k++) leds.push(box(g, .12, .1, .05, k ? '#38bdf8' : '#22c55e', .45 + k * .22, yy, .85, true)); box(g, .7, .06, .05, '#4b5563', -.3, yy, .85); }
    g.scale.setScalar(scale); return { g, leds, slots };
  },
  dataCenter(parent = stage, { cols = 5, rows = 3 } = {}) {
    const g = grp(parent, 0, .24, 0);
    const floorB = box(g, 6.2, .15, 4.6, '#cbd5e1', 0, .07, 0);
    const walls = [box(g, 6.2, 3.2, .2, '#e2e8f0', 0, 1.6, -2.3), box(g, .2, 3.2, 4.6, '#e2e8f0', -3.1, 1.6, 0), box(g, .2, 3.2, 4.6, '#e2e8f0', 3.1, 1.6, 0), box(g, 6.4, .2, 1.4, '#94a3b8', 0, 3.3, -1.6)];
    const racks = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const rk = PROPS.rack(g, { scale: .42, x: -2.3 + c * 1.15, y: .15, z: -1.4 + r * 1.25 }); racks.push(rk); }
    const ac = box(g, 1.2, .5, .3, '#f8fafc', -1.6, 2.6, -2.1), battery = box(g, .9, 1.1, .6, '#facc15', 2.4, .7, 1.7);
    return { g, floorB, walls, racks, ac, battery };
  },
  cloud(parent = stage, { x = 0, y = 2.2, color = '#f8fafc' } = {}) {
    const g = grp(parent, x, y, 0); [[0, 0, 2.4, 1.0], [-.8, .5, 1.2, 1.0], [.4, .7, 1.4, 1.2], [1.1, .2, 1.0, .8]].forEach(([xx, yy, w, h]) => box(g, w, h, 1.3, color, xx, yy, 0)); return { g };
  },
  laptop(parent = stage, { x = 0, screen = '#38bdf8' } = {}) {
    const g = grp(parent, x, .26, 0); box(g, 2.6, .14, 1.7, '#cbd5e1', 0, .07, .3); const lid = grp(g, 0, .14, -.55); box(lid, 2.6, 1.7, .12, '#cbd5e1', 0, .85, 0); const scr = box(lid, 2.3, 1.4, .05, screen, 0, .85, .07, true); lid.rotation.x = -.25; return { g, lid, screen: scr };
  },
  phone(parent = stage, { x = 0, screen = '#38bdf8' } = {}) {
    const g = grp(parent, x, .26, 0); box(g, 1.2, 2.3, .2, '#111827', 0, 1.15, 0); const scr = box(g, 1.04, 2.0, .05, screen, 0, 1.17, .11, true); return { g, screen: scr };
  },
  coins(parent = stage, { x = 0, n = 5 } = {}) {
    const g = grp(parent, x, .26, 0); const list = []; for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .18, 20), M(i % 2 ? '#facc15' : '#eab308')); c.position.y = .1 + i * .19; c.castShadow = true; g.add(c); list.push(c); } return { g, coins: list };
  },
  lock(parent = stage, { x = 0, color = '#facc15' } = {}) {
    const g = grp(parent, x, .26, 0); box(g, 1.8, 1.5, .9, color, 0, .75, 0); box(g, .3, 1.0, .3, '#94a3b8', -.55, 1.9, 0); box(g, .3, 1.0, .3, '#94a3b8', .55, 1.9, 0); box(g, 1.4, .3, .3, '#94a3b8', 0, 2.35, 0); box(g, .3, .5, .1, '#0b1033', 0, .8, .46); return { g };
  },
  /** bangun prop sendiri: list [w,h,d,warna,x,y,z,(basic)] */
  voxels(parent = stage, list, { x = 0, y = .26, z = 0 } = {}) { const g = grp(parent, x, y, z); list.forEach(v => box(g, ...v)); return { g }; },
};
export const FXP = {
  /** partikel jatuh (salju) di stage */
  snow(parent = stage, n = 40) { const r = rng(21); return Array.from({ length: n }, () => { const m = box(parent, .09, .09, .09, '#e0f2fe', 0, 0, 0, true); m.castShadow = false; return { m, x: (r() - .5) * 5, z: (r() - .5) * 2.4 + .6, sp: .8 + r() * .8, ph: r() * 4 }; }); },
  updateSnow(list, t, t0, on) { list.forEach(s => { s.m.visible = on; if (on) s.m.position.set(s.x + Math.sin(t * 2 + s.ph) * .2, 3.6 - ((t - t0) * s.sp + s.ph) % 3.6, s.z); }); },
  /** garis cahaya melesat */
  streaks(parent = stage, n = 5) { return Array.from({ length: n }, (_, i) => { const m = box(parent, 1.6, .07, .07, i % 2 ? '#f0abfc' : '#67e8f9', 0, 0, 0, true); m.castShadow = false; return { m, y: .6 + i * .55, z: 2.3, ph: i * .37 }; }); },
  updateStreaks(list, t, t0, on) { list.forEach(f => { f.m.visible = on; if (on) { const u = ((t - t0) * 1.1 + f.ph) % 1; f.m.position.set(-4 + u * 8, f.y, f.z); } }); },
  /** angka/teks mengorbit maskot */
  orbitTexts(values) { const r = rng(5); return values.map((v, i) => ({ sp: textSprite(v), a: i / values.length * 6.283, r: 2.2 + r() * .4, y: 2.2 + r() * 1.6 })); },
  updateOrbit(list, t, tin, tout) { const on = t > tin - .1 && t < tout; list.forEach((n, i) => { n.sp.visible = on; if (on) { const k = Math.min(easeOut(P(t, tin + i * .06, .4)), easeOut(clamp((tout - t) / .3))); const a = n.a + t * 1.4; n.sp.position.set(mascot.root.position.x + Math.cos(a) * n.r * .8, n.y + 1.3 + Math.sin(t * 2 + i) * .15, 1.4 + Math.sin(a) * n.r * .6); n.sp.material.opacity = k; n.sp.scale.set(1.5 * k + .001, .75 * k + .001, 1); } }); },
};

/* ---------- UI component factories (posisi px pada kanvas 1080x1920) ---------- */
export const UI = {
  panel: (inner, st) => el(`<div class="panel">${inner}</div>`, st),
  browser: st => el(`<div class="panel browser"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="url"></span></div><div class="spin"></div><div class="site"><div class="h"></div><div class="hero"></div><div class="ln" style="width:88%"></div><div class="ln" style="width:64%"></div></div><div class="okchip"><span data-icon="check"></span>Online</div></div>`, st),
  iconCard: ({ title, icon: ic, color, n = '' }, st) => el(`<div class="panel icard"><div class="n">${n}</div><div class="ic" style="background:${color}"><span data-icon="${ic}"></span></div><div class="t">${title}</div></div>`, st),
  urlbar: ({ icon: ic = 'lock' }, st) => el(`<div class="panel urlbar"><span data-icon="${ic}"></span><div class="txt"><span class="typed"></span><span class="caret"></span></div></div>`, st),
  bignum: ({ label, value }, st) => el(`<div class="panel bignum"><div class="k">${label}</div><div class="v">${value}</div></div>`, st),
  xstamp: st => el(`<div class="xstamp"><span data-icon="x"></span></div>`, st),
  chip: ({ text, icon: ic, color }, st) => el(`<div class="panel chip"><div class="ci" style="background:${color}"><span data-icon="${ic}"></span></div>${text}</div>`, st),
  file: ({ name, icon: ic = 'file-code' }, st) => el(`<div class="file"><span data-icon="${ic}"></span>${name}</div>`, st),
  badge: ({ big, small, icon: ic, color = 'var(--green)' }, st) => el(`<div class="panel badge"><div class="bi" style="background:${color}"><span data-icon="${ic}"></span></div><div><div class="big" style="color:${color}">${big}</div><div class="sm">${small}</div></div></div>`, st),
  bubble: ({ icon: ic, bg, fg }, st) => el(`<div class="bubble" style="background:${bg};color:${fg}"><span data-icon="${ic}"></span></div>`, st),
  tag: ({ text, icon: ic }, st) => el(`<div class="tag"><span data-icon="${ic}"></span>${text}</div>`, st),
  note: ({ title, sub = '' }, st) => el(`<div class="panel note"><div class="t">${title}</div><div class="s">${sub}</div></div>`, st),
  strike: st => el(`<div class="strike"></div>`, st),
  pills: (items, st) => el(`<div class="pills">${items.map((p, i) => (i ? '<div class="arrow"></div>' : '') + `<div class="pill${i === items.length - 1 ? ' ok' : ''}">${p}</div>`).join('')}</div>`, st),
  okbadge: ({ text, icon: ic = 'check' }, st) => el(`<div class="okbadge"><span data-icon="${ic}"></span>${text}</div>`, st),
  flow: (items, st) => { const f = el(`<div class="flow"><div class="fline" style="height:${(items.length - 1) * 168 - 32}px"></div><div class="fdot"></div>${items.map(([ic, a, b], i) => `<div class="node" style="top:${i * 168}px"><div class="ni"><span data-icon="${ic}"></span></div><div class="nt">${a}<small>${b || ''}</small></div></div>`).join('')}</div>`, { width: '940px', ...st }); f.style.height = (items.length * 168) + 'px'; return f; },
  cta: ({ q, brand, accent = '', button, icon: ic = 'rocket' }, st) => el(`<div class="panel cta"><div class="q">${q}</div><div class="brand">${brand}<span>${accent}</span></div><div class="btn"><span data-icon="${ic}"></span>${button}</div></div>`, st),
};
/** animasi bawaan komponen */
export const ANIM = {
  browser(elm, t, tin, tout, tOnline) { const e = env(t, tin, tout); setPop(elm, e); if (!e) return; const on = t >= tOnline; const sp = elm.querySelector('.spin'); sp.style.display = on ? 'none' : ''; sp.style.transform = `rotate(${t * 400}deg)`; elm.querySelector('.site').style.opacity = on ? easeOut(P(t, tOnline, .3)) : 0; setPop(elm.querySelector('.okchip'), env(t, tOnline + .05, tout)); },
  typing(elm, text, t, t0, dur = .9) { const n = Math.floor(clamp((t - t0) / dur) * text.length); elm.querySelector('.typed').textContent = text.slice(0, n); elm.querySelector('.caret').style.opacity = (n < text.length || Math.floor(t * 2) % 2 === 0) ? 1 : 0; },
  pills(elm, t, triggers) { [...elm.querySelectorAll('.pill')].forEach((p, i) => p.classList.toggle('on', t >= triggers[i])); },
  flow(elm, t, triggers, tin, tout) {
    const e = env(t, tin, tout); setPop(elm, e); if (!e) return;
    const nodes = [...elm.querySelectorAll('.node')];
    nodes.forEach((n, i) => { n.classList.toggle('on', t >= triggers[i] - .05); const ne = env(t, tin + i * .12, tout, .35, .3); n.style.opacity = ne ? ne.o : 0; n.style.transform = `translateX(${ne ? (1 - easeOut(ne.pi)) * 60 : 60}px)`; });
    let dy = 52; for (let i = 0; i < nodes.length - 1; i++) if (t >= triggers[i]) dy = 52 + i * 168 + inOut(clamp((t - triggers[i]) / Math.max(.3, triggers[i + 1] - triggers[i] - .1))) * 168;
    const d = elm.querySelector('.fdot'); d.style.top = dy + 'px'; d.style.opacity = t >= triggers[0] - .05 ? 1 : 0;
  },
  /** elemen terbang dari (x0,y0) ke (x1,y1) dengan lengkung */
  fly(elm, t, t0, dur, [x0, y0], [x1, y1], { arc = 120, endScale = .35 } = {}) { const e = env(t, t0, t0 + dur + .4, .25, .25); if (!e) { elm.style.display = 'none'; return; } elm.style.display = ''; const k = inOut(P(t, t0 + .35, dur - .4)); elm.style.left = lerp(x0, x1, k) + 'px'; elm.style.top = (lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc) + 'px'; elm.style.opacity = e.o; elm.style.transform = `scale(${e.sc * lerp(1, endScale, k)})`; },
};
/** confetti: bursts = [[t0, x, y, tEnd], ...] */
const CONF_COL = ['#FFD60A', '#34D399', '#FF6FAE', '#7DD3FC', '#ffffff', '#a78bfa'];
const confetti = []; { const r = rng(42); for (let i = 0; i < 46; i++) { const d = document.createElement('div'); d.className = 'conf'; d.style.background = CONF_COL[i % CONF_COL.length]; $('confetti').appendChild(d); confetti.push({ d, a: -Math.PI / 2 + (r() - .5) * 2.6, v: 900 + r() * 900, rot: r() * 720 - 360 }); } }
function updateConfetti(t, bursts) { let b = null; for (const x of bursts) if (t >= x[0] && t < x[3] && t - x[0] < 2.2) b = x; confetti.forEach((c, i) => { if (!b) { c.d.style.display = 'none'; return; } const lt = t - b[0]; c.d.style.display = ''; c.d.style.transform = `translate(${b[1] + Math.cos(c.a) * c.v * lt * .55}px,${b[2] + Math.sin(c.a) * c.v * lt * .55 + 900 * lt * lt}px) rotate(${c.rot * lt}deg) scaleX(${Math.cos(lt * 9 + i)})`; c.d.style.opacity = clamp(1.6 - lt * .8); }); }

/* ---------- latar: pola partikel + ikon motif ---------- */
const PATTERNS = ['bokeh', 'stars', 'bubbles', 'snow', 'code', 'none'];
const patLayers = {};
{ const r = rng(7);
  const mk = (name, n, make) => { const L = document.createElement('div'); L.style.cssText = 'position:absolute;inset:0'; (name === 'bokeh' ? $('bokeh') : $('pattern')).appendChild(L); patLayers[name] = { L, items: Array.from({ length: n }, (_, i) => make(L, i)) }; };
  mk('bokeh', 30, (L, i) => { const d = document.createElement('div'); d.className = 'bk'; const sz = 14 + r() * 46; d.style.width = d.style.height = sz + 'px'; L.appendChild(d); return { d, x: r() * W, y: 120 + r() * 1300, sp: .2 + r() * .5, ph: r() * 6.28, amp: 10 + r() * 30, a: .35 + r() * .5, vy: 4 + r() * 10, ci: i }; });
  mk('stars', 70, (L, i) => { const d = document.createElement('div'); d.className = 'pt'; const sz = 2 + r() * 5; Object.assign(d.style, { width: sz + 'px', height: sz + 'px', borderRadius: '50%' }); L.appendChild(d); return { d, x: r() * W, y: r() * 1500, ph: r() * 6.28, a: .3 + r() * .6, ci: i }; });
  mk('bubbles', 22, (L, i) => { const d = document.createElement('div'); d.className = 'pt'; const sz = 18 + r() * 60; Object.assign(d.style, { width: sz + 'px', height: sz + 'px', borderRadius: '50%', borderWidth: '3px', borderStyle: 'solid' }); L.appendChild(d); return { d, x: r() * W, y: r() * 1900, sp: 25 + r() * 45, ph: r() * 6.28, a: .25 + r() * .35, ci: i }; });
  mk('snow', 60, (L, i) => { const d = document.createElement('div'); d.className = 'pt'; const sz = 4 + r() * 8; Object.assign(d.style, { width: sz + 'px', height: sz + 'px', borderRadius: '50%' }); L.appendChild(d); return { d, x: r() * W, y: r() * 1900, sp: 30 + r() * 50, ph: r() * 6.28, a: .35 + r() * .45, ci: i }; });
  mk('code', 16, (L, i) => { const d = document.createElement('div'); d.className = 'pt code'; d.textContent = Array.from({ length: 40 }, () => (r() > .5 ? '1' : '0')).join('\n'); L.appendChild(d); return { d, x: 20 + i * 66, y: -r() * 1400, sp: 30 + r() * 40, a: .08 + r() * .1, ci: i }; });
}
function drawPattern(name, w, t, th, cam) {
  const P_ = patLayers[name]; if (!P_) return; P_.L.style.opacity = w; if (w <= .001) { P_.L.style.display = 'none'; return; } P_.L.style.display = '';
  const px = -cam.x * 14, py = cam.y * 6;
  for (const b of P_.items) {
    const col = th.dots[b.ci % th.dots.length];
    if (name === 'bokeh') { const x = b.x + Math.sin(t * b.sp + b.ph) * b.amp + px; const y = ((b.y - t * b.vy) % 1500 + 1500) % 1500 + 60 + py; const c = hexRgb(col); b.d.style.background = `radial-gradient(circle, rgba(${c},.85) 0%, rgba(${c},.45) 45%, rgba(${c},0) 72%)`; b.d.style.transform = `translate(${x}px,${y}px)`; b.d.style.opacity = b.a * (.75 + .25 * Math.sin(t * .9 + b.ph)); }
    else if (name === 'stars') { b.d.style.background = col; b.d.style.transform = `translate(${b.x + px * .5}px,${b.y + py * .5}px)`; b.d.style.opacity = b.a * (.6 + .4 * Math.sin(t * 1.3 + b.ph)); }
    else if (name === 'bubbles') { const y = ((b.y - t * b.sp) % 2000 + 2000) % 2000 - 80; b.d.style.borderColor = col; b.d.style.transform = `translate(${b.x + Math.sin(t + b.ph) * 20 + px}px,${y}px)`; b.d.style.opacity = b.a; }
    else if (name === 'snow') { const y = ((b.y + t * b.sp) % 2000 + 2000) % 2000 - 60; b.d.style.background = col; b.d.style.transform = `translate(${b.x + Math.sin(t * .8 + b.ph) * 30 + px}px,${y}px)`; b.d.style.opacity = b.a; }
    else if (name === 'code') { const y = ((b.y + t * b.sp) % 2800 + 2800) % 2800 - 1400; b.d.style.color = col; b.d.style.transform = `translate(${b.x + px * .6}px,${y}px)`; b.d.style.opacity = b.a; }
  }
}
/* motif: ikon tema yang melayang samar di latar, berganti sesuai topik scene */
const motifSets = [];
function buildMotifs(BG) {
  BG.forEach((k, idx) => {
    const r = rng(100 + idx), items = [];
    const L = document.createElement('div'); L.style.cssText = 'position:absolute;inset:0;display:none'; $('motif').appendChild(L);
    const names = k.motif || [];
    for (let i = 0; names.length && i < 12; i++) {
      const d = document.createElement('div'); d.className = 'mo'; d.innerHTML = icon(names[i % names.length]);
      const sz = 70 + r() * 90; Object.assign(d.style, { width: sz + 'px', height: sz + 'px' }); L.appendChild(d);
      // sebar di 3 kolom x 4 baris supaya merata, hindari pusat atas (tempat panel)
      const col = i % 3, row = Math.floor(i / 3);
      items.push({ d, x: col * 360 + 40 + r() * 220, y: 200 + row * 420 + r() * 200, ph: r() * 6.28, rot: (r() - .5) * 40, sp: .15 + r() * .25, a: .1 + r() * .1 });
    }
    motifSets.push({ L, items });
  });
}
function drawMotifs(BG, t, cam, weights) {
  motifSets.forEach((m, i) => {
    const w = weights[i] || 0; m.L.style.display = w > .001 ? '' : 'none'; if (w <= .001) return;
    const th = THEMES[BG[i].theme] || THEMES.night_blue;
    m.items.forEach(o => { const x = o.x + Math.sin(t * o.sp + o.ph) * 30 - cam.x * 22, y = o.y + Math.cos(t * o.sp * .8 + o.ph) * 24 + cam.y * 8 - (1 - w) * 40;
      o.d.style.color = th.motifColor; o.d.style.opacity = o.a * w * 1.6; o.d.style.transform = `translate(${x}px,${y}px) rotate(${o.rot + Math.sin(t * .4 + o.ph) * 8}deg)`; });
  });
}
function buildBackground() {
  const BG = []; let last = { theme: 'night_blue', motif: [], pattern: 'bokeh' };
  for (const s of TL.scenes) { const b = s.background || {}; const k = { t: b.start ?? s.start, theme: b.theme || last.theme, motif: b.motif || last.motif, pattern: b.pattern || last.pattern, dur: b.transition ?? .9 };
    if (!THEMES[k.theme]) console.warn('tema tidak dikenal: ' + k.theme); if (!PATTERNS.includes(k.pattern)) console.warn('pola tidak dikenal: ' + k.pattern); BG.push(k); last = k; }
  BG.sort((a, b) => a.t - b.t); BG[0].t = 0; return BG;
}
function drawBackground(t, BG, cam, only = null) {
  if (only) { const th = THEMES[only.theme] || THEMES.night_blue, root = document.documentElement.style;
    ['--bg1', '--bg2', '--bg3'].forEach((v, j) => root.setProperty(v, th.bg[j])); root.setProperty('--panel', `rgba(${hexRgb(th.panel)},.9)`);
    grid.material.color.set(th.grid); scene.fog.color.set(th.fog); hemi.groundColor.set(th.fog);
    PATTERNS.forEach(p => drawPattern(p, p === only.pattern ? 1 : 0, t, th, cam)); drawMotifs(BG, t, cam, BG.map((_, i) => i === only.idx ? 1 : 0)); return; }
  let i = 0; while (i + 1 < BG.length && BG[i + 1].t <= t) i++;
  const k = BG[i], pk = BG[Math.max(0, i - 1)]; const m = i === 0 ? 1 : inOut(P(t, k.t, k.dur));
  const A = THEMES[pk.theme] || THEMES.night_blue, B = THEMES[k.theme] || THEMES.night_blue;
  const root = document.documentElement.style;
  ['--bg1', '--bg2', '--bg3'].forEach((v, j) => root.setProperty(v, mixHex(A.bg[j], B.bg[j], m)));
  root.setProperty('--panel', `rgba(${hexRgb(mixHex(A.panel, B.panel, m))},.9)`);
  grid.material.color.set(mixHex(A.grid, B.grid, m)); scene.fog.color.set(mixHex(A.fog, B.fog, m)); hemi.groundColor.set(mixHex(A.fog, B.fog, m));
  const th = m < .5 ? A : B;
  const pw = {}; PATTERNS.forEach(p => pw[p] = 0); pw[pk.pattern] += 1 - m; pw[k.pattern] += m;
  PATTERNS.forEach(p => drawPattern(p, pw[p], t, p === k.pattern ? B : A, cam));
  const mw = BG.map(() => 0); if (pk.motif.join() === k.motif.join()) mw[i] = 1; else { mw[Math.max(0, i - 1)] = 1 - m; mw[i] = m; }
  drawMotifs(BG, t, cam, mw);
}

/* ---------- keys from timeline ---------- */
function buildKeys() {
  const HK = [], MK = [];
  for (const s of TL.scenes) {
    HK.push([s.start, s.host.pose || 'idle', s.host.expression || 'talk']);
    for (const g of s.host.gestures || []) HK.push([g.start, g.gesture, g.expression || s.host.expression || 'talk']);
    MK.push([s.start, s.mascot.action || 'idle', s.mascot.eyes || 'normal']);
    for (const c of s.mascot.changes || []) MK.push([c.start, c.action, c.eyes]);
  }
  for (const k of [...HK, ...MK]) { if (!POSES[k[1]] && !['idle', 'tilt', 'bounce', 'jump', 'shiver', 'look'].includes(k[1])) console.warn('pose/aksi tidak dikenal: ' + k[1]); }
  return [HK.sort((a, b) => a[0] - b[0]), MK.sort((a, b) => a[0] - b[0])];
}
function buildShots() {
  const K = [];
  for (const s of TL.scenes) for (const k of s.shots || []) {
    if (!SHOTS[k.shot]) console.warn('shot tidak dikenal: ' + k.shot);
    const [kind, dur] = (k.transition || 'cut').split(':');
    K.push({ t: k.start, shot: k.shot, kind, dur: dur ? +dur : SHOT_MOVE, chars: k.chars || null });
  }
  K.sort((a, b) => a.t - b.t);
  if (!K.length || K[0].t > .01) K.unshift({ t: 0, shot: 'wide', kind: 'cut', dur: 0 });
  return K;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
/** pose kamera untuk waktu t: interpolasi antar shot + dolly pelan di dalam shot + goyang halus */
function cameraAt(t, KS) {
  let i = 0; while (i + 1 < KS.length && KS[i + 1].t <= t) i++;
  const k = KS[i], pk = KS[Math.max(0, i - 1)];
  const A = SHOTS[pk.shot] || SHOTS.wide, B = SHOTS[k.shot] || SHOTS.wide;
  const m = (k.kind === 'move' && i > 0) ? inOut(P(t, k.t, k.dur)) : 1;
  _a.set(...A.pos).lerp(_b.set(...B.pos), m); _c.set(...A.look).lerp(_d.set(...B.look), m);
  const fov = lerp(A.fov, B.fov, m);
  const dolly = Math.min(1, Math.max(0, t - k.t) / 8) * .045;            // ken-burns: makin dekat 4.5% dalam 8 dtk
  _a.lerp(_c, dolly);
  const dist = _a.distanceTo(_c), sway = CAM.drift * dist / 24;
  return { x: _a.x + Math.sin(t * .35) * sway, y: _a.y + Math.sin(t * .27 + 1) * sway * .4, z: _a.z, lx: _c.x + Math.sin(t * .35) * sway * .4, ly: _c.y, lz: _c.z, fov, shot: k.shot };
}
/** Karakter keluar bingkai untuk shot hideChars (illustration) — TIDAK BOLEH menghalangi kamera.
 *  mode 'slide': geser lurus ke samping (tetap menghadap kamera, tanpa balik badan), selesai SEBELUM
 *               kamera mulai bergerak; kembali setelah kamera hampir tiba di shot berikutnya.
 *  mode 'hide' : langsung hilang tepat saat shot mulai (cocok dengan transisi 'cut'), langsung muncul lagi.
 *  Mengembalikan { k: 0 (di tempat) … 1 (di luar bingkai), mode }. */
const EXIT_DEFAULT = () => TL.character_exit || 'slide';
function asideAt(t, KS) {
  let best = { k: 0, mode: 'slide' };
  for (let i = 0; i < KS.length; i++) {
    if (!(SHOTS[KS[i].shot] || {}).hideChars) continue;
    if ((SHOTS[KS[i - 1]?.shot] || {}).hideChars) continue;          // lanjutan, sudah di luar
    let j = i; while (j + 1 < KS.length && (SHOTS[KS[j + 1].shot] || {}).hideChars) j++;
    const a = KS[i].t, nx = KS[j + 1], end = nx ? nx.t : 1e9;
    const mode = KS[i].chars || (KS[i].kind === 'cut' ? 'hide' : EXIT_DEFAULT());
    let k;
    if (mode === 'hide') k = (t >= a && t < end) ? 1 : 0;
    else {
      const back = nx ? end + (nx.kind === 'move' ? nx.dur * .5 : 0) : 1e9;
      k = Math.min(inOut(P(t, a - .45, .4)), 1 - inOut(P(t, back, .4)));
    }
    if (k > best.k) best = { k, mode };
  }
  return best;
}
/** Kemunculan tiba-tiba untuk variasi: plan.json scene.enter = [[kata, 'host'|'mascot'|'both', 'bottom'|'side'|'top']].
 *  Karakter berada di luar bingkai tepat pada kata itu lalu masuk dalam ±0,5 dtk. */
function buildEnters() { const E = []; for (const s of TL.scenes) for (const e of s.enter || []) E.push(e); return E.sort((a, b) => a.start - b.start); }
const bounceOut = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
function enterOffset(t, who, E) {
  for (const e of E) {
    if (e.who !== who && e.who !== 'both') continue;
    if (t < e.start - .02 || t > e.start + .7) continue;
    const p = P(t, e.start, e.from === 'top' ? .7 : .5), side = who === 'host' ? -1 : 1;
    if (e.from === 'bottom') return { x: 0, y: -9 * (1 - backOut(p)) };
    if (e.from === 'top') return { x: 0, y: 12 * (1 - bounceOut(p)) };
    return { x: side * 6.5 * (1 - easeOut(p)), y: 0 };      // 'side'
  }
  return { x: 0, y: 0 };
}
function keyAt(keys, t) { let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++; return i; }
function pose(name, lt) { const base = { Lz: -.1, Lx: 0, Rz: .1, Rx: 0, tilt: 0, body: 0 }; return Object.assign(base, (POSES[name] || POSES.idle)(lt, Math.sin(lt * 5))); }

/* ---------- register + frame loop ---------- */
let DEF = null, HK = [], MK = [], KS = [], BG = [], THUMB_BG = null, HOOK_Y = 300, EN = [];
/** waktu acuan props untuk thumbnail: thumbnail.props_from = {scene, word} atau {time} */
function thumbTime(th) {
  const pf = th.props_from || {};
  if (pf.time != null) return pf.time;
  if (pf.scene) return T(pf.scene, pf.word || '@start') + (pf.offset ?? .8);
  const w = DEF?.stageWindows?.() || []; return w.length ? (w[0][0] + w[0][1]) / 2 : TL.total / 2;
}
const DEFAULT_LOOK = {
  host: { style: 'pixel', preset: 'raka' },
  classic: { skin: '#C9895A', skinDark: '#B07447', hair: '#3A2318', shirt: '#14B8A6', shirtDark: '#0E8F82', collar: '#5EEAD4', pants: '#334155', shoes: '#F1F4FA', glasses: true, beard: false },
  mascot: { body: '#7DD3FC', face: '#BAE6FD', trim: '#0369a1', legs: '#1e3a5f', leds: true },
};
/**
 * register({ look, setup(), stageWindows(), update3D(t,sid), updateHTML(t,sid), confetti(), camera(t,sid,cam) })
 */
export function register(def) {
  DEF = def;
  // karakter: plan.json characters.host.spec  <  scenes.js look.host
  const hostSpec = { ...DEFAULT_LOOK.host, ...(TL.characters?.host?.spec || {}), ...(def.look?.host || {}) };
  const mascotSpec = { ...DEFAULT_LOOK.mascot, pixel: hostSpec.style === 'pixel', ...(TL.characters?.mascot?.spec || {}), ...(def.look?.mascot || {}) };
  if (hostSpec.style === 'classic') buildHost({ ...DEFAULT_LOOK.classic, ...hostSpec }); else buildPixel(hostSpec);
  buildMascot(mascotSpec);
  [HK, MK] = buildKeys(); KS = buildShots(); EN = buildEnters();
  def.setup?.();
  BG = buildBackground();
  if (TL.thumbnail) { const th = TL.thumbnail, tt = thumbTime(th); let i = 0; while (i + 1 < BG.length && BG[i + 1].t <= tt) i++;
    THUMB_BG = { t: 1e9, theme: th.background?.theme || BG[i].theme, pattern: th.background?.pattern || BG[i].pattern, motif: th.background?.motif || BG[i].motif, idx: BG.length };
    BG.push(THUMB_BG); }
  buildMotifs(BG);
  if (TL.hook && TL.hook.text) {
    const hk = document.createElement('div'); hk.id = 'hook'; hk.className = 'abs'; HOOK_Y = TL.hook.y ?? 300; hk.style.top = HOOK_Y + 'px';
    hk.innerHTML = TL.hook.text.map(l => `<div class="ln" style="font-size:${fitLine(l.toUpperCase(), 940, TL.hook.size || 120, 60)}px">${l.replace(/\*(.+?)\*/g, '<b>$1</b>')}</div>`).join('');
    $('ui').insertBefore(hk, $('cap'));
  }
  const dashN = Math.max(0, ...TL.scenes.map(s => s.step || 0));
  for (let i = 0; i < dashN; i++) $('dashes').appendChild(document.createElement('i'));
  document.fonts.ready.then(() => { window.ready = true; });
}

/* ---------- thumbnail (cover TikTok/Reels) ---------- */
function fitLine(text, maxW, maxPx, minPx = 70) { const c = document.createElement('canvas').getContext('2d'); let fs = maxPx; while (fs > minPx) { c.font = `900 ${fs}px Pop`; if (c.measureText(text.replace(/\*/g, '')).width <= maxW) break; fs -= 4; } return fs; }
function buildThumbOverlay(th) {
  const box = document.createElement('div'); box.id = 'thumb'; box.style.display = 'none'; $('ui').appendChild(box);
  const lines = (th.title || []).map(l => { const fs = fitLine(l.toUpperCase(), 960, th.title_max || 170); return `<div class="ln" style="font-size:${fs}px">${l.replace(/\*(.+?)\*/g, '<b>$1</b>')}</div>`; }).join('');
  box.innerHTML = (th.badge ? `<div class="th-badge"><span data-icon="${th.badge_icon || 'sparkles'}"></span>${th.badge}</div>` : '') +
    `<div class="th-title" style="top:${th.title_y ?? 430}px">${lines}</div>` + (th.subtitle ? `<div class="th-sub" style="top:${(th.title_y ?? 430) + 20}px">${th.subtitle}</div>` : '') +
    (th.footer ? `<div class="th-foot"><span data-icon="${th.footer_icon || 'globe'}"></span>${th.footer}</div>` : '') +
    (th.sticker ? `<div class="th-sticker" style="left:${th.sticker.x ?? 780}px;top:${th.sticker.y ?? 860}px;background:${th.sticker.color || 'var(--y)'}"><span data-icon="${th.sticker.icon}"></span></div>` : '');
  box.querySelectorAll('[data-icon]').forEach(x => { x.outerHTML = icon(x.dataset.icon); });
  // subtitle tepat di bawah judul
  requestAnimationFrame(() => {});
}
window.renderThumbnail = () => {
  const th = TL.thumbnail; if (!th) throw new Error('plan.json belum punya "thumbnail"');
  if (!$('thumb')) buildThumbOverlay(th);
  window.__TH = th; const t = thumbTime(th); renderFrame(Math.round(t * FPS));
  const ti = document.querySelector('.th-title'), sub = document.querySelector('.th-sub');
  if (sub) sub.style.top = (ti.offsetTop + ti.offsetHeight + 18) + 'px';
  return { t, shot: th.shot || 'thumb' };
};
window.renderFrame = (frame) => {
  const TH = window.__TH || null;
  const t = frame / FPS, sc = sceneAt(t), sid = sc.id;
  const mouth = TH ? (TH.host?.mouth ?? .55) : (TL.mouth[Math.min(frame, TL.mouth.length - 1)] || 0);
  // camera (shot dari timeline; DEF.camera boleh menggeser lebih lanjut)
  let cam;
  if (TH) { const sh = SHOTS[TH.shot || 'thumb']; cam = { x: sh.pos[0], y: sh.pos[1], z: sh.pos[2], lx: sh.look[0], ly: sh.look[1], lz: sh.look[2], fov: sh.fov, shot: 'thumb' }; }
  else { cam = cameraAt(t, KS); DEF.camera?.(t, sid, cam); }
  camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(cam.lx, cam.ly, cam.lz);
  window.__shot = cam.shot;
  // latar adaptif
  drawBackground(t, BG, cam, TH ? THUMB_BG : null);
  // karakter minggir untuk shot ilustrasi
  const AS = TH ? { k: 0, mode: 'slide' } : asideAt(t, KS), aside = AS.k, sliding = Math.sin(Math.PI * aside);
  const hiddenChars = AS.mode === 'hide' && aside > .5;
  const enH = TH ? { x: 0, y: 0 } : enterOffset(t, 'host', EN), enM = TH ? { x: 0, y: 0 } : enterOffset(t, 'mascot', EN);
  // host
  const HKu = TH ? [[t - .6, TH.host?.pose || 'point_up', TH.host?.expression || 'wow']] : HK;
  const MKu = TH ? [[t - Math.PI / 8.8, TH.mascot?.action || 'jump', TH.mascot?.eyes || 'happy']] : MK;
  { const i = keyAt(HKu, t), k = HKu[i], pk = HKu[Math.max(0, i - 1)]; const bl = i === 0 ? 1 : inOut(P(t, k[0], .38));
    const a = pose(pk[1], t - pk[0]), b = pose(k[1], t - k[0]); const p = {}; for (const f in a) p[f] = lerp(a[f], b[f], bl);
    const ea = EXPR[pk[2]] || EXPR.talk, eb = EXPR[k[2]] || EXPR.talk; const e = {}; for (const f in ea) e[f] = lerp(ea[f], eb[f], bl);
    const br = Math.sin(t * 2.2) * .03;
    host.arms.L.rotation.set(p.Lx, 0, p.Lz + br); host.arms.R.rotation.set(p.Rx, 0, p.Rz - br);
    host.legs.forEach(l => l.rotation.x = 0);
    host.body.position.y = host.bodyY + br * .6 + p.body; host.body.rotation.z = Math.sin(t * .8) * .015 + sliding * .06;
    // geser lurus ke kiri (menghadap kamera terus) atau hilang; plus efek muncul tiba-tiba
    host.root.visible = !hiddenChars;
    host.root.position.set(-1.75 - (AS.mode === 'slide' ? inOut(aside) * 6.5 : 0) + enH.x, enH.y, .6); host.root.rotation.y = .2;
    host.head.rotation.set(-mouth * .07 + Math.sin(t * 1.3) * .03, Math.sin(t * .6) * .08, p.tilt * .5 + e.tilt * .3 + Math.sin(t * .9) * .02);
    const open = clamp(mouth * 1.15);
    const bt = t % 3.3; const blink = !TH && ((bt > 3.1 && bt < 3.22) || (t % 7.1 > 6.95 && t % 7.1 < 7.05));
    const viseme = TH ? (TH.host?.viseme ?? (open > .3 ? 'A' : '-')) : (TL.visemes ? TL.visemes[Math.min(frame, TL.visemes.length - 1)] : null);
    host.face({ e, open, blink, expr: bl > .5 ? k[2] : pk[2], pose: k[1], viseme }); }
  // mascot
  { const i = keyAt(MKu, t), k = MKu[i], lt = t - k[0]; let y = 0, rz = 0, ry = -.35, x = 2.85, sq = 1;
    switch (k[1]) {
      case 'tilt': rz = .18 * Math.sin(t * 1.6) + .12; break;
      case 'bounce': { const s = Math.abs(Math.sin(lt * 5.2)); y = s * .35; sq = 1 - (1 - s) * .06; break; }
      case 'jump': { const s = Math.abs(Math.sin(lt * 4.4)); y = s * .9; sq = 1 - (1 - s) * .1; break; }
      case 'shiver': x += Math.sin(t * 34) * .04; break;
      case 'look': ry = -.35 + Math.sin(t * 1.2) * .25; break;
      default: rz = Math.sin(t * 1.1) * .03;
    }
    mascot.root.visible = !hiddenChars;
    mascot.root.position.set(x + (AS.mode === 'slide' ? inOut(aside) * 5.5 : 0) + enM.x, y + enM.y, 1.4); mascot.root.rotation.set(0, ry, rz - sliding * .08); mascot.body.scale.set(1 + (1 - sq) * .6, sq, 1 + (1 - sq) * .6);
    mascot.hands.forEach((h, j) => h.rotation.z = (j ? -1 : 1) * (k[1] === 'jump' || k[1] === 'bounce' ? .5 + Math.sin(t * 8) * .3 : .05));
    const blink = !TH && (t % 4.1 > 3.95) && (k[2] === 'normal' || k[2] === 'wow');
    mascot.eyes.material.map = blink ? mascot.eyeTex.blink : (mascot.eyeTex[k[2]] || mascot.eyeTex.normal);
    mascot.eyes.position.y = 1.1 + (k[1] === 'look' ? .12 : 0);
    mascot.leds.forEach((l, j) => l.visible = Math.sin(t * 3.4 + j * 1.7) > -.6); }
  // stage
  let st = 0; for (const [a, b] of (DEF.stageWindows?.() || [])) if (t >= a && t <= b) st = Math.min(easeOut(P(t, a, .5)), easeOut(clamp((b - t) / .35)));
  if (TH) st = 1;
  stage.visible = st > .001; stage.position.y = STAGE.y + Math.sin(t * 1.4) * .12 - (1 - st) * 1.2; stage.scale.setScalar(Math.max(.001, lerp(.3, 1, st)) * STAGE.scale);
  if (TH) { const so = { x: 2.2, y: 6.8, z: -3.2, scale: .85, ...(TH.stage || {}) }; stage.position.set(so.x, so.y, so.z); stage.scale.setScalar(so.scale * STAGE.scale); }
  DEF.update3D?.(t, sid);
  if (TH) { stage.scale.setScalar((TH.stage?.scale ?? .85) * STAGE.scale); stage.position.set(TH.stage?.x ?? 2.2, TH.stage?.y ?? 6.8, TH.stage?.z ?? -3.2); }
  renderer.render(scene, camera);
  if (TH) { for (const id of ['label', 'dashes', 'cap', 'confetti', 'hook']) if ($(id)) $(id).style.display = 'none'; $('scene-ui').style.display = TH.keep_ui ? '' : 'none'; $('thumb').style.display = ''; return true; }
  // teks hook besar (0 dtk → hook.until_t), lalu mengecil ke posisi label
  const HOOK = TL.hook && TL.hook.text ? TL.hook : null, hookEnd = HOOK ? HOOK.until_t : 0;
  if (HOOK) { const el_ = $('hook'); const kOut = P(t, hookEnd, .45);
    if (t > hookEnd + .45) el_.style.display = 'none';
    else { el_.style.display = ''; const kin = P(t, -.25, .4); const wob = Math.sin(t * 6) * 1.2 * (1 - kOut);
      el_.style.opacity = 1 - easeOut(kOut) * .9; el_.style.transform = `translateY(${-inOut(kOut) * (HOOK_Y - 70)}px) scale(${lerp(.75, 1, backOut(kin)) * lerp(1, .32, inOut(kOut))}) rotate(${-2 + wob}deg)`; } }
  // label + dashes
  { const lab = sc.label || ['', '']; $('label').innerHTML = `${lab[0]} <b>${lab[1]}</b>`; const first = sc === TL.scenes[0], last = sc === TL.scenes[TL.scenes.length - 1];
    const k = P(t, sc.start, .35), kOut = clamp((sc.end - t) / .2); const s = first ? (HOOK ? lerp(.7, 1, backOut(P(t, hookEnd + .25, .35))) : 1) : lerp(.7, 1, backOut(k));
    $('label').style.transform = `translateX(-50%) scale(${s * lerp(.9, 1, last ? 1 : kOut)})`; $('label').style.opacity = first ? (HOOK ? easeOut(P(t, hookEnd + .25, .3)) : easeOut(P(t, 0, .3))) : Math.min(easeOut(k), last ? 1 : easeOut(kOut));
    const step = sc.step ?? -1; const from = sc.dashes_from_t ?? sc.start; const ds = $('dashes');
    ds.style.opacity = (step >= 0 && t >= from) ? 1 : 0; [...ds.children].forEach((d, i) => d.className = i < step ? 'on' : ''); }
  // caption
  { let cap = null; for (const c of TL.captions) if (t >= c.start - .02 && t < c.end) { cap = c; break; }
    const e = $('cap'); if (!cap) e.style.opacity = 0; else { e.textContent = cap.text; e.style.color = cap.highlight ? '#FFD60A' : '#FFFFFF'; const k = P(t, cap.start - .02, .14); e.style.opacity = 1; e.style.transform = `scale(${lerp(.78, 1, backOut(k))})`; e.style.fontSize = cap.text.length > 18 ? '84px' : '104px'; } }
  DEF.updateHTML?.(t, sid);
  updateConfetti(t, DEF.confetti?.() || []);
  return true;
};
