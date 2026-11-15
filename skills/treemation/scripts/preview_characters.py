"""Pratinjau karakter pixel-skin (untuk memilih/menunjukkan karakter ke pengguna).

Pakai:
  python preview_characters.py <proyek>                 # semua preset -> <proyek>/previews/karakter-preset.png
  python preview_characters.py <proyek> --plan          # host dari plan.json (badan penuh + close-up)
  python preview_characters.py <proyek> --spec '{"preset":"salsa","hijab":"#0ea5e9"}'
"""
import os, sys, json, argparse, pathlib
HTML = """<html><body style="margin:0"><canvas id="c" width="%(w)d" height="900"></canvas>
<script type="importmap">{"imports":{"three":"./node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import { buildPixelHost, PIXEL_PRESETS } from './pixelchar.js';
const specs = %(specs)s;
const r=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true}); r.setSize(%(w)d,900,false); r.setClearColor(0x1d2b8f);
const s=new THREE.Scene(); s.add(new THREE.HemisphereLight(0xd4dcff,0x26307a,2.1)); const k=new THREE.DirectionalLight(0xffffff,2.6); k.position.set(-7,15,13); s.add(k);
const cam=new THREE.PerspectiveCamera(30,%(w)d/900,0.1,200);
const list=(specs.length?specs:Object.keys(PIXEL_PRESETS).map(n=>({preset:n})));
window.names=list.map(x=>x.preset||'custom');
const H=list.map((sp,i)=>{const h=buildPixelHost(THREE,s,sp); h.root.position.x=(i-(list.length-1)/2)*4.3; h.root.rotation.y=.25; h.face({expr:'happy',open:0,blink:false,pose:'idle'}); h.arms.R.rotation.z=.15; h.arms.L.rotation.z=-.15; return h;});
window.go=(mode)=>{ if(mode==='close'){cam.position.set(H[0].root.position.x+0.3,7.2,7.5); cam.lookAt(H[0].root.position.x,6.9,0);} else {cam.position.set(0,5,10+list.length*3.6); cam.lookAt(0,4.2,0);} r.render(s,cam); };
window.ready=true;
</script></body></html>"""

ap = argparse.ArgumentParser(); ap.add_argument("proj"); ap.add_argument("--plan", action="store_true"); ap.add_argument("--spec")
a = ap.parse_args(); proj = os.path.abspath(a.proj)
specs = []
if a.plan:
    specs = [json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8")).get("characters", {}).get("host", {}).get("spec", {"preset": "raka"})]
if a.spec:
    specs = [json.loads(a.spec)]
w = 1800 if not specs else 900
path = os.path.join(proj, "_karakter.html")
open(path, "w", encoding="utf-8").write(HTML % {"w": w, "specs": json.dumps(specs)})
os.makedirs(os.path.join(proj, "previews"), exist_ok=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    exe = os.environ.get("CHROME_PATH")
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files", "--disable-gpu-compositing"], **({"executable_path": exe} if exe else {}))
    pg = b.new_page(viewport={"width": w, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(path).as_uri()); pg.wait_for_function("window.ready===true", timeout=60000)
    outs = []
    pg.evaluate("go('wide')"); o = os.path.join(proj, "previews", "karakter-preset.png" if not specs else "karakter.png"); pg.screenshot(path=o); outs.append(o)
    if specs:
        pg.evaluate("go('close')"); o = os.path.join(proj, "previews", "karakter-closeup.png"); pg.screenshot(path=o); outs.append(o)
    else:
        print("Urutan preset:", ", ".join(pg.evaluate("window.names")))
    b.close()
os.remove(path)
print(*outs, sep="\n")
if errs: print("ERROR:", *errs, sep="\n  ")
