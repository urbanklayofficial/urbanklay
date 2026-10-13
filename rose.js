// The 3D stage: a procedurally built crimson rose on a gold stem, floating in
// gold dust inside two slowly turning hexagon rings (a nod to the hex print).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const lerp = (a, b, t) => a + (b - a) * t;

function petalGeometry(w, h, cup, lip, seg = [3, 5]) {
  // Few segments + flat shading = faceted petals, echoing the geometric logo.
  const geo = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
  const pos = geo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);              // -0.5 … 0.5
    const v = pos.getY(i) + 0.5;        //  0 … 1 (base → tip)
    const width = w * Math.pow(Math.sin(Math.PI * (0.06 + 0.86 * v)), 0.55) * (0.5 + 0.5 * v);
    const x = u * width;
    const y = v * h - (2 * u) ** 2 * 0.14 * h * v ** 4;
    const z = cup * x * x + 0.18 * h * Math.sin(Math.PI * v) * 0.4 - lip * v ** 3 * h;
    pos.setXYZ(i, x, y, z);
    const shade = 0.32 + 0.68 * Math.pow(v, 0.55);
    colors.push(shade, shade, shade);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,236,180,1)");
  grd.addColorStop(0.35, "rgba(201,162,39,.6)");
  grd.addColorStop(1, "rgba(201,162,39,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createStage(canvas, { reduced = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  const mobile = matchMedia("(max-width: 900px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0b);
  scene.fog = new THREE.FogExp2(0x0b0b0b, 0.055);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.2, 9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const key = new THREE.DirectionalLight(0xffe2b8, 1.7); key.position.set(4, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3355, 2.4); rim.position.set(-5, 2, -4); scene.add(rim);
  const glow = new THREE.PointLight(0xc9a227, 2, 12, 2); glow.position.set(0, -1, 2.5); scene.add(glow);

  // ── Rose ────────────────────────────────────
  const rose = new THREE.Group();
  const bloom = new THREE.Group();
  rose.add(bloom);
  const petals = [];
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xd9b443, transparent: true, opacity: 0.7 });
  const N = 28;
  const inner = new THREE.Color("#2a0309");
  const outer = new THREE.Color("#8a1428");
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const geo = petalGeometry(lerp(0.5, 1.5, t), lerp(0.75, 1.55, t), lerp(2.2, 0.75, t), lerp(0.04, 0.32, t));
    const mat = new THREE.MeshPhysicalMaterial({
      color: inner.clone().lerp(outer, Math.pow(t, 0.7)),
      vertexColors: true, roughness: 0.55, sheen: 0.8, sheenRoughness: 0.45,
      sheenColor: new THREE.Color("#b8324a"), clearcoat: 0.12, clearcoatRoughness: 0.5,
      side: THREE.DoubleSide, flatShading: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 14), edgeMat));
    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    mesh.position.z = -lerp(0.03, 0.26, t);
    holder.add(mesh);
    holder.position.y = -t * 0.28;
    pivot.rotation.y = i * 2.39996;
    pivot.add(holder);
    bloom.add(pivot);
    petals.push({ holder, closed: lerp(0.02, 0.3, t), open: lerp(0.08, 1.28, Math.pow(t, 1.25)) });
  }

  const gold = new THREE.MeshStandardMaterial({ color: 0xb8921f, metalness: 1, roughness: 0.34 });
  const sepalGeo = petalGeometry(0.42, 0.75, 0.9, 0.2, [2, 2]);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group();
    const h = new THREE.Group();
    const m = new THREE.Mesh(sepalGeo, gold);
    m.position.z = -0.12;
    h.add(m); h.rotation.x = -2.0; h.position.y = -0.22;
    p.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
    p.add(h); bloom.add(p);
  }

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0.06, -1.3, 0.05),
    new THREE.Vector3(-0.08, -2.6, -0.05), new THREE.Vector3(0.1, -4.3, 0.05)
  ]);
  rose.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 80, 0.045, 10), gold));
  const leafGeo = petalGeometry(0.62, 1.05, 0.7, -0.08, [2, 2]);
  [[-1.6, 0.2, 1], [-2.7, 2.6, -1]].forEach(([y, ry, side]) => {
    const pt = stemCurve.getPoint((-y - 0.2) / 4.1);
    const leaf = new THREE.Mesh(leafGeo, gold);
    leaf.position.copy(pt);
    leaf.rotation.set(0, ry, side * -1.05);
    leaf.add(new THREE.LineSegments(new THREE.EdgesGeometry(leafGeo, 1), edgeMat));
    rose.add(leaf);
  });
  const thornGeo = new THREE.ConeGeometry(0.03, 0.14, 6);
  [0.3, 0.52, 0.7, 0.85].forEach((t, i) => {
    const th = new THREE.Mesh(thornGeo, gold);
    th.position.copy(stemCurve.getPoint(t));
    th.rotation.z = i % 2 ? 1.2 : -1.2;
    th.position.x += i % 2 ? -0.05 : 0.05;
    rose.add(th);
  });

  rose.rotation.x = 0.38;
  bloom.scale.setScalar(1.05);
  scene.add(rose);

  // ── Hexagon rings ───────────────────────────
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a227, transparent: true, opacity: 0.42 });
  const hexA = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.006, 4, 6), ringMat);
  const hexB = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.004, 4, 6), ringMat.clone());
  hexB.material.opacity = 0.2;
  const rings = new THREE.Group();
  rings.add(hexA, hexB);
  rings.position.y = 0.1;
  rose.add(rings);

  // ── Gold dust ───────────────────────────────
  const COUNT = mobile ? 500 : 1100;
  const pPos = new Float32Array(COUNT * 3);
  const pSpeed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 22;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
    pSpeed[i] = 0.08 + Math.random() * 0.25;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.07, map: dotTexture(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0.85
  }));
  scene.add(dust);

  // ── Post ────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.55, 0.86);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // Values animated from outside (GSAP / scroll).
  const state = { bloom: reduced ? 1 : 0, x: 0, y: 0, scale: 1, spin: 0, fade: 1, intro: reduced ? 1 : 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  let layout = { x: 1.75, y: 0.35, s: 1 };
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    camera.aspect = w / h;
    const narrow = w / h < 0.9;
    camera.fov = narrow ? 50 : 35;
    camera.updateProjectionMatrix();
    layout = narrow ? { x: 0, y: 1.3, s: 0.72 } : { x: Math.min(2.7, 1.45 * (w / h)), y: 0.7, s: 0.88 };
  }
  addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  let running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    canvas.style.opacity = state.fade;
    if (state.fade <= 0.001) { clock.getDelta(); return; } // stage hidden, skip GPU work
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    for (const p of petals) p.holder.rotation.x = -lerp(p.closed, p.open, state.bloom);
    const float = reduced ? 0 : Math.sin(t * 0.8) * 0.08;
    rose.position.set(layout.x + state.x, layout.y + state.y + float - (1 - state.intro) * 1.2, 0);
    rose.scale.setScalar(layout.s * state.scale * (0.85 + 0.15 * state.intro));
    rose.rotation.y = (reduced ? 0 : t * 0.12) + state.spin + pointer.x * 0.35;
    rose.rotation.x = 0.38 + pointer.y * 0.12;
    rings.rotation.set(Math.PI / 2 + 0.25 + pointer.y * 0.1, 0, reduced ? 0 : t * 0.08);
    hexB.rotation.z = reduced ? 0 : -t * 0.14;

    if (!reduced) {
      const a = pGeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        a[i * 3 + 1] += pSpeed[i] * dt;
        if (a[i * 3 + 1] > 7) a[i * 3 + 1] = -7;
      }
      pGeo.attributes.position.needsUpdate = true;
    }
    dust.rotation.y = pointer.x * 0.08;
    camera.position.x = pointer.x * 0.25;
    camera.position.y = 0.2 - pointer.y * 0.15;
    camera.lookAt(0, 0.2, 0);
    composer.render();
  }
  frame();

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); frame(); }
  });

  return { state };
}
