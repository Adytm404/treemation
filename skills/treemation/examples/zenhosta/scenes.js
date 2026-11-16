// Contoh lengkap: "Kok Website Bisa Online?" (zenhosta.com)
import { register, T, S, hookEnd, loopStart, env, setPop, P, clamp, lerp, inOut, easeOut, backOut, M, stage, PROPS, FXP, UI, ANIM, screenOf, css } from './engine.js';

const s1 = S.s1_hook, s2 = S.s2_intro, s3 = S.s3_domain, s4 = S.s4_server, s5 = S.s5_datacenter, s6 = S.s6_hosting, s7 = S.s7_recap, s8 = S.s8_cta;
let P3 = {}, U = {};

register({
  // look: { host: { shirt: '#14B8A6' }, mascot: { body: '#7DD3FC' } },   // ganti warna karakter di sini
  setup() {
    // ---- props 3D di panggung ----
    P3.globe = PROPS.globe(stage, { x: .9 });
    P3.house = PROPS.house(stage, { sign: 'zenhosta.com' });
    P3.rack = PROPS.rack(stage);
    P3.nums = FXP.orbitTexts(['203', '0', '113', '10', '198.51', '192', '172.16', '8.8', '104', '66']);
    P3.slotMat = M('#FFD60A', true);
    // ---- UI ----
    U.browser = UI.browser({ left: '60px', top: '240px', width: '660px', height: '320px' });
    U.cards = [['Domain', 'globe', '#FFD60A'], ['Server', 'server', '#34D399'], ['Data Center', 'building-2', '#FF6FAE'], ['Hosting', 'cloud', '#7DD3FC']]
      .map(([title, icon, color], i) => UI.iconCard({ title, icon, color, n: i + 1 }, { left: (i % 2 ? 560 : 100) + 'px', top: (Math.floor(i / 2) ? 560 : 280) + 'px' }));
    U.url = UI.urlbar({ icon: 'lock' }, { left: '110px', top: '250px', width: '860px' });
    U.ip = UI.bignum({ label: 'Tanpa domain, kamu harus ingat:', value: '203.0.113.10' }, { left: '110px', top: '430px', width: '860px', height: '330px' });
    U.x = UI.xstamp({ left: '390px', top: '445px', width: '300px', height: '300px' });
    U.files = [['index.html', 'file-code'], ['style.css', 'file-code'], ['foto.jpg', 'file-image']].map(([name, icon]) => UI.file({ name, icon }));
    U.badge = UI.badge({ big: '24/7', small: 'selalu menyala', icon: 'clock' }, { left: '90px', top: '262px' });
    U.sun = UI.bubble({ icon: 'sun', bg: '#FFD60A', fg: '#7a4b00' }, { left: '760px', top: '270px' });
    U.moon = UI.bubble({ icon: 'moon', bg: '#c7d2fe', fg: '#1e2a78' }, { left: '760px', top: '270px' });
    U.tag = UI.tag({ text: 'Tempat kamu', icon: 'key-round' });
    U.buy = UI.note({ title: 'Beli server sendiri', sub: 'mahal &amp; ribet' }, { left: '60px', top: '240px', width: '520px' });
    U.strike = UI.strike({ left: '44px', top: '296px', width: '540px' });
    U.pills = UI.pills(['Sewa', 'Upload', 'Online ✓'], { left: '50%', top: '262px' });
    U.ok = UI.okbadge({ text: 'ONLINE' }, { left: '50%', top: '520px' });
    U.flow = UI.flow([['smartphone', 'Kamu ketik zenhosta.com', 'di browser'], ['search', 'Internet cari alamat server', 'lewat DNS'], ['server', 'Server di data center', 'mengirim file website'], ['monitor', 'Website tampil', 'di layar kamu']], { left: '70px', top: '250px' });
    U.cta = UI.cta({ q: 'Hosting untuk website kamu', brand: 'zenhosta', accent: '.com', button: 'Mulai hosting' }, { left: '90px', top: '300px', width: '900px' });
  },
  // kapan panggung 3D terlihat
  stageWindows: () => [[T('s1_hook', 'dari') - .25, s1.end + .05], [T('s3_domain', 'alamat') - .3, T('s3_domain', 'Tanpa') + .2], [s4.start + .15, s4.end + .05], [s6.start - .1, s6.end + .05]],
  confetti: () => [[T('s6_hosting', 'online'), 540, 640, s6.end], [T('s8_cta', 'sekarang'), 540, 700, loopStart()]],

  update3D(t, sid) {
    // globe
    P3.globe.g.visible = sid === 's1_hook'; P3.globe.mesh.rotation.y = t * .7; P3.globe.mesh.rotation.x = .25;
    { const t0 = T('s1_hook', 'dari'); P3.globe.dots.forEach((c, i) => { const k = P(t, t0 + .1 + i * .09, .2); c.visible = k > 0; c.scale.setScalar(.18 * backOut(k) + .001); }); }
    // house
    P3.house.g.visible = sid === 's3_domain'; if (P3.house.g.visible) P3.house.g.scale.setScalar(.9 * Math.max(.001, backOut(P(t, T('s3_domain', 'alamat') - .1, .5))));
    // rak server di panggung (s4 & s6); s5 memakai SET datacenter dari plan.json (panggung otomatis turun)
    const rackOn = sid === 's4_server' || sid === 's6_hosting';
    P3.rack.g.visible = rackOn;
    if (rackOn) {
      P3.rack.g.scale.set(1, Math.max(.001, easeOut(P(t, sid === 's4_server' ? T('s4_server', 'server') - .1 : s6.start, .7))), 1);
      P3.rack.leds.forEach((l, j) => l.visible = Math.sin(t * 2.6 + j * 1.3) > -.3);
      P3.rack.slots.forEach(s => s.material = M('#374151'));
      if (sid === 's6_hosting' && t > T('s6_hosting', 'sewa') - .1) P3.rack.slots[3].material = Math.sin(t * 5) > -.2 ? P3.slotMat : M('#fbbf24');
    }
    FXP.updateOrbit(P3.nums, t, T('s3_domain', 'deretan'), s3.end);
  },

  updateHTML(t, sid) {
    // s1
    ANIM.browser(U.browser, t, hookEnd() - .1, s1.end, hookEnd() + .45);   // panel menunggu teks hook selesai
    // s2: kartu muncul lalu terbang ke garis progres
    { const t0 = T('s2_intro', 'empat'), tb = T('s2_intro', 'bahas');
      U.cards.forEach((c, i) => { const e = env(t, t0 - .15 + i * .22, s2.end - .05, .4, .01); if (!e) { c.style.display = 'none'; return; }
        c.style.display = ''; const fk = inOut(P(t, tb + i * .05, .55)); const dx = (442 + i * 70) - (parseFloat(c.style.left) + 210), dy = 190 - (parseFloat(c.style.top) + 125);
        c.style.opacity = e.o * (1 - fk); c.style.transform = `translate(${dx * fk}px,${dy * fk}px) scale(${e.sc * lerp(1, .12, fk)})`; }); }
    // s3
    { const tz = T('s3_domain', 'zenhosta.com'); const e = env(t, tz - .35, s3.end); setPop(U.url, e); if (e) ANIM.typing(U.url, 'zenhosta.com', t, tz - .2);
      setPop(U.ip, env(t, T('s3_domain', 'IP address') - .25, s3.end));
      const ex = env(t, T('s3_domain', 'Ribet') - .05, s3.end, .3); setPop(U.x, ex, '', `rotate(${(1 - (ex ? ex.pi : 1)) * -40}deg)`); }
    // s4
    { const tf = T('s4_server', 'file'); const target = screenOf(P3.rack.g, [0, 2.2, 0]);
      U.files.forEach((f, i) => sid === 's4_server' ? ANIM.fly(f, t, tf - .1 + i * .28, 1.25, [120 + i * 30, 620 + i * 90], [target[0] - 110, target[1] - 30]) : (f.style.display = 'none'));
      setPop(U.badge, env(t, T('s4_server', '24 jam') - .1, s4.end));
      const tk = T('s4_server', 'kapan'); const sm = env(t, tk - .15, s4.end); const ph = Math.floor((t - tk) / .5) % 2;
      setPop(U.sun, sm && ph <= 0 ? sm : null); setPop(U.moon, sm && ph === 1 ? sm : null); }
    // s5: tidak ada panel — set datacenter + penanda (mark) dari plan.json yang bercerita
    // s6
    { const tag = env(t, T('s6_hosting', 'sewa') - .05, s6.end);
      if (tag) { const [x, y] = screenOf(P3.rack.g, [-1.0, .45 + 3 * .52, .9]); U.tag.style.left = (x - 330) + 'px'; U.tag.style.top = (y - 36) + 'px'; } setPop(U.tag, tag);
      const tb = T('s6_hosting', 'beli'), tc = T('s6_hosting', 'Cukup');
      setPop(U.buy, env(t, tb - .15, tc - .05));
      U.strike.style.display = (t > tb + .55 && t < tc - .05) ? '' : 'none'; U.strike.style.transform = `rotate(-8deg) scaleX(${easeOut(P(t, tb + .55, .35))})`;
      setPop(U.pills, env(t, tc - .2, s6.end), 'translateX(-50%)'); ANIM.pills(U.pills, t, [tc, T('s6_hosting', 'upload'), T('s6_hosting', 'online')]);
      setPop(U.ok, env(t, T('s6_hosting', 'online'), s6.end), 'translateX(-50%)'); }
    // s7
    ANIM.flow(U.flow, t, [T('s7_recap', 'domain'), T('s7_recap', 'mencari'), T('s7_recap', 'data center'), T('s7_recap', 'layar')], s7.start + .05, s7.end);
    // s8
    { const e = env(t, s8.start + .05, loopStart(), .4, .35); setPop(U.cta, e);
      if (e) { const tz = T('s8_cta', 'zenhosta.com'), bk = P(t, tz - .1, .45), br = U.cta.querySelector('.brand');
        br.style.transform = `scale(${lerp(.6, 1, backOut(bk))})`; br.style.opacity = easeOut(bk) * .85 + .15;
        U.cta.querySelector('.btn').style.transform = `scale(${t > tz ? 1 + Math.sin((t - tz) * 6) * .04 : 1})`; } }
  },
});
