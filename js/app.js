// Sinalizar e Proteger — simulador de sinalização de obra (BR-101)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const $ = (id) => document.getElementById(id);

// ---------- Renderer / sky / light ----------
const canvas = $("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const sky = new Sky(); sky.scale.setScalar(5000); scene.add(sky);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(200));
Object.entries({ turbidity: 5, rayleigh: 1.4, mieCoefficient: 0.004, mieDirectionalG: 0.85 }).forEach(([k, v]) => sky.material.uniforms[k].value = v);
sky.material.uniforms.sunPosition.value.copy(sunDir);
scene.fog = new THREE.Fog("#C9CFD3", 350, 2600);
const dayBg = (() => { const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#9FA9B1"); gr.addColorStop(0.55, "#C4CBD0"); gr.addColorStop(1, "#DADEE0"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
sky.visible = false; scene.background = dayBg;
const hemi = new THREE.HemisphereLight("#E8EDF0", "#6A6656", 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight("#F5F2EC", 1.5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 6000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 2; controls.maxDistance = 1200;

// ---------- Helpers ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const PAINT = (c) => M(c, { roughness: 0.42, metalness: 0.25 });
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
const rbox = (w, h, d, r, mat, p, x, y, z) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, p, x, y, z);
const box = (w, h, d, mat, p, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, x, y, z);
const cyl = (rt, rb, h, mat, p, x, y, z, seg = 18) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, p, x, y, z);
function canvasTex(size, draw, rx = 1, ry = rx, w = size) {
  const c = document.createElement("canvas"); c.width = w; c.height = size; draw(c.getContext("2d"), w, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function speckle(g, w, h, n, cols, a, min = 1, max = 3) { for (let i = 0; i < n; i++) { g.globalAlpha = a * Math.random(); g.fillStyle = cols[i % cols.length]; const r = min + Math.random() * (max - min); g.fillRect(Math.random() * w, Math.random() * h, r, r); } g.globalAlpha = 1; }
const rnd = (a, b) => a + Math.random() * (b - a);
function label(text, fg = "#1C1F24", bg = "#F2B544", h = 1) {
  const c = document.createElement("canvas"); const g = c.getContext("2d");
  g.font = "600 44px IBM Plex Sans, sans-serif"; const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w; c.height = 72; g.font = "600 44px IBM Plex Sans, sans-serif";
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, 72, 14); g.fill();
  g.fillStyle = fg; g.textBaseline = "middle"; g.fillText(text, 20, 38);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false })); s.renderOrder = 30; s.scale.set(w / 72 * h, h, 1); return s;
}
const glowTex = canvasTex(128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,220,140,0.8)"); gr.addColorStop(1, "rgba(255,160,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });

const retro = [];   // retroreflective faces that glow at night under headlights

// ---------- Textures ----------
const TX = {
  asphalt: canvasTex(512, (g, w, h) => { g.fillStyle = "#3D3F43"; g.fillRect(0, 0, w, h); speckle(g, w, h, 26000, ["#2A2B2E", "#55575C", "#6E6F73", "#1E1F21"], 0.7); g.globalAlpha = 0.07; g.fillStyle = "#1A1B1D"; for (let i = 0; i < 6; i++) g.fillRect(0, i * 85 + 20, w, 18); g.globalAlpha = 1; }),
  milled: canvasTex(256, (g, w, h) => { g.fillStyle = "#77746D"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = x % 12 ? "#5E5B55" : "#8E8A82"; g.fillRect(x, 0, 3, h); } speckle(g, w, h, 8000, ["#45433F", "#A29E95", "#2E2D2B"], 0.6); }),
  fresh: canvasTex(256, (g, w, h) => { g.fillStyle = "#18191B"; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ["#2A2B2E", "#0F1011", "#33353A"], 0.8); }),
  grass: canvasTex(512, (g, w, h) => { g.fillStyle = "#6E8A4C"; g.fillRect(0, 0, w, h); speckle(g, w, h, 30000, ["#5C7A3C", "#86A25E", "#4E6A33", "#9AAE6B", "#7A7344"], 0.55, 1, 4); }),
  gravel: canvasTex(512, (g, w, h) => { g.fillStyle = "#87827A"; g.fillRect(0, 0, w, h); speckle(g, w, h, 26000, ["#6C675F", "#A09A90", "#5A554E", "#B8B2A6"], 0.7, 1, 4); }),
  smoke: canvasTex(128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(235,235,232,0.55)"); gr.addColorStop(1, "rgba(235,235,232,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); })
};

// ---------- Highway layout (metres) ----------
// BR-101 Pista Sul. Our carriageway runs toward +x. Faixa 1 (left, next to the New Jersey) z -3.6..0, faixa 2 (right) z 0..3.6, shoulder z 3.6..6.1.
const X0 = -2700, X1 = 800, LEN = X1 - X0, XC = (X0 + X1) / 2;
const LANE = 3.6, SH = 2.5, NJZ = -LANE - 1.2, OPP = NJZ - 0.4;   // New Jersey in the median, opposite carriageway beyond it
const RAIL = LANE + SH + 0.85, SLOPE0 = 9.5, SLOPE1 = 26, SLOPEH = 7;
const world = new THREE.Group(); scene.add(world);
function strip(z0, z1, mat, y = 0) { const p = mesh(new THREE.PlaneGeometry(LEN, z1 - z0), mat, world, XC, y, (z0 + z1) / 2); p.rotation.x = -Math.PI / 2; p.castShadow = false; return p; }
function texMat(t, rx, ry, o = {}) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return M("#FFFFFF", { map: c, roughness: 0.92, ...o }); }
const grass = mesh(new THREE.PlaneGeometry(8000, 3000), texMat(TX.grass, 800, 300), world, XC, -0.05, 0); grass.rotation.x = -Math.PI / 2; grass.castShadow = false;
strip(-LANE, LANE, texMat(TX.asphalt, LEN / 6, 1.2));
strip(LANE, LANE + SH, texMat(TX.asphalt, LEN / 6, 0.4, { color: "#D9D6CF" }), 0.001);      // older, lighter shoulder
strip(LANE + SH, RAIL + 0.3, texMat(TX.gravel, LEN / 4, 0.3), -0.01);
strip(NJZ + 0.35, -LANE, texMat(TX.asphalt, LEN / 6, 0.2), 0.001);
strip(OPP - 2 * LANE - 0.6, OPP, texMat(TX.asphalt, LEN / 6, 1.2));
strip(OPP - 2 * LANE - 0.6 - SH, OPP - 2 * LANE - 0.6, texMat(TX.asphalt, LEN / 6, 0.4, { color: "#D9D6CF" }), 0.001);
const paint = M("#F4F4F0", { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
const yellow = M("#F2C230", { roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
function line(z, mat, w = 0.15, dash = 0, gap = 0, y = 0.006) {
  if (!dash) { const l = mesh(new THREE.PlaneGeometry(LEN, w), mat, world, XC, y, z); l.rotation.x = -Math.PI / 2; l.castShadow = false; return; }
  const g = new THREE.PlaneGeometry(dash, w); const n = Math.floor(LEN / (dash + gap));
  const im = new THREE.InstancedMesh(g, mat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  for (let i = 0; i < n; i++) { m4.compose(new THREE.Vector3(X0 + i * (dash + gap) + dash / 2, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); }
  im.receiveShadow = true; world.add(im);
}
line(LANE, paint, 0.2); line(-LANE, paint, 0.15); line(0, paint, 0.15, 4, 12);
line(OPP - 0.3, paint); line(OPP - 0.6 - 2 * LANE, paint, 0.2); line(OPP - 0.6 - LANE, paint, 0.15, 4, 12);
// New Jersey concrete barrier in the median, with retroreflective delineators
const njMat = M("#B7B5AE", { roughness: 0.95 });
(() => {
  const sh = new THREE.Shape([[-0.3, 0], [0.3, 0], [0.3, 0.08], [0.16, 0.33], [0.08, 0.81], [-0.08, 0.81], [-0.16, 0.33], [-0.3, 0.08]].map(([a, b]) => new THREE.Vector2(a, b)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: LEN, bevelEnabled: false }); geo.rotateY(Math.PI / 2);
  const nj = mesh(geo, njMat, world, X0, 0, NJZ);
  const dg = new THREE.BoxGeometry(0.08, 0.1, 0.02), n = Math.floor(LEN / 8);
  const im = new THREE.InstancedMesh(dg, M("#F4F4F0", { emissive: "#FFFFFF", emissiveIntensity: 0, roughness: 0.3 }), n), m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m4.makeTranslation(X0 + i * 8, 0.62, NJZ + 0.13); im.setMatrixAt(i, m4); }
  world.add(im); retro.push(im);
})();
// W-beam guardrail on the right shoulder
(() => {
  const mat = M("#A9AEB3", { metalness: 0.85, roughness: 0.35 });
  const postG = new THREE.BoxGeometry(0.1, 0.8, 0.15), n = Math.floor(LEN / 4), im = new THREE.InstancedMesh(postG, M("#7D8288", { metalness: 0.7, roughness: 0.5 }), n), m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m4.makeTranslation(X0 + i * 4, 0.4, RAIL + 0.15); im.setMatrixAt(i, m4); }
  im.castShadow = true; world.add(im);
  const sh = new THREE.Shape([[0, 0], [0.05, 0.04], [0.05, 0.12], [0, 0.16], [0.05, 0.2], [0.05, 0.28], [0, 0.32], [-0.01, 0.32], [0.035, 0.28], [0.035, 0.2], [-0.01, 0.16], [0.035, 0.12], [0.035, 0.04], [-0.01, 0]].map(([a, b]) => new THREE.Vector2(-a, b)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: LEN, bevelEnabled: false }); geo.rotateY(Math.PI / 2);
  mesh(geo, mat, world, X0, 0.5, RAIL + 0.05);
  const dg = new THREE.BoxGeometry(0.02, 0.08, 0.1), im2 = new THREE.InstancedMesh(dg, M("#F4F4F0", { emissive: "#FFFFFF", emissiveIntensity: 0 }), n);
  for (let i = 0; i < n; i += 2) { m4.makeTranslation(X0 + i * 4, 0.92, RAIL + 0.1); im2.setMatrixAt(i / 2, m4); }
  im2.count = Math.ceil(n / 2); world.add(im2); retro.push(im2);
})();
// grass embankment rising on the right (as on the BR-101 photos)
(() => {
  const g = new THREE.BufferGeometry();
  const v = [X0, 0, SLOPE0, X1, 0, SLOPE0, X1, SLOPEH, SLOPE1, X0, SLOPEH, SLOPE1];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, LEN / 8, 0, LEN / 8, 2.4, 0, 2.4], 2));
  g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
  const m = mesh(g, M("#FFFFFF", { map: (() => { const t = TX.grass.clone(); t.needsUpdate = true; t.repeat.set(1, 1); return t; })(), roughness: 1 }), world); m.castShadow = false;
  const top = mesh(new THREE.PlaneGeometry(LEN, 400), texMat(TX.grass, LEN / 8, 50), world, XC, SLOPEH, SLOPE1 + 200); top.rotation.x = -Math.PI / 2; top.castShadow = false;
})();
const slopeY = (z) => z <= SLOPE0 ? 0 : z >= SLOPE1 ? SLOPEH : (z - SLOPE0) / (SLOPE1 - SLOPE0) * SLOPEH;
// vegetation: round trees, eucalyptus and bamboo clumps (instanced)
(() => {
  const leaf = [M("#4F6E33", { flatShading: true, roughness: 0.9 }), M("#5D7D3B", { flatShading: true, roughness: 0.9 }), M("#3F5A2A", { flatShading: true, roughness: 0.9 })];
  const bamboo = M("#7A9A3E", { flatShading: true, roughness: 0.85 }), bark = M("#5B4430", { roughness: 0.95 }), euBark = M("#C9C2B2", { roughness: 0.9 });
  const ico = new THREE.IcosahedronGeometry(1, 1), trunkG = new THREE.CylinderGeometry(0.5, 0.7, 1, 7);
  const parts = { leaf0: [], leaf1: [], leaf2: [], bamboo: [], bark: [], eu: [] };
  const put = (k, x, y, z, sx, sy, sz, rx = 0, rz = 0) => parts[k].push([x, y, z, sx, sy, sz, rx, rz]);
  for (let i = 0; i < 260; i++) {
    const right = Math.random() < 0.6, x = rnd(X0, X1), z = right ? rnd(SLOPE0 + 4, 70) : rnd(OPP - 2 * LANE - 8, -80), y = right ? slopeY(z) : 0, t = Math.random();
    if (t < 0.35) { // bamboo clump
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; put("bamboo", x + Math.cos(a) * 1.2, y + 5.5, z + Math.sin(a) * 1.2, 1.1, 6, 1.1, Math.sin(a) * 0.35, -Math.cos(a) * 0.35); }
    } else if (t < 0.55) { // eucalyptus
      const h = rnd(12, 20); put("eu", x, y + h / 2, z, 0.35, h, 0.35); put("leaf" + (i % 3), x, y + h + 1, z, 2.6, 3.6, 2.6); put("leaf" + ((i + 1) % 3), x + 1.2, y + h - 1, z + 0.6, 1.8, 2.2, 1.8);
    } else { // round tree
      const s = rnd(1.3, 2.6); put("bark", x, y + 0.9 * s, z, 0.28 * s, 1.8 * s, 0.28 * s);
      [[0, 2.5, 0, 1.3], [0.6, 3.0, 0.3, 1.0], [-0.5, 3.1, -0.3, 0.95], [0, 3.6, 0, 0.8]].forEach(([a, b, c, r]) => put("leaf" + (i % 3), x + a * s, y + b * s, z + c * s, r * s, r * s, r * s));
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const mk = (list, geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, sx, sy, sz, rx, rz], i) => { q.setFromEuler(e.set(rx, 0, rz)); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); im.setMatrixAt(i, m4); }); im.castShadow = true; im.receiveShadow = true; world.add(im); };
  mk(parts.leaf0, ico, leaf[0]); mk(parts.leaf1, ico, leaf[1]); mk(parts.leaf2, ico, leaf[2]);
  mk(parts.bamboo, ico, bamboo); mk(parts.bark, trunkG, bark); mk(parts.eu, trunkG, euBark);
  // distant green hills (Rio Bonito / Tanguá landscape)
  [[-1800, 420, 260], [-900, 380, 220], [-100, 460, 300], [600, 400, 240], [-1400, -380, 250], [200, -420, 280]].forEach(([x, z, r]) => { const h = mesh(new THREE.SphereGeometry(r, 32, 16), M("#5F7C47", { roughness: 1 }), world, x, -r * 0.62, z); h.scale.y = 0.55; h.castShadow = false; });
  // utility poles on the embankment
  for (let x = X0; x < X1; x += 70) { const y = slopeY(16); cyl(0.12, 0.16, 9, M("#9A968C", { roughness: 0.9 }), world, x, y + 4.5, 16, 8); box(1.6, 0.12, 0.12, M("#9A968C"), world, x, y + 8.6, 16); }
})();
// ---------- Portable work-zone signs, in the format used on the BR-101 photos ----------
// Orange rectangular board, warning diamond inside and the distance panel below; prismatic film; steel A-frame (cavalete).
const ORANGE = "#F7931E";
function wear(g, w, h, amount) {
  g.globalAlpha = 0.10; g.fillStyle = "#FFFFFF"; for (let x = 0; x < w; x += 7) g.fillRect(x, 0, 2, h);           // prismatic stripes
  g.globalAlpha = 1; g.lineCap = "round";
  for (let i = 0; i < 40 * amount; i++) { g.globalAlpha = 0.08 + Math.random() * 0.12; g.strokeStyle = Math.random() < 0.7 ? "#3A2A10" : "#FFFFFF"; g.lineWidth = 0.6 + Math.random() * 1.4; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += rnd(-40, 40); y += rnd(-25, 25); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 6 * amount; i++) { g.globalAlpha = 0.06; g.fillStyle = "#2A1A08"; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rnd(10, 40), rnd(5, 18), Math.random() * 3, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}
function pictogram(g, kind, cx, cy, s) {
  g.fillStyle = "#111"; g.strokeStyle = "#111"; g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "obras") {
    // worker with helmet walking with a shovel
    g.beginPath(); g.arc(cx + 0.08 * s, cy - 0.30 * s, 0.07 * s, 0, Math.PI * 2); g.fill();
    g.fillRect(cx + 0.0 * s, cy - 0.37 * s, 0.17 * s, 0.03 * s);                                         // helmet brim
    g.lineWidth = 0.1 * s; g.beginPath(); g.moveTo(cx + 0.07 * s, cy - 0.2 * s); g.lineTo(cx + 0.03 * s, cy + 0.05 * s); g.stroke();   // torso
    g.lineWidth = 0.07 * s; g.beginPath(); g.moveTo(cx + 0.03 * s, cy + 0.05 * s); g.lineTo(cx - 0.05 * s, cy + 0.33 * s); g.stroke();
    g.beginPath(); g.moveTo(cx + 0.03 * s, cy + 0.05 * s); g.lineTo(cx + 0.14 * s, cy + 0.33 * s); g.stroke();
    g.lineWidth = 0.055 * s; g.beginPath(); g.moveTo(cx + 0.08 * s, cy - 0.15 * s); g.lineTo(cx + 0.2 * s, cy - 0.06 * s); g.stroke();
    g.beginPath(); g.moveTo(cx + 0.06 * s, cy - 0.13 * s); g.lineTo(cx - 0.05 * s, cy - 0.02 * s); g.stroke();
    g.lineWidth = 0.025 * s; g.beginPath(); g.moveTo(cx + 0.24 * s, cy - 0.09 * s); g.lineTo(cx - 0.24 * s, cy + 0.08 * s); g.stroke();   // shovel handle
    g.beginPath(); g.ellipse(cx - 0.27 * s, cy + 0.1 * s, 0.07 * s, 0.05 * s, -0.35, 0, Math.PI * 2); g.fill();                         // blade
  } else if (kind === "estreita") {
    // right lane ends: left edge straight, right edge shifts to the left
    g.fillRect(cx - 0.18 * s, cy - 0.3 * s, 0.09 * s, 0.6 * s);
    g.beginPath(); g.moveTo(cx + 0.05 * s, cy - 0.3 * s); g.lineTo(cx + 0.14 * s, cy - 0.3 * s); g.lineTo(cx + 0.14 * s, cy - 0.02 * s); g.lineTo(cx + 0.05 * s, cy + 0.12 * s); g.lineTo(cx + 0.05 * s, cy + 0.3 * s); g.lineTo(cx - 0.04 * s, cy + 0.3 * s); g.lineTo(cx - 0.04 * s, cy + 0.09 * s); g.lineTo(cx + 0.05 * s, cy - 0.05 * s); g.closePath(); g.fill();
  }
}
function boardTex(spec) {
  const W = 512, H = spec.type === "warn" ? 720 : spec.type === "fim" ? 300 : 512;
  const t = canvasTex(H, (g, w, h) => {
    if (spec.type === "reg") {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#D6262B"; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#F6F7F7"; g.beginPath(); g.arc(256, 256, 192, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.clip(); wear(g, w, h, spec.damaged ? 3 : 1); g.restore();
      g.fillStyle = "#111"; g.textAlign = "center"; g.font = "600 200px IBM Plex Sans, sans-serif"; g.fillText(spec.v, 256, 312); g.font = "500 58px IBM Plex Sans, sans-serif"; g.fillText("km/h", 256, 392);
      if (spec.damaged) { g.fillStyle = "#1A1A1A"; g.beginPath(); g.moveTo(170, 30); g.lineTo(235, 20); g.lineTo(215, 70); g.lineTo(190, 62); g.closePath(); g.fill(); g.strokeStyle = "#E8E8E8"; g.lineWidth = 3; g.beginPath(); g.moveTo(170, 30); g.lineTo(190, 62); g.stroke(); }
      return;
    }
    g.fillStyle = ORANGE; g.fillRect(0, 0, w, h);
    wear(g, w, h, spec.damaged ? 3 : 1);
    g.strokeStyle = "#111"; g.lineWidth = 9; g.beginPath(); g.roundRect(18, 18, w - 36, h - 36, 22); g.stroke();
    g.fillStyle = "#111";
    if (spec.type === "fim") { g.textAlign = "center"; g.font = "700 100px IBM Plex Sans, sans-serif"; spec.text.split("|").forEach((l, i, a) => g.fillText(l, 256, 150 + 34 + (i - (a.length - 1) / 2) * 110)); return; }
    g.fillRect(18, 520, w - 36, 7);
    g.save(); g.translate(256, 268); g.rotate(Math.PI / 4); g.lineWidth = 10; g.beginPath(); g.roundRect(-150, -150, 300, 300, 20); g.stroke(); g.restore();
    pictogram(g, spec.pict, 256, 268, 330);
    g.textAlign = "center"; g.font = "600 104px IBM Plex Sans, sans-serif"; g.fillText(spec.text, 256, 655);
  }, 1, 1, W);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const steelMat = M("#3A3D41", { metalness: 0.7, roughness: 0.55 });
function portableSign(x, z, spec) {
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
  const bw = spec.type === "fim" ? 1.6 : spec.type === "reg" ? 1.0 : 1.15, bh = spec.type === "warn" ? bw * 720 / 512 : spec.type === "fim" ? bw * 300 / 512 : bw, y0 = spec.type === "reg" ? 0.55 : 0.4;
  const frame = new THREE.Group(); frame.position.set(0, 0, 0); g.add(frame);   // leans as one piece
  const tex = boardTex(spec);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: spec.type === "reg", alphaTest: spec.type === "reg" ? 0.5 : 0, roughness: 0.35, emissive: "#FFFFFF", emissiveMap: tex, emissiveIntensity: 0 });
  const face = mesh(new THREE.PlaneGeometry(bw, bh), mat, frame, -0.03, y0 + bh / 2, 0); face.rotation.y = -Math.PI / 2;
  const back = mesh(new THREE.PlaneGeometry(bw, bh), M("#7B8086", { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }), frame, -0.01, y0 + bh / 2, 0); back.rotation.y = -Math.PI / 2;
  if (spec.type === "reg") back.scale.set(0.9, 0.9, 1);
  // steel A-frame: two legs in front, two behind, cross bars
  [-1, 1].forEach((sd) => {
    const fl = box(0.035, y0 + bh + 0.05, 0.035, steelMat, frame, 0.0, (y0 + bh) / 2, sd * (bw / 2 - 0.05));
    const bl = box(0.035, y0 + bh * 0.85, 0.035, steelMat, frame, 0.35, (y0 + bh * 0.85) / 2 - 0.04, sd * (bw / 2 - 0.05)); bl.rotation.z = 0.36;
  });
  box(0.03, 0.03, bw - 0.1, steelMat, frame, 0.0, y0 + 0.02, 0); box(0.03, 0.03, bw - 0.1, steelMat, frame, 0.0, y0 + bh - 0.02, 0);
  // sandbags (ballast) on the feet
  const bags = new THREE.Group(); frame.add(bags);
  [-1, 1].forEach((sd) => { rbox(0.42, 0.13, 0.28, 0.05, M("#B79C6A", { roughness: 1 }), bags, 0.4, 0.07, sd * (bw / 2 - 0.05)); });
  g.userData = { face, frame, bags, mat, spec, bh };
  retro.push(face);
  return g;
}
function setLean(sg, on) { sg.userData.frame.rotation.set(on ? 0.38 : 0, 0, on ? -0.12 : 0); sg.userData.frame.position.z = on ? -0.15 : 0; sg.userData.bags.visible = !on; }
function setDamaged(sg, on) { const sp = { ...sg.userData.spec, damaged: on }; const t = boardTex(sp); sg.userData.mat.map = t; sg.userData.mat.emissiveMap = t; sg.userData.mat.needsUpdate = true; }

// ---------- Channelising devices ----------
const coneParts = { base: new RoundedBoxGeometry(0.42, 0.04, 0.42, 3, 0.015), body: new THREE.CylinderGeometry(0.035, 0.17, 0.72, 18), b1: new THREE.CylinderGeometry(0.122, 0.142, 0.11, 18), b2: new THREE.CylinderGeometry(0.085, 0.102, 0.08, 18) };
const coneMat = { base: M("#24272C"), body: M("#E8561A", { roughness: 0.5 }), refl: M("#EEF3F6", { roughness: 0.25, metalness: 0.4, emissive: "#FFFFFF", emissiveIntensity: 0 }) };
function makeCone() {
  const g = new THREE.Group();
  mesh(coneParts.base, coneMat.base, g, 0, 0.02, 0); mesh(coneParts.body, coneMat.body, g, 0, 0.4, 0);
  mesh(coneParts.b1, coneMat.refl, g, 0, 0.48, 0); mesh(coneParts.b2, coneMat.refl, g, 0, 0.66, 0);
  g.userData.top = 0.76;
  return g;
}
// drum channeliser (tambor) with white retroreflective bands
const drumProf = [[0, 0], [0.36, 0], [0.37, 0.06], [0.33, 0.12], [0.29, 0.14], [0.29, 0.9], [0.25, 0.98], [0.12, 1.0], [0.12, 1.06], [0, 1.06]].map(([a, b]) => new THREE.Vector2(a, b));
const drumGeo = new THREE.LatheGeometry(drumProf, 24), drumBand = new THREE.CylinderGeometry(0.295, 0.295, 0.1, 24, 1, true);
function makeDrum() {
  const g = new THREE.Group();
  mesh(drumGeo, M("#E8561A", { roughness: 0.55 }), g);
  [0.3, 0.5, 0.7].forEach((y) => mesh(drumBand, coneMat.refl, g, 0, y, 0));
  g.userData.top = 1.06;
  return g;
}
// battery warning lamp: yellow housing with round amber lens facing the traffic (-x)
const lampMat = new THREE.SpriteMaterial({ map: glowTex, color: "#FFB020", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
const flashMat = lampMat.clone();
const lensSteady = M("#FFB020", { emissive: "#FFB020", emissiveIntensity: 0, roughness: 0.2 }), lensFlash = lensSteady.clone();
function lampOn(dev, flashing) {
  const h = dev.userData.top || 0.8;
  const hs = new THREE.Group(); hs.position.set(0, h, 0); dev.add(hs);
  rbox(0.07, 0.24, 0.2, 0.02, M("#E9C21A", { roughness: 0.5 }), hs, 0, 0.12, 0);
  const lens = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 20), flashing ? lensFlash : lensSteady, hs, -0.045, 0.14, 0); lens.rotation.z = Math.PI / 2;
  const s = new THREE.Sprite(flashing ? flashMat : lampMat); s.position.set(-0.08, 0.14, 0); s.scale.setScalar(0.9); hs.add(s);
  (flashing ? flashers : steady).push(s);
  return hs;
}
const flashers = [], steady = [];

// barrier class III (orange/white stripes)
const stripeTex = canvasTex(64, (g, w, h) => { for (let i = -2; i < 6; i++) { g.fillStyle = i % 2 ? "#F4F6F7" : "#F05A16"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 32 - 64, 64); g.lineTo(i * 32 - 64, 64); g.closePath(); g.fill(); } }, 1, 1, 256);
function barrier(x, z0, z1) {
  const g = new THREE.Group(); world.add(g);
  const len = z1 - z0, t = stripeTex.clone(); t.needsUpdate = true; t.repeat.set(len / 1.2, 1);
  const mat = M("#FFFFFF", { map: t, roughness: 0.35, emissive: "#FFFFFF", emissiveMap: t, emissiveIntensity: 0 });
  [0.55, 0.95, 1.35].forEach((y) => { const b = box(0.04, 0.3, len, mat, g, x, y, (z0 + z1) / 2); retro.push(b); });
  [z0 + 0.2, z1 - 0.2].forEach((z) => { box(0.08, 1.5, 0.08, M("#A4A9AE", { metalness: 0.7 }), g, x + 0.06, 0.75, z); rbox(0.5, 0.06, 0.5, 0.02, M("#24272C"), g, x + 0.06, 0.03, z); });
  g.userData.mat = mat;
  return g;
}

// red flag (DNIT) for the human flagger and checkered flag for the mannequin
function flagMesh(checkered) {
  const g = new THREE.Group();
  cyl(0.012, 0.012, 0.9, M(checkered ? "#6B4A2A" : "#D9D9D6"), g, 0, -0.45, 0, 8);
  const tex = checkered ? canvasTex(128, (c, w, h) => { [[0, 0, "#F26A1B"], [64, 0, "#E8E04A"], [0, 64, "#E8E04A"], [64, 64, "#F26A1B"]].forEach(([x, y, col]) => { c.fillStyle = col; c.fillRect(x, y, 64, 64); }); }) : null;
  const cloth = mesh(new THREE.PlaneGeometry(0.6, 0.6, 8, 1), checkered ? M("#FFFFFF", { map: tex, side: THREE.DoubleSide, roughness: 0.9 }) : M("#D21F26", { side: THREE.DoubleSide, roughness: 0.8 }), g, 0, -0.62, 0.31);
  cloth.rotation.y = Math.PI / 2; g.userData.cloth = cloth;
  return g;
}

// ---------- Vehicles and machines ----------
const MAT = {
  rubber: M("#151618", { roughness: 0.92 }), rim: M("#9EA3A8", { metalness: 0.8, roughness: 0.35 }), chrome: M("#D6DADF", { metalness: 1, roughness: 0.18 }),
  glass: M("#1B2A38", { metalness: 0.6, roughness: 0.08 }), dark: M("#24272C", { roughness: 0.6 }), steel: M("#6E737A", { metalness: 0.7, roughness: 0.45 }),
  head: M("#FFFFFF", { emissive: "#FFF6D8", emissiveIntensity: 1.0 }), tail: M("#B81E1E", { emissive: "#8A0000", emissiveIntensity: 0.6 })
};
function wheel(p, x, y, z, r = 0.55, w = 0.42) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = Math.PI / 2; p.add(g);
  cyl(r, r, w, MAT.rubber, g, 0, 0, 0, 24); cyl(r * 0.58, r * 0.58, w + 0.02, MAT.rim, g, 0, 0, 0, 16); cyl(r * 0.18, r * 0.18, w + 0.06, MAT.chrome, g, 0, 0, 0, 10);
  return g;
}
function car(color) {
  const g = new THREE.Group();
  rbox(4.3, 0.72, 1.8, 0.25, PAINT(color), g, 0, 0.65, 0);
  rbox(2.3, 0.62, 1.62, 0.24, MAT.glass, g, -0.2, 1.22, 0);
  rbox(2.0, 0.08, 1.55, 0.04, PAINT(color), g, -0.2, 1.55, 0);
  [[-1.35, 0.85], [1.35, 0.85], [-1.35, -0.85], [1.35, -0.85]].forEach(([x, z]) => wheel(g, x, 0.36, z, 0.34, 0.24));
  [0.6, -0.6].forEach((z) => { box(0.05, 0.14, 0.34, MAT.head, g, 2.15, 0.75, z); box(0.05, 0.14, 0.32, MAT.tail, g, -2.15, 0.78, z); });
  return g;
}
function paver() {
  // tracked paver: dark body, yellow roof, hopper at -x (rotated in the layout), screed at +x
  const g = new THREE.Group(), body = PAINT("#2C3034"), y = PAINT("#F2B600");
  rbox(3.0, 1.25, 2.6, 0.12, body, g, 0.2, 1.0, 0);
  [1.25, -1.25].forEach((z) => rbox(3.4, 0.55, 0.42, 0.2, MAT.rubber, g, 0.1, 0.32, z));
  box(1.3, 0.12, 3.0, body, g, -1.9, 0.78, 0);
  [1.5, -1.5].forEach((z) => { const w = box(1.4, 0.9, 0.08, PAINT("#3A3F44"), g, -1.9, 1.2, z); w.rotation.x = z > 0 ? 0.38 : -0.38; });
  box(0.1, 0.55, 3.0, MAT.dark, g, -2.6, 0.9, 0);
  [1.0, -1.0].forEach((z) => { const r = cyl(0.17, 0.17, 0.3, MAT.dark, g, -2.68, 0.6, z); r.rotation.x = Math.PI / 2; });
  const aug = cyl(0.16, 0.16, 3.2, MAT.steel, g, 1.85, 0.3, 0, 14); aug.rotation.x = Math.PI / 2;
  rbox(1.0, 0.5, 3.4, 0.05, body, g, 2.4, 0.33, 0);
  [1.72, -1.72].forEach((z) => rbox(1.05, 0.55, 0.06, 0.02, y, g, 2.4, 0.38, z));          // screed end plates
  rbox(1.1, 0.12, 3.6, 0.03, MAT.steel, g, 2.55, 0.68, 0);                                   // operator platform
  [-1.4, 1.4].forEach((z) => rbox(0.5, 0.6, 0.35, 0.05, MAT.dark, g, 2.55, 1.0, z));         // screed consoles
  rbox(0.9, 0.75, 1.1, 0.08, MAT.dark, g, 0.95, 1.95, 0.55);                                 // operator console
  rbox(0.5, 0.12, 0.5, 0.05, MAT.dark, g, 1.3, 1.85, -0.5);                                  // seat
  [[1.7, 1.2], [1.7, -1.2], [-0.5, 1.2], [-0.5, -1.2]].forEach(([x, z]) => cyl(0.04, 0.04, 1.7, MAT.steel, g, x, 2.45, z, 8));
  rbox(2.6, 0.1, 2.8, 0.03, y, g, 0.6, 3.3, 0);                                              // yellow roof
  cyl(0.07, 0.07, 1.2, MAT.dark, g, -0.4, 2.3, 0.95, 10);
  g.userData.beacon = cyl(0.08, 0.08, 0.12, M("#FF9A00", { emissive: "#FF9A00", emissiveIntensity: 0, toneMapped: false }), g, 0.6, 3.42, 0, 12);
  return g;
}
function roller() {
  const g = new THREE.Group(), y = PAINT("#F2B600");
  [1.4, -1.4].forEach((x) => { const d = cyl(0.6, 0.6, 1.7, MAT.steel, g, x, 0.6, 0, 26); d.rotation.x = Math.PI / 2; });
  rbox(2.0, 0.7, 1.6, 0.1, y, g, 0, 1.15, 0);
  rbox(0.9, 0.9, 1.2, 0.1, MAT.dark, g, -0.3, 1.95, 0);
  rbox(1.2, 0.06, 1.5, 0.02, y, g, -0.3, 2.6, 0);
  g.userData.beacon = cyl(0.07, 0.07, 0.1, M("#FF9A00", { emissive: "#FF9A00", emissiveIntensity: 0, toneMapped: false }), g, -0.3, 2.7, 0, 12);
  return g;
}
function dumpTruck() {
  const g = new THREE.Group();
  box(7.6, 0.4, 1.1, MAT.dark, g, 2.6, 0.75, 0);
  rbox(2.3, 1.9, 2.45, 0.18, PAINT("#ECEDEF"), g, 0, 1.95, 0);
  box(0.04, 0.85, 2.05, MAT.glass, g, -1.16, 2.35, 0);
  const body = new THREE.Group(); body.position.set(3.95, 1.25, 0); g.add(body);
  box(5.2, 0.12, 2.5, PAINT("#D27A1E"), body, 0, 0, 0);
  [1.22, -1.22].forEach((z) => box(5.2, 1.5, 0.08, PAINT("#D27A1E"), body, 0, 0.78, z));
  box(0.08, 1.6, 2.5, PAINT("#B4661A"), body, 2.6, 0.8, 0);
  const tx = TX.fresh.clone(); tx.needsUpdate = true;
  box(5.0, 0.5, 2.3, M("#FFFFFF", { map: tx, roughness: 0.6 }), body, 0, 1.35, 0);
  [[-0.1, 1.1], [3.4, 1.1], [4.75, 1.1], [-0.1, -1.1], [3.4, -1.1], [4.75, -1.1]].forEach(([x, z]) => wheel(g, x, 0.55, z * 1.02));
  return g;
}
function pneuRoller() {
  // pneumatic-tyred roller (white), as on the photos
  const g = new THREE.Group(), w = PAINT("#ECE9E1");
  rbox(3.6, 1.0, 1.9, 0.12, w, g, 0, 1.15, 0);
  rbox(1.0, 1.0, 1.4, 0.1, w, g, -0.6, 2.1, 0);
  box(0.6, 0.4, 0.06, MAT.dark, g, 0.6, 1.35, 0.96);
  for (let i = 0; i < 4; i++) { const t = cyl(0.5, 0.5, 0.36, MAT.rubber, g, 1.3, 0.5, -0.75 + i * 0.5, 22); t.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 5; i++) { const t = cyl(0.5, 0.5, 0.3, MAT.rubber, g, -1.3, 0.5, -0.9 + i * 0.45, 22); t.rotation.x = Math.PI / 2; }
  [[-1.1, 0.65], [-1.1, -0.65], [-0.1, 0.65], [-0.1, -0.65]].forEach(([x, z]) => cyl(0.035, 0.035, 1.2, MAT.dark, g, x, 2.6, z, 8));
  rbox(1.4, 0.08, 1.6, 0.03, w, g, -0.6, 3.2, 0);
  g.userData.beacon = cyl(0.07, 0.07, 0.1, M("#FF9A00", { emissive: "#FF9A00", emissiveIntensity: 0, toneMapped: false }), g, -0.6, 3.3, 0, 12);
  return g;
}
function lightTower(num = "5686") {
  // trailer light tower (yellow), fleet number painted on the side
  const g = new THREE.Group(), y = PAINT("#E8B81E");
  rbox(1.8, 0.95, 1.1, 0.08, y, g, 0, 0.95, 0);
  rbox(1.6, 0.08, 1.0, 0.02, MAT.dark, g, 0, 1.45, 0);
  [0.62, -0.62].forEach((z) => { const t = cyl(0.3, 0.3, 0.2, MAT.rubber, g, 0.1, 0.3, z, 18); t.rotation.x = Math.PI / 2; const f = box(0.7, 0.06, 0.25, MAT.dark, g, 0.1, 0.62, z); });
  box(1.2, 0.06, 0.06, MAT.dark, g, -1.4, 0.45, 0);
  const numTex = canvasTex(64, (c, w, h) => { c.fillStyle = "#E8B81E"; c.fillRect(0, 0, w, h); c.fillStyle = "#111"; c.font = "700 44px IBM Plex Mono, monospace"; c.textAlign = "center"; c.fillText(num, w / 2, 48); }, 1, 1, 192);
  numTex.wrapS = numTex.wrapT = THREE.ClampToEdgeWrapping;
  const np = mesh(new THREE.PlaneGeometry(0.6, 0.2), new THREE.MeshStandardMaterial({ map: numTex }), g, 0, 1.25, 0.56); np.castShadow = false;
  cyl(0.06, 0.08, 6.0, MAT.steel, g, -0.6, 4.4, 0, 10);
  const head = new THREE.Group(); head.position.set(-0.6, 7.4, 0); g.add(head);
  box(0.12, 0.08, 1.2, MAT.dark, head, 0, 0, 0);
  g.userData.lamps = [-0.4, 0.4].map((z) => { const l = box(0.12, 0.35, 0.5, M("#FFFFFF", { emissive: "#FFF5DA", emissiveIntensity: 0, toneMapped: false }), head, -0.06, 0.2, z); l.rotation.z = 0.5; return l; });
  return g;
}
function speedTrailer() {
  // radar display trailer: "SUA VELOCIDADE" + LED digits + 60 km/h, solar panel
  const g = new THREE.Group();
  const c = document.createElement("canvas"); c.width = 256; c.height = 400; const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  function draw(v) {
    ctx.fillStyle = "#F2F3F3"; ctx.fillRect(0, 0, 256, 400); ctx.strokeStyle = "#222"; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 244, 388);
    ctx.fillStyle = "#222"; ctx.font = "600 26px IBM Plex Sans, sans-serif"; ctx.textAlign = "center"; ctx.fillText("SUA VELOCIDADE", 128, 46);
    ctx.fillStyle = "#151515"; ctx.fillRect(34, 64, 188, 110);
    ctx.fillStyle = v > 60 ? "#FF2A1A" : "#FFB020"; ctx.font = "700 96px IBM Plex Mono, monospace"; ctx.fillText(v ? String(v) : "", 128, 156);
    ctx.fillStyle = "#D6262B"; ctx.beginPath(); ctx.arc(128, 290, 82, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#F6F7F7"; ctx.beginPath(); ctx.arc(128, 290, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.font = "600 70px IBM Plex Sans, sans-serif"; ctx.fillText("60", 128, 312); ctx.font = "500 20px IBM Plex Sans, sans-serif"; ctx.fillText("km/h", 128, 340);
    tex.needsUpdate = true;
  }
  draw(0);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: "#FFFFFF", emissiveMap: tex, emissiveIntensity: 0.15, roughness: 0.4 });
  const face = mesh(new THREE.PlaneGeometry(0.9, 1.4), mat, g, -0.06, 2.35, 0); face.rotation.y = -Math.PI / 2;
  box(0.08, 1.45, 0.95, MAT.dark, g, 0, 2.35, 0);
  cyl(0.06, 0.06, 1.6, MAT.steel, g, 0.05, 0.9, 0, 10);
  const sol = box(0.6, 0.03, 0.9, M("#1C2A44", { metalness: 0.5, roughness: 0.2 }), g, 0.15, 3.2, 0); sol.rotation.z = 0.5;
  rbox(1.6, 0.25, 1.2, 0.04, M("#D8DCDF", { metalness: 0.5, roughness: 0.4 }), g, 0.2, 0.45, 0);
  [0.65, -0.65].forEach((z) => { const t = cyl(0.28, 0.28, 0.18, MAT.rubber, g, 0.2, 0.28, z, 18); t.rotation.x = Math.PI / 2; });
  box(1.2, 0.06, 0.06, MAT.steel, g, -1.2, 0.4, 0);
  g.userData = { draw, mat, value: 0 };
  return g;
}

// ---------- Work zone: BR-101 Pista Sul, faixa 2 (right lane) closed, per DNIT IPR-738 ----------
// Regulated speed on the trecho: 100 km/h light vehicles / 80 km/h heavy (sign seen on the photos) -> transition 200 m.
const VREG = 100, VHEAVY = 80;
const TAPER = VREG <= 60 ? 100 : VREG <= 80 ? 150 : 200;   // transition length by regulated speed
const WORK0 = 0, WORK1 = 150;                                // work area
const PROT0 = -30;                                           // protection area 30 m before the work area
const T0 = PROT0 - TAPER, T1 = PROT0;                        // transition
const SHOUT = LANE + SH - 0.3, LINE1 = 0.3;                  // channel line: from shoulder edge to the lane line
const Z = {};
const tags = [];   // floating labels for the aerial views
["pre", "trans", "prot", "work", "ret", "fim"].forEach((k) => { Z[k] = new THREE.Group(); world.add(Z[k]); });
// pre-signing sequence taken from the night photos (22/10/2026, km 248-253). Order and distances to be confirmed with the approved plan.
const SIGNS_PRE = [
  { d: 2000, spec: { type: "warn", pict: "obras", text: "A 2 Km" }, name: "Obras a 2 km" },
  { d: 1000, spec: { type: "warn", pict: "obras", text: "A 1 Km" }, name: "Obras a 1 km" },
  { d: 800, spec: { type: "reg", v: "80" }, name: "Velocidade máxima 80 km/h" },
  { d: 500, spec: { type: "warn", pict: "estreita", text: "A 500 m" }, name: "Pista estreita a 500 m" },
  { d: 400, spec: { type: "reg", v: "60" }, name: "Velocidade máxima 60 km/h" },
  { d: 300, spec: { type: "warn", pict: "estreita", text: "A 300 m" }, name: "Pista estreita a 300 m" },
  { d: 100, spec: { type: "warn", pict: "obras", text: "A 100 m" }, name: "Obras a 100 m" }
];
SIGNS_PRE.forEach((s) => {
  const x = T0 - s.d;
  s.obj = portableSign(x, LANE + SH + 0.35, s.spec); Z.pre.add(s.obj); s.x = x;
  const lb = label(s.name, "#1C1F24", "#F2B544", 1.6); lb.position.set(x, 6.5, LANE + SH + 0.4); Z.pre.add(lb); tags.push(lb);
});
const sign80 = SIGNS_PRE[2].obj, sign60 = SIGNS_PRE[4].obj;
// mannequin flagger on the guardrail, with a warning lamp (seen on the photos)
const MANNEQ_X = T0 - 160;
// human flagger (DNIT: red flag, cone 10 m before him), at the start of the transition
const FLAG_X = T0 - 40;
const flagCone = makeCone(); flagCone.position.set(FLAG_X - 10, 0, LANE + 1.4); Z.pre.add(flagCone);
// transition (max 15 m apart): drums with flashing lamps first, then cones with steady lamps
const transCones = [];
for (let i = 0, n = Math.ceil(TAPER / 15); i <= n; i++) {
  const k = i / n, c = i < 4 ? makeDrum() : makeCone(); c.position.set(T0 + k * TAPER, 0, SHOUT + (LINE1 - SHOUT) * k); Z.trans.add(c); transCones.push(c);
  lampOn(c, i < 4);
}
// light tower at the start of the transition, on the grass behind the guardrail
const tower0 = lightTower("5686"); tower0.position.set(T0 + 40, 0, RAIL + 1.6); tower0.rotation.y = Math.PI; Z.trans.add(tower0);
// protection area: class III barrier + drums, kept free of material
const bar = barrier(PROT0, LINE1 + 0.2, SHOUT); Z.prot.add(bar);
[LINE1 + 0.6, SHOUT - 0.4].forEach((z) => { const d = makeDrum(); d.position.set(PROT0 - 3, 0, z); Z.prot.add(d); lampOn(d, true); });
// speed display trailer in the closed lane, with three cones in front (photo 19:01)
const radar = speedTrailer(); radar.position.set(PROT0 + 8, 0, LANE / 2 + 0.4); Z.prot.add(radar);
[-0.9, 0, 0.9].forEach((dz, i) => { const c = makeCone(); c.position.set(PROT0 + 5.5, 0, LANE / 2 + 0.4 + dz); Z.prot.add(c); if (i === 0) lampOn(c, true); });
// tangent cones along the work (max 30 m apart)
for (let x = PROT0; x <= WORK1 + 15; x += 30) { const c = makeCone(); c.position.set(x, 0, LINE1); Z.prot.add(c); lampOn(c, false); }
// work area: milled lane with an edge drop to the shoulder, fresh mat, machines and crew
(() => {
  const ml = TX.milled.clone(); ml.needsUpdate = true; ml.repeat.set(30, 1);
  const p = mesh(new THREE.PlaneGeometry(WORK1 - 60, LANE - 0.4), M("#FFFFFF", { map: ml, roughness: 0.95 }), Z.work, (60 + WORK1) / 2, 0.012, LANE / 2 + 0.2); p.rotation.x = -Math.PI / 2; p.castShadow = false;
  const fr = TX.fresh.clone(); fr.needsUpdate = true; fr.repeat.set(12, 1);
  const q = mesh(new THREE.PlaneGeometry(55, LANE - 0.4), M("#FFFFFF", { map: fr, roughness: 0.35 }), Z.work, 30, 0.014, LANE / 2 + 0.2); q.rotation.x = -Math.PI / 2; q.castShadow = false;
  // edge drop (degrau) between the milled lane and the shoulder
  box(WORK1 - 60, 0.05, 0.04, M("#2A2A28", { roughness: 1 }), Z.work, (60 + WORK1) / 2, 0.025, LANE - 0.02);
  box(WORK1 - 60, 0.012, 0.25, M("#D9D6CF", { roughness: 0.95 }), Z.work, (60 + WORK1) / 2, 0.05, LANE + 0.12);
})();
// cones with steady lamps along the edge drop (shoulder side)
const dropCones = new THREE.Group(); Z.work.add(dropCones);
for (let x = 60; x <= WORK1; x += 30) { const c = makeCone(); c.position.set(x, 0, LANE + 0.5); dropCones.add(c); lampOn(c, false); }
const pv = paver(); pv.position.set(58, 0, LANE / 2 + 0.2); pv.rotation.y = Math.PI; Z.work.add(pv);
const dt1 = dumpTruck(); dt1.position.set(68.5, 0, LANE / 2 + 0.2); dt1.rotation.y = Math.PI; Z.work.add(dt1);
const rl = roller(); rl.position.set(18, 0, LANE / 2 + 0.2); Z.work.add(rl);
const pr = pneuRoller(); pr.position.set(38, 0, LANE / 2 + 0.2); Z.work.add(pr);
const tower = lightTower("5719"); tower.position.set(45, 0, RAIL + 1.6); tower.rotation.y = Math.PI; Z.work.add(tower);
const tower2 = lightTower("5686"); tower2.position.set(115, 0, RAIL + 1.6); tower2.rotation.y = Math.PI; Z.work.add(tower2);
const towerLights = [[45, tower], [115, tower2], [T0 + 40, tower0]].map(([x, tw]) => {
  const L = new THREE.SpotLight("#F4F6FF", 0, 75, 0.95, 0.55, 1.1);
  L.position.set(x + 0.6, 7.5, RAIL + 1.6); L.target.position.set(x - 4, 0, LANE / 2); L.userData.tw = tw;
  tw.parent.add(L, L.target); return L;
});
towerLights[0].castShadow = true; towerLights[0].shadow.mapSize.set(1024, 1024);
const hazes = [];
for (let i = 0; i < 22; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.smoke, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { x: rnd(10, 55), z: rnd(0.6, LANE), life: Math.random() }; Z.work.add(s); hazes.push(s); }
// return to normal: 15 m protection after, 30 m return taper (15 m spacing)
for (let i = 0; i <= 2; i++) { const c = makeCone(); c.position.set(WORK1 + 15 + i * 15, 0, LINE1 + (SHOUT - LINE1) * (i / 2)); Z.ret.add(c); lampOn(c, false); }
// end of works and the normal speed again
const fimSign = portableSign(WORK1 + 95, LANE + SH + 0.35, { type: "fim", text: "FIM DAS|OBRAS" }); Z.fim.add(fimSign);
const vEnd = portableSign(WORK1 + 145, LANE + SH + 0.35, { type: "reg", v: String(VREG) }); Z.fim.add(vEnd);

// floating labels for the aerial views
[[T0 + TAPER / 2, 6, 3, `Transição · ${TAPER} m · a cada 15 m`, Z.trans], [PROT0 + 10, 7, 2, "Área de proteção · 30 m", Z.prot], [WORK1 / 2, 9, 2, "Área de trabalho · faixa 2", Z.work], [WORK1 + 30, 6, 3, "Proteção 15 m · retorno", Z.ret], [WORK1 + 120, 7, 6, "Fim das obras", Z.fim], [FLAG_X, 5, LANE + 1.5, "Sinaleiro · cone 10 m antes", Z.pre], [MANNEQ_X, 4.5, RAIL - 0.3, "Boneco sinalizador", Z.pre]].forEach(([x, y, z, txt, grp]) => { const lb = label(txt, "#FFFFFF", "#1C1F24", 2.0); lb.position.set(x, y, z); grp.add(lb); tags.push(lb); });

// ---------- Through and opposite traffic (cars, a bus and trucks) ----------
function bus() {
  const g = new THREE.Group();
  rbox(12, 2.6, 2.5, 0.25, PAINT("#E9ECEF"), g, 0, 1.75, 0);
  box(10.5, 0.9, 2.52, MAT.glass, g, -0.3, 2.25, 0);
  box(11.5, 0.25, 2.53, PAINT("#1F5FA8"), g, 0, 1.15, 0);
  box(0.05, 1.3, 2.2, MAT.glass, g, 6.02, 2.2, 0);
  [[4, 1.1], [4, -1.1], [-3.5, 1.1], [-3.5, -1.1]].forEach(([x, z]) => wheel(g, x, 0.5, z, 0.5, 0.3));
  [0.8, -0.8].forEach((z) => { box(0.05, 0.16, 0.3, MAT.head, g, 6.03, 0.8, z); box(0.05, 0.2, 0.3, MAT.tail, g, -6.03, 0.9, z); });
  return g;
}
const traffic = [];
[["car", "#B82525"], ["bus"], ["car", "#2D4F9E"], ["truck"], ["car", "#E7E8EA"], ["car", "#3C8C5C"], ["car", "#2B2D31"], ["bus"]].forEach(([k, c], i) => {
  const m = k === "bus" ? bus() : k === "truck" ? dumpTruck() : car(c);
  m.userData = { x: X0 + i * 430, dir: i % 3 === 2 ? -1 : 1, v: k === "car" ? 26 : 21, kind: k };
  world.add(m); traffic.push(m);
});
const SKIN = ["#C69772", "#8D5B3E", "#E0B48F"];
class Worker {
  constructor({ shirt = "#2E3B55", pants = "#283246", skin = SKIN[0], vest = true, helmet = "#F4F4F2", longSleeve = true, coverall = false } = {}) {
    if (coverall) { shirt = pants = "#EE6A1E"; vest = false; }
    const root = this.root = new THREE.Group();
    const mSkin = M(skin, { roughness: 0.6 }), mShirt = M(shirt, { roughness: 0.88 }), mPants = M(pants, { roughness: 0.9 });
    const mBoot = M("#2B1F16", { roughness: 0.7 }), mSole = M("#141414", { roughness: 0.9 }), mGlove = M("#B08A55", { roughness: 0.95 });
    const mVest = M("#FF6A12", { roughness: 0.65 }), mRefl = M("#E7EDF1", { roughness: 0.25, metalness: 0.45, emissive: "#3A3A3A" });
    const cap = (r, len, mat, parent, y) => { const m = mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat, parent, 0, y, 0); return m; };
    const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    // reflective band (silver with fluorescent yellow edges), as on the crew's coveralls
    const mSilver = M("#DCE2E6", { roughness: 0.25, metalness: 0.5, emissive: "#FFFFFF", emissiveIntensity: 0 }), mFluo = M("#D7E83A", { roughness: 0.6 });
    const band = (parent, r, y, sx = 1, sz = 1) => {
      const b = mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.026, 24, 1, true), mSilver, parent, 0, y, 0); b.scale.set(sx, 1, sz);
      [-1, 1].forEach((k) => { const e = mesh(new THREE.CylinderGeometry(r + 0.003, r + 0.003, 0.012, 24, 1, true), mFluo, parent, 0, y + k * 0.019, 0); e.scale.set(sx, 1, sz); });
      this.refl.push(mSilver);
    };
    this.refl = [];
    this.j = {};
    const j = this.j;
    j.hips = J(root, 0, 0.98, 0);
    rbox(0.34, 0.2, 0.22, 0.08, mPants, j.hips, 0, -0.02, 0);
    mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), M("#1A1B1E"), j.hips, 0, 0.08, 0).scale.z = 0.72;
    mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), M("#9EA3A8", { metalness: 0.9, roughness: 0.3 }), j.hips, 0, 0.08, 0.125);
    j.spine = J(j.hips, 0, 0.1, 0);
    j.chest = J(j.spine, 0, 0.17, 0);
    // torso shape via lathe (a bit wider at the chest)
    const torsoProf = [[0.0, -0.17], [0.16, -0.17], [0.175, -0.05], [0.19, 0.1], [0.185, 0.2], [0.15, 0.27], [0.06, 0.3], [0, 0.3]].map(([a, b]) => new THREE.Vector2(a, b));
    const torso = mesh(new THREE.LatheGeometry(torsoProf, 28), mShirt, j.chest); torso.scale.set(1.08, 1, 0.7);
    if (coverall) { band(j.chest, 0.19, 0.04, 1.08, 0.72); band(j.chest, 0.185, 0.18, 1.08, 0.72); }
    if (vest) {
      const vp = torsoProf.map((v) => new THREE.Vector2(v.x * 1.06 + (v.x > 0 ? 0.004 : 0), v.y)).slice(1, 6);
      const vm = mesh(new THREE.LatheGeometry([new THREE.Vector2(0.17, -0.15), ...vp.slice(1)], 28, 0, Math.PI * 2), mVest, j.chest); vm.scale.set(1.08, 1, 0.72);
      [-0.06, 0.08].forEach((y) => { const b = mesh(new THREE.CylinderGeometry(0.2, 0.193, 0.035, 28, 1, true), mRefl, j.chest, 0, y, 0); b.scale.set(1.09, 1, 0.74); });
      [-0.075, 0.075].forEach((x) => { const s = mesh(new THREE.BoxGeometry(0.035, 0.3, 0.012), mRefl, j.chest, x, 0.08, 0.136); s.rotation.x = -0.1; });
    }
    j.neck = J(j.chest, 0, 0.3, 0);
    mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.09, 16), mSkin, j.neck, 0, 0.03, 0);
    j.head = J(j.neck, 0, 0.08, 0);
    const head = mesh(new THREE.SphereGeometry(0.105, 28, 20), mSkin, j.head, 0, 0.1, 0.005); head.scale.set(0.9, 1.12, 1.0);
    const jaw = mesh(new THREE.SphereGeometry(0.08, 20, 14), mSkin, j.head, 0, 0.045, 0.025); jaw.scale.set(0.95, 0.75, 0.95);
    mesh(new THREE.ConeGeometry(0.016, 0.04, 10), mSkin, j.head, 0, 0.095, 0.108).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => {
      const ear = mesh(new THREE.SphereGeometry(0.022, 10, 8), mSkin, j.head, s * 0.093, 0.1, 0); ear.scale.set(0.5, 1, 0.8);
      mesh(new THREE.SphereGeometry(0.014, 12, 10), M("#F4F2EE", { roughness: 0.3 }), j.head, s * 0.034, 0.122, 0.092);
      mesh(new THREE.SphereGeometry(0.007, 10, 8), M("#2B1B12", { roughness: 0.2 }), j.head, s * 0.034, 0.122, 0.104);
      const brow = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), M("#2B211A"), j.head, s * 0.034, 0.142, 0.1); brow.rotation.z = -s * 0.12;
    });
    this.lids = [-1, 1].map((s) => { const l = mesh(new THREE.SphereGeometry(0.0155, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mSkin, j.head, s * 0.034, 0.122, 0.092); l.rotation.x = -1.4; l.scale.y = 0.01; return l; });
    mesh(new THREE.BoxGeometry(0.034, 0.004, 0.006), M("#7A4B3A"), j.head, 0, 0.058, 0.1);
    const hair = helmet ? null : mesh(new THREE.SphereGeometry(0.108, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), M("#241A13"), j.head, 0, 0.115, -0.006); if (hair) hair.scale.set(0.92, 1.1, 1.0);
    if (helmet) {
      const hm = M(helmet, { roughness: 0.38, metalness: 0.1 });
      const shell = mesh(new THREE.SphereGeometry(0.135, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), hm, j.head, 0, 0.135, -0.005); shell.scale.set(0.95, 0.95, 1.05);
      const brim = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32), hm, j.head, 0, 0.137, 0.02); brim.scale.set(0.95, 1, 1.18);
      mesh(new THREE.BoxGeometry(0.025, 0.04, 0.24), hm, j.head, 0, 0.255, -0.01);
      [-1, 1].forEach((s) => { const st = mesh(new THREE.BoxGeometry(0.008, 0.12, 0.012), M("#1C1F24"), j.head, s * 0.085, 0.09, 0.02); st.rotation.x = 0.25; });
    }
    // arms
    const arm = (s) => {
      const sh = J(j.chest, s * 0.215, 0.22, 0);
      mesh(new THREE.SphereGeometry(0.064, 16, 12), mShirt, sh, 0, 0, 0);
      cap(0.058, 0.2, mShirt, sh, -0.15);
      const el = J(sh, 0, -0.29, 0);
      cap(0.05, 0.18, longSleeve ? mShirt : mSkin, el, -0.13);
      if (coverall) { band(sh, 0.058, -0.12); band(el, 0.05, -0.12); }
      const wr = J(el, 0, -0.265, 0.005);
      rbox(0.075, 0.09, 0.04, 0.018, mGlove, wr, 0, -0.045, 0.005);
      const th = rbox(0.022, 0.05, 0.022, 0.01, mGlove, wr, -s * 0.03, -0.03, 0.025); th.rotation.z = s * 0.5;
      const grip = J(wr, 0, -0.08, 0.02);
      return { sh, el, wr, grip };
    };
    const L = arm(1), R = arm(-1);
    Object.assign(j, { lSh: L.sh, lEl: L.el, lWr: L.wr, rSh: R.sh, rEl: R.el, rWr: R.wr });
    this.lHand = L.grip; this.rHand = R.grip;
    // legs
    const leg = (s) => {
      const hp = J(j.hips, s * 0.095, -0.06, 0);
      cap(0.075, 0.3, mPants, hp, -0.2);
      const kn = J(hp, 0, -0.43, 0);
      cap(0.062, 0.3, mPants, kn, -0.2);
      if (coverall) { band(kn, 0.062, -0.1); band(kn, 0.062, -0.24); }
      const an = J(kn, 0, -0.42, 0);
      rbox(0.11, 0.1, 0.25, 0.035, mBoot, an, 0, -0.03, 0.045);
      rbox(0.115, 0.025, 0.26, 0.01, mSole, an, 0, -0.08, 0.045);
      return { hp, kn, an };
    };
    const LL = leg(1), RL = leg(-1);
    Object.assign(j, { lHp: LL.hp, lKn: LL.kn, lAn: LL.an, rHp: RL.hp, rKn: RL.kn, rAn: RL.an });
    // animation state
    this.cur = {}; this.names = Object.keys(j);
    this.names.forEach((n) => this.cur[n] = new THREE.Euler());
    this.hipsY = 0.98; this.lift = 0;
    this.mode = "idle"; this.phase = 0; this.t = 0; this.pose = null; this.blink = 2;
    this.path = null; this.speed = 1.25; this.onArrive = null;
  }
  // pose = { joint: [x, y, z] }; values not given relax to neutral
  static base(t) {
    const b = 0.02 * Math.sin(t * 1.6);
    return { spine: [b * 0.5, 0, 0], chest: [b, 0, 0], lSh: [0.05, 0, 0.08], rSh: [0.05, 0, -0.08], lEl: [-0.18, 0, 0], rEl: [-0.18, 0, 0], head: [0, 0.06 * Math.sin(t * 0.37), 0], neck: [0.02, 0, 0] };
  }
  walkPose() {
    const p = this.phase, s = Math.sin(p), c = Math.cos(p);
    return {
      lHp: [-0.48 * s, 0, 0.02], rHp: [0.48 * s, 0, -0.02],
      lKn: [0.08 + 0.8 * Math.max(0, c), 0, 0], rKn: [0.08 + 0.8 * Math.max(0, -c), 0, 0],
      lAn: [0.25 * s - 0.1 * Math.max(0, c), 0, 0], rAn: [-0.25 * s - 0.1 * Math.max(0, -c), 0, 0],
      lSh: [0.42 * s, 0, 0.08], rSh: [-0.42 * s, 0, -0.08], lEl: [-0.35 - 0.2 * Math.max(0, -s), 0, 0], rEl: [-0.35 - 0.2 * Math.max(0, s), 0, 0],
      spine: [0.06, 0.08 * s, 0], chest: [0.02, -0.12 * s, 0], hips: [0, 0.1 * s, 0], head: [-0.04, 0.05 * s, 0]
    };
  }
  walkTo(points, done) { this.path = points.map((p) => new THREE.Vector3(p[0], 0, p[1])); this.onArrive = done; this.mode = "walk"; this.pose = null; }
  set(pose, opts = {}) { this.pose = pose; this.mode = "pose"; this.poseT = 0; this.liftTarget = opts.lift || 0; }
  idle() { this.mode = "idle"; this.pose = null; this.liftTarget = 0; }
  faceTo(x, z) { this.faceTarget = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  update(dt) {
    this.t += dt;
    let target = Worker.base(this.t);
    if (this.mode === "walk" && this.path) {
      const goal = this.path[0], pos = this.root.position;
      const d = new THREE.Vector3(goal.x - pos.x, 0, goal.z - pos.z), dist = d.length();
      if (dist < 0.04) { this.path.shift(); if (!this.path.length) { this.path = null; this.mode = "idle"; const f = this.onArrive; this.onArrive = null; f && f(); } }
      else {
        const step = Math.min(dist, this.speed * dt);
        pos.addScaledVector(d.normalize(), step);
        this.faceTarget = Math.atan2(d.x, d.z);
        this.phase += step / 0.68 * Math.PI;
        target = { ...target, ...this.walkPose() };
      }
    }
    if (this.mode === "pose" && this.pose) {
      this.poseT += dt;
      const p = typeof this.pose === "function" ? this.pose(this.poseT) : this.pose;
      target = { ...target, ...p };
    }
    if (this.faceTarget !== undefined) {
      let dy = this.faceTarget - this.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.root.rotation.y += dy * Math.min(1, dt * 8);
    }
    const k = Math.min(1, dt * (this.mode === "walk" ? 14 : 7));
    this.names.forEach((n) => {
      const v = target[n] || [0, 0, 0], e = this.cur[n];
      e.x += (v[0] - e.x) * k; e.y += (v[1] - e.y) * k; e.z += (v[2] - e.z) * k;
      this.j[n].rotation.set(e.x, e.y, e.z);
    });
    // walking bob and posture lift
    this.lift += ((this.liftTarget || 0) - this.lift) * Math.min(1, dt * 6);
    const bob = this.mode === "walk" ? -0.025 * Math.cos(2 * this.phase) : 0;
    this.j.hips.position.y = this.hipsY + bob + this.lift;
    // blinking
    this.blink -= dt;
    const closed = this.blink < 0.12;
    this.lids.forEach((l) => l.scale.y = closed ? 1 : 0.01);
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
  }
}

// ---------- Crew (orange coveralls with reflective bands, as on the photos) ----------
const SKINS = SKIN;
const crew = [];
function addWorker(opts, x, z, ry, parent = world) { const w = new Worker({ coverall: true, ...opts }); w.root.position.set(x, 0, z); w.root.rotation.y = ry; parent.add(w.root); crew.push(w); return w; }
const P = {
  rake: (t) => { const s = Math.sin(t * 2.2); return { spine: [0.45, 0, 0], chest: [0.12, 0.15 * s, 0], lHp: [-0.35, 0, 0], lKn: [0.45, 0, 0], rHp: [0.1, 0, 0], rKn: [0.2, 0, 0], rSh: [-0.9 - 0.35 * s, 0, -0.1], rEl: [-0.5, 0, 0], lSh: [-0.7 - 0.35 * s, 0, 0.2], lEl: [-0.9, 0, 0], head: [0.3, 0, 0] }; },
  stopFlag: { rSh: [0, 0, -1.55], rEl: [0, 0, 0], rWr: [0, 0, 0], lSh: [-1.5, 0, 0.15], lEl: [-0.1, 0, 0], lWr: [-1.3, 0, 0], head: [0, 0, 0] },
  warnFlag: (t) => ({ rSh: [-0.15 - 0.55 * (0.5 + 0.5 * Math.sin(t * 3.2)), 0, -0.25], rEl: [0, 0, 0], lSh: [0.05, 0, 0.08], head: [0, 0, 0] }),
  goFlag: (t) => ({ rSh: [0.1, 0, -0.15], rEl: [-0.1, 0, 0], lSh: [-1.2 + 0.5 * Math.sin(t * 3.5), 0, 0.1], lEl: [-0.6 - 0.4 * Math.sin(t * 3.5), 0, 0], lWr: [-0.3, 0, 0], head: [0, -0.6, 0] }),
  carry: { rSh: [-0.15, 0, -0.12], rEl: [-0.5, 0, 0] },
  point: { rSh: [-1.45, 0.25, -0.2], rEl: [-0.1, 0, 0] },
  mannequin: { rSh: [-1.5, 0, -0.1], rEl: [0, 0, 0], lSh: [0.05, 0, 0.1], lEl: [-0.15, 0, 0] },
  op: (t) => ({ spine: [0.1, 0, 0], lHp: [-1.4, 0, 0], rHp: [-1.4, 0, 0], lKn: [1.4, 0, 0], rKn: [1.4, 0, 0], rSh: [-0.7, 0, -0.1], rEl: [-0.9, 0, 0], lSh: [-0.7, 0, 0.1], lEl: [-0.9, 0, 0], head: [0, 0.4 * Math.sin(t * 0.5), 0] })
};
// crew in the work area, raking behind the paver
const rakers = [
  addWorker({ skin: SKINS[0], helmet: "#F4F4F2" }, 52, LANE * 0.35, Math.PI / 2, Z.work),
  addWorker({ skin: SKINS[1], helmet: "#F2C230" }, 50, LANE * 0.8, Math.PI / 2.4, Z.work),
  addWorker({ skin: SKINS[2], helmet: "#2D5DA8" }, 46, LANE * 0.55, Math.PI / 1.8, Z.work)
];
rakers.forEach((w, i) => { const rake = new THREE.Group(); cyl(0.015, 0.015, 1.6, M("#A08060"), rake, 0, -0.8, 0, 6); box(0.5, 0.05, 0.06, MAT.steel, rake, 0, -1.6, 0); w.rHand.add(rake); w.set((t) => P.rake(t + i)); });
const opv = addWorker({ skin: SKINS[1] }, 0, 0, 0, pv); opv.root.position.set(1.3, 1.2, -0.5); opv.root.rotation.y = -Math.PI / 2; opv.set(P.op);
const opr = addWorker({ skin: SKINS[0], helmet: "#F2C230" }, 0, 0, 0, rl); opr.root.position.set(-0.3, 0.95, 0); opr.root.rotation.y = Math.PI / 2; opr.set(P.op);
const opp = addWorker({ skin: SKINS[2] }, 0, 0, 0, pr); opp.root.position.set(-0.6, 1.25, 0); opp.root.rotation.y = Math.PI / 2; opp.set(P.op);
// human flagger with the red flag (DNIT), on the shoulder, facing the oncoming traffic (-x)
const flagger = addWorker({ skin: SKINS[2], helmet: "#F2F2EF" }, FLAG_X, LANE + 1.5, -Math.PI / 2, Z.pre);
const flag = flagMesh(false); flagger.rHand.add(flag);
let flagMode = "warn";
function setFlag(m) { flagMode = m; flagger.root.rotation.y = m === "go" ? 0 : -Math.PI / 2; flagger.set(m === "stop" ? P.stopFlag : m === "go" ? P.goFlag : P.warnFlag); }
setFlag("warn");
// mannequin flagger on the guardrail, waving a checkered flag, with a warning lamp (photo 18:51)
const mannequin = addWorker({ skin: "#D9B79A", helmet: "#2D5DA8" }, MANNEQ_X, RAIL - 0.35, -Math.PI / 2, Z.pre);
mannequin.lids.forEach((l) => l.visible = false);
mannequin.set(P.mannequin);
const mFlag = flagMesh(true); mannequin.rHand.add(mFlag);
const mLampHolder = new THREE.Group(); mLampHolder.position.set(MANNEQ_X - 0.5, 0.75, RAIL - 0.05); mLampHolder.userData.top = 0.01; Z.pre.add(mLampHolder); lampOn(mLampHolder, true);
// installation crew (demonstration)
const installer = addWorker({ skin: SKINS[0] }, T0 - 1020, LANE + SH + 0.6, Math.PI / 2);
installer.speed = 1.4;
const carried = makeCone(); carried.visible = false; installer.rHand.add(carried); carried.position.set(0, -0.75, 0.05);

// ---------- Problems seen on the photos (shown during the related questions) ----------
function setProblems({ lean = false, damaged = false } = {}) { setLean(sign80, lean); setDamaged(sign60, damaged); }

// ---------- Day / night ----------
let night = false;
function setNight(on) {
  night = on;
  scene.background = on ? new THREE.Color("#05080F") : dayBg;
  scene.fog.color.set(on ? "#05080F" : "#C9CFD3"); scene.fog.near = on ? 60 : 350; scene.fog.far = on ? 520 : 2600;
  sun.intensity = on ? 0.12 : 1.5; sun.color.set(on ? "#8FA8FF" : "#F5F2EC");
  hemi.intensity = on ? 0.08 : 1.35; scene.environmentIntensity = on ? 0.05 : 0.5;
  renderer.toneMappingExposure = on ? 1.3 : 1.0;
  applyNightSel();
  driveLight.intensity = on ? 600 : 0;
  radar.userData.mat.emissiveIntensity = on ? 0.9 : 0.15;
  $("tDay").classList.toggle("on", !on); $("tDay").setAttribute("aria-pressed", !on);
  $("tNight").classList.toggle("on", on); $("tNight").setAttribute("aria-pressed", on);
}

// ---------- Views ----------
let camAnim = null;
function camTo(p, t, instant) {
  const P1 = new THREE.Vector3(...p), T1v = new THREE.Vector3(...t);
  if (instant) { camera.position.copy(P1); controls.target.copy(T1v); controls.update(); camAnim = null; return; }
  camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p: P1, t: T1v, k: 0 };
}
const sx = (i) => SIGNS_PRE[i].x;
const VIEWS = {
  overview: [[T0 - 280, 85, -110], [T0 + 60, 0, 1]],
  pre: [[sx(0) - 16, 2.4, 4.0], [sx(0), 1.4, LANE + SH + 0.4]],
  preAll: [[T0 - 1250, 130, -150], [T0 - 950, 0, 2]],
  sign80: [[sx(2) - 9, 1.9, 3.2], [sx(2), 1.0, LANE + SH + 0.4]],
  sign60: [[sx(4) - 6, 1.7, 3.6], [sx(4), 1.1, LANE + SH + 0.4]],
  manneq: [[MANNEQ_X - 9, 2.2, 3.2], [MANNEQ_X, 1.3, RAIL - 0.3]],
  trans: [[T0 - 45, 16, -16], [T0 + 90, 0, 3]],
  prot: [[PROT0 - 22, 8, 18], [PROT0 + 6, 1, 2]],
  radar: [[PROT0 - 4, 2.0, LANE / 2 - 1.5], [PROT0 + 8, 2.2, LANE / 2 + 0.4]],
  work: [[18, 13, -20], [52, 0, 2]],
  drop: [[70, 2.6, LANE + 3.8], [92, 0.2, LANE]],
  fim: [[WORK1 + 40, 11, -20], [WORK1 + 110, 0, 3]],
  flag: [[FLAG_X - 14, 2.6, -0.5], [FLAG_X, 1.2, LANE + 1.5]]
};
const view = (k, instant) => camTo(VIEWS[k][0], VIEWS[k][1], instant);

// driver's-eye drive through the work zone
const myCar = car("#3F5F8F"); world.add(myCar); myCar.visible = false;
const driveLight = new THREE.SpotLight("#FFF4E0", 0, 170, 0.42, 0.45, 1.2); myCar.add(driveLight); driveLight.position.set(2.2, 0.8, 0); driveLight.target.position.set(40, 0, 0); myCar.add(driveLight.target);
let drive = null;
function vAt(x) { if (x < sx(2)) return VREG; if (x < sx(4)) return 80; if (x < WORK1 + 145) return 60; return VREG; }
function zAt(x) { if (x < T0) return LANE / 2; if (x < T1) return LANE / 2 - LANE * ((x - T0) / TAPER); if (x < WORK1 + 45) return -LANE / 2; return -LANE / 2 + LANE * Math.min(1, (x - WORK1 - 45) / 60); }
function startDrive(speedUp = 3, onEnd) {
  drive = { x: sx(0) - 120, v: VREG, speedUp, onEnd };
  myCar.visible = true; controls.enabled = false; tags.forEach((s) => s.visible = false); $("speed").hidden = false; $("reg").textContent = `${VREG} leves / ${VHEAVY} pesados`;
  $("tDrive").classList.add("on");
}
function stopDrive() {
  if (!drive) return; const f = drive.onEnd; drive = null;
  myCar.visible = false; controls.enabled = true; tags.forEach((s) => s.visible = true); $("speed").hidden = true; $("tDrive").classList.remove("on");
  applyNightSel();
  view("overview"); f && f();
}

// ---------- HUD helpers ----------
const S = { errors: 0, t0: 0, running: false, log: [], k: "", demo: false };
let toastTimer;
function toast(msg, kind = "info", ms = 3600) { const t = $("toast"); t.className = "toast " + kind; t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, ms); }
function mistake(msg) { if (S.demo) return; S.errors++; $("errs").textContent = S.errors; S.log.push({ ok: false, t: msg, k: S.k }); toast(msg, "bad", 5000); }
function good(msg, logText) { if (S.demo) return; S.log.push({ ok: true, t: logText || msg, k: S.k }); toast(msg, "ok"); }
function setStep(n, total, t, s) { $("stepN").textContent = total ? `${n}/${total}` : n; $("stepT").textContent = t; $("stepS").textContent = s || ""; }
function acts(html) { $("acts").innerHTML = html; }
function card(html) { $("card").innerHTML = html; $("cardWrap").hidden = false; }
function closeCard() { $("cardWrap").hidden = true; }
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function ask(key, eyebrow, q, opts, onOk) {
  S.k = key;
  const list = shuffle(opts);
  card(`<div class="eyebrow">${eyebrow}</div><h2>${q}</h2><div class="choices">${list.map((o, i) => `<button class="choice" type="button" data-i="${i}">${o.t}</button>`).join("")}</div>`);
  $("card").querySelectorAll(".choice").forEach((b) => b.onclick = () => {
    const o = list[+b.dataset.i];
    if (o.ok) { closeCard(); good(o.okMsg || "Certo.", o.log); onOk(); } else { mistake(o.why); b.disabled = true; b.style.opacity = 0.45; }
  });
}
function showAreas(keys) { Object.entries(Z).forEach(([k, g]) => g.visible = keys.includes(k)); }
const ALL = ["pre", "trans", "prot", "work", "ret", "fim"];

// ---------- The test ----------
const TOTAL = 11;
const AREA_ORDER = [
  ["pre", "Pré-sinalização (placas de advertência e de velocidade)"],
  ["trans", "Área de transição (tambores e cones em diagonal)"],
  ["prot", "Área de proteção (barreira, tambores e radar de velocidade)"],
  ["work", "Canteiro de obras (equipe e máquinas entram)"],
  ["ret", "Área de retorno à situação normal"],
  ["fim", "Sinalização de fim das obras"]
];
function intro() {
  S.running = false; S.demo = false; $("demoNote").hidden = true; acts("");
  showAreas(ALL); setProblems(); setNight(false); applyAllOn(); view("overview", true);
  setStep("BR", null, "BR-101 · Pista Sul · faixa 2 interditada", "Explore a obra de dia e de noite, ou faça o teste.");
  card(`<div class="eyebrow">Treinamento · Sinalização de obras · DNIT IPR-738</div>
    <h1>Recuperação do pavimento na faixa 2 da BR-101, de dia e de noite</h1>
    <p>Cenário montado a partir das fotos de acompanhamento do trecho km 248 ao 253, Pista Sul, faixa 2 (22 e 23/10/2026). Velocidade regulamentada de ${VREG} km/h para veículos leves e ${VHEAVY} km/h para pesados. A sinalização segue o Manual de Sinalização de Obras e Emergências em Rodovias do DNIT (IPR-738).</p>
    <div class="zones"><span>Pré-sinalização</span><b>a partir de 2 km</b><span>Transição</span><b>${TAPER} m (acima de 80 km/h)</b><span>Área de proteção</span><b>30 m antes · 15 m depois</b><span>Espaçamento</span><b>15 m na transição · 30 m na reta</b></div>
    <div class="acts"><button class="btn primary" type="button" id="goTest">Fazer o teste</button><button class="btn" type="button" id="goExplore">Explorar a obra</button></div>
    <p class="fine">A ordem e as distâncias das placas foram tiradas das fotos e devem ser conferidas com o projeto de sinalização aprovado. Simulação de apoio: não substitui o projeto, o manual da concessionária nem o treinamento prático.</p>`);
  $("goTest").onclick = startTest;
  $("goExplore").onclick = explore;
}
function explore() {
  closeCard();
  setStep("Explorar", null, "Escolha um ponto da obra para ver de perto", "Use também Dia/Noite e a visão do motorista na barra de cima.");
  acts([["overview", "Visão geral"], ["preAll", "Pré-sinalização"], ["pre", "Primeira placa (2 km)"], ["manneq", "Boneco sinalizador"], ["flag", "Sinaleiro"], ["trans", "Transição"], ["radar", "Radar de velocidade"], ["work", "Canteiro"], ["drop", "Degrau da fresagem"], ["fim", "Fim das obras"]].map(([k, t]) => `<button class="btn" type="button" data-v="${k}">${t}</button>`).join(""));
  $("acts").querySelectorAll("[data-v]").forEach((b) => b.onclick = () => view(b.dataset.v));
}
function startTest() {
  closeCard(); S.errors = 0; S.log = []; S.t0 = performance.now(); S.running = true; S.demo = false; $("errs").textContent = "0"; $("demoNote").hidden = true;
  setNight(false); setProblems(); showAreas([]); view("overview");
  setStep(1, TOTAL, "A rodovia está livre. Vamos montar a sinalização da obra.", "");
  setTimeout(qPre, 600);
}
function qPre() {
  setStep(1, TOTAL, "Pré-sinalização", "");
  ask("pre", "Pré-sinalização", `No trecho, a velocidade é ${VREG} km/h para leves. A equipe começa a pré-sinalização com “Obras a 2 km”. Por que tão longe?`, [
    { t: "Por costume: o manual pede só 300 m, o resto é excesso de zelo", why: `A ${VREG} km/h o motorista precisa de distância para ser avisado e reduzir aos poucos. Para estreitamento de pista, o manual do DNIT pede no mínimo 1000 m.` },
    { t: `Porque a ${VREG} km/h o motorista precisa ser avisado bem antes e reduzir aos poucos; o mínimo do manual para estreitamento é 1000 m, e começar a 2 km dá mais margem`, ok: true, okMsg: "Certo: aviso com antecedência e redução gradual.", log: "Entendeu a pré-sinalização começando a 2 km" },
    { t: "Para a placa ficar perto do posto de pesagem e da fiscalização", why: "A distância é definida pela segurança do motorista que se aproxima da obra." }
  ], qTaper);
}
function qTaper() {
  setStep(2, TOTAL, "Área de transição", "");
  ask("trans", "Área de transição", `Com velocidade regulamentada de ${VREG} km/h para leves, qual deve ser o comprimento da transição (a diagonal que tira os carros da faixa 2)?`, [
    { t: "100 m", why: "100 m é para velocidade até 60 km/h." },
    { t: "150 m, porque os pesados andam a 80 km/h", why: "A transição é dimensionada pela velocidade regulamentada da via. Acima de 80 km/h, são 200 m." },
    { t: "200 m", ok: true, okMsg: "Certo: 200 m para velocidades acima de 80 km/h.", log: "Transição de 200 m para 100 km/h" }
  ], qSpacing);
}
function qSpacing() {
  setStep(3, TOTAL, "Espaçamento dos dispositivos", "");
  ask("esp", "Dispositivos de canalização", "Qual é o espaçamento máximo entre cones e tambores?", [
    { t: "30 m na transição e 60 m no trecho reto", why: "Na mudança de faixa o espaçamento é menor: no máximo 15 m. Na reta, no máximo 30 m." },
    { t: "15 m na transição (mudança de faixa) e 30 m no trecho reto", ok: true, okMsg: "Certo: 15 m na transição e 30 m na reta.", log: "Dispositivos a no máximo 15 m na transição e 30 m na reta" },
    { t: "O mesmo espaçamento em toda a obra, de 30 m, porque os tambores são maiores que os cones", why: "Mesmo com tambores, na transição o máximo é 15 m." }
  ], qProt);
}
function qProt() {
  setStep(4, TOTAL, "Área de proteção", "");
  ask("prot", "Área de proteção", "Entre o fim da transição e o canteiro existe a área de proteção. O que é correto?", [
    { t: "Ter de 30 a 50 m antes do canteiro, livre de material e equipamento, com barreira e dispositivos sinalizados", ok: true, okMsg: "Certo: área de proteção livre e sinalizada.", log: "Área de proteção de 30 a 50 m, livre, com barreira" },
    { t: "Usar esse trecho para estacionar os caminhões de massa, que assim protegem a equipe", why: "A área de proteção não pode receber material nem equipamentos da obra: ela é o espaço de segurança se um veículo invadir." },
    { t: "Dispensar a área de proteção quando o radar de velocidade estiver ligado", why: "O radar ajuda a reduzir a velocidade, mas não substitui o espaço de segurança antes do canteiro." }
  ], qOrder);
}
let orderIdx = 0;
function qOrder() {
  S.k = "ordem"; orderIdx = 0;
  setStep(5, TOTAL, "Implantação: toque nas áreas na ordem certa", "A sinalização aparece na cena conforme você implanta.");
  view("overview");
  acts(shuffle(AREA_ORDER).map(([k, t]) => `<button class="btn" type="button" data-k="${k}">${t}</button>`).join(""));
  $("acts").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
    const exp = AREA_ORDER[orderIdx][0], k = b.dataset.k;
    if (k !== exp) { mistake(`Ordem errada: você implantou “${AREA_ORDER.find((a) => a[0] === k)[1]}” antes da hora. A implantação começa pela área mais distante do canteiro, no sentido do tráfego.`); return; }
    Z[k].visible = true; b.disabled = true; b.classList.add("on"); orderIdx++;
    good(`Implantado: ${AREA_ORDER[orderIdx - 1][1]}.`, `Implantou na ordem certa: ${AREA_ORDER[orderIdx - 1][1]}`);
    view(k === "pre" ? "preAll" : k === "ret" ? "fim" : k);
    if (orderIdx === AREA_ORDER.length) { acts(""); setTimeout(qNight, 1800); }
  });
}
const NIGHT_ITEMS = [
  { k: "retro", t: "Placas, cones e tambores retrorrefletivos e limpos", ok: true },
  { k: "flash", t: "Luzes amarelas intermitentes (≈ 60 piscadas/min) no início da transição", ok: true },
  { k: "steady", t: "Luzes de emissão contínua nos cones da canalização", ok: true },
  { k: "tower", t: "Torres de iluminação voltadas para a área de trabalho, sem ofuscar", ok: true },
  { k: "vest", t: "Uniforme com faixas retrorrefletivas em todos os trabalhadores", ok: true },
  { k: "allflash", t: "Luzes intermitentes em todos os cones, para marcar bem o caminho", ok: false, why: "Luz intermitente serve para chamar a atenção, não para delimitar o trajeto. Na canalização, use luz contínua." },
  { k: "spot", t: "Refletores das torres virados para os carros que chegam, para eles verem a obra", ok: false, why: "A iluminação não pode ofuscar os motoristas. Direcione as torres para a área de trabalho." },
  { k: "plain", t: "Cones sem faixa refletiva, já que a área está iluminada pelas torres", ok: false, why: "À noite todos os dispositivos devem ser retrorrefletivos, mesmo com iluminação." }
];
let nightSel = new Set(NIGHT_ITEMS.filter((i) => i.ok).map((i) => i.k));
function qNight() {
  S.k = "noite"; nightSel = new Set();
  setNight(true); view("trans");
  setStep(6, TOTAL, "A obra continua à noite. O que precisa estar ativo?", "Marque o que é exigido e evite as armadilhas. Depois toque em Liberar.");
  acts(shuffle(NIGHT_ITEMS).map((it) => `<button class="btn" type="button" data-k="${it.k}">${it.t}</button>`).join("") + `<button class="btn primary" type="button" id="nGo">Liberar o trabalho noturno</button>`);
  $("acts").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { const k = b.dataset.k; if (nightSel.has(k)) nightSel.delete(k); else nightSel.add(k); b.classList.toggle("on", nightSel.has(k)); applyNightSel(); });
  $("nGo").onclick = () => {
    const wrong = NIGHT_ITEMS.filter((i) => !i.ok && nightSel.has(i.k)), missing = NIGHT_ITEMS.filter((i) => i.ok && !nightSel.has(i.k));
    if (!wrong.length && !missing.length) { good("Sinalização noturna completa.", "Ativou todos os dispositivos noturnos exigidos"); acts(""); setTimeout(qDamaged, 1000); return; }
    wrong.forEach((w) => mistake(w.why));
    if (missing.length) mistake("Faltou: " + missing.map((m) => m.t.toLowerCase()).join("; ") + ".");
  };
}
function applyNightSel() {
  const n = night;
  steady.forEach((o) => o.visible = n && nightSel.has("steady"));
  flashers.forEach((o) => o.visible = n && nightSel.has("flash"));
  lensSteady.emissiveIntensity = n && nightSel.has("steady") ? 2.5 : 0;
  const tw = n && nightSel.has("tower");
  towerLights.forEach((L) => { L.intensity = tw ? 1100 : 0; L.userData.tw.userData.lamps.forEach((l) => l.material.emissiveIntensity = tw ? 3 : 0); });
  const r = n && nightSel.has("retro") ? 0.32 : 0;
  retro.forEach((m) => { if (m.material && m.material.emissiveIntensity !== undefined) m.material.emissiveIntensity = r; });
  coneMat.refl.emissiveIntensity = r ? 0.35 : 0; bar.userData.mat.emissiveIntensity = r;
  crew.forEach((w) => w.refl.forEach((m) => m.emissiveIntensity = n && nightSel.has("vest") ? 0.5 : 0));
}
function applyAllOn() { nightSel = new Set(NIGHT_ITEMS.filter((i) => i.ok).map((i) => i.k)); applyNightSel(); }
function qDamaged() {
  setNight(true); applyAllOn(); setProblems({ damaged: true }); view("sign60");
  setStep(7, TOTAL, "Conferência noturna da sinalização", "");
  ask("conserv", "Conservação", "Na ronda da noite você encontra a placa de 60 km/h com a película rasgada no topo, riscada e suja. O que fazer?", [
    { t: "Deixar até o fim da obra, porque o número ainda dá para ler", why: "Película danificada e suja perde o brilho à noite. O manual pede limpeza e reposição imediata." },
    { t: "Trocar na hora por uma placa reserva do canteiro e registrar a ocorrência", ok: true, okMsg: "Certo: reposição imediata, com reserva no canteiro.", log: "Trocou a placa danificada pela reserva" },
    { t: "Virar a placa de costas até amanhecer, para não confundir o motorista", why: "Sem a placa, o motorista perde a ordem de reduzir a velocidade. Substitua por uma placa reserva." }
  ], () => { setProblems(); qLean(); });
}
function qLean() {
  setNight(false); setProblems({ lean: true }); view("sign80");
  setStep(8, TOTAL, "Estabilidade da placa", "");
  ask("lastro", "Cavaletes", "A placa de 80 km/h está tombando para trás, encostada na defensa, e balança quando passam caminhões. Qual é a solução?", [
    { t: "Deixar encostada na defensa, que serve de apoio", why: "Encostada e inclinada, a placa sai do ângulo de visão do motorista e pode cair na pista com o vento dos caminhões." },
    { t: "Colocar o cavalete de pé e lastrear os pés com sacos de areia", ok: true, okMsg: "Certo: cavalete aprumado e lastreado com sacos de areia.", log: "Aprumou e lastreou o cavalete com sacos de areia" },
    { t: "Colocar pedras ou blocos de concreto sobre os pés do cavalete", why: "Pedras e blocos viram projéteis se um veículo atingir a placa. Use sacos de areia." }
  ], () => { setProblems(); qDrop(); });
}
function qDrop() {
  setNight(true); applyAllOn(); view("drop");
  setStep(9, TOTAL, "Degrau da fresagem", "");
  ask("degrau", "Desnível", "Depois da fresagem ficou um degrau entre a faixa 2 e o acostamento, e o serviço vai continuar à noite. O que é correto?", [
    { t: "Manter o degrau dentro da área canalizada, com cones e luz ao longo dele, e só liberar a faixa depois do recapeamento ou com o desnível sinalizado", ok: true, okMsg: "Certo: desnível dentro da canalização e sinalizado.", log: "Manteve o degrau canalizado e sinalizado" },
    { t: "Liberar a faixa 2 durante a noite para aliviar o trânsito, já que o degrau é pequeno", why: "Um degrau na borda pode fazer o motorista perder o controle, principalmente motos. Mantenha canalizado e sinalizado." },
    { t: "Nada, porque o acostamento não é usado pelos veículos", why: "O acostamento é usado em emergência e por motos. O desnível precisa ficar protegido e sinalizado." }
  ], qFlag);
}
function qFlag() {
  setNight(false); view("flag");
  setStep(10, TOTAL, "Sinaleiro com bandeira", "");
  ask("band", "Sinaleiro", "O sinaleiro precisa parar o fluxo por um momento. Como ele deve fazer?", [
    { t: "Voltado para o tráfego, bandeira estendida na horizontal na altura do ombro, perpendicular à faixa, e a outra mão espalmada para os motoristas", ok: true, okMsg: "Certo: esse é o sinal de parar.", log: "Sinal de parar feito corretamente" },
    { t: "Voltado para o tráfego, levantando e abaixando a bandeira várias vezes", why: "Esse movimento é o de advertência. Para parar, a bandeira fica estendida na horizontal, na altura do ombro." },
    { t: "No meio da faixa aberta, acenando a bandeira acima da cabeça para ser bem visto", why: "O sinaleiro fica em local visível e fora da circulação de veículos, com um cone 10 m antes dele." }
  ], () => { setFlag("stop"); setTimeout(() => { setFlag("warn"); qRemove(); }, 2500); });
}
function qRemove() {
  setNight(false); applyAllOn(); view("overview");
  setStep(11, TOTAL, "Fim do serviço", "");
  ask("ret", "Desativação", "O serviço terminou. Em que ordem a sinalização é retirada?", [
    { t: "Na ordem inversa da implantação: do fim das obras em direção à pré-sinalização", ok: true, okMsg: "Certo: retirada na ordem inversa.", log: "Retirou do fim das obras para a pré-sinalização" },
    { t: "Primeiro a pré-sinalização, que está a 2 km e demora mais para recolher", why: "Sem a pré-sinalização, o motorista encontra a obra sem aviso. A retirada vai do fim das obras para a pré-sinalização." },
    { t: "Primeiro a transição, para liberar a faixa 2 o quanto antes", why: "A retirada segue o inverso da implantação: começa pelo fim das obras." }
  ], finish);
}
function finish() {
  S.running = false;
  const secs = Math.round((performance.now() - S.t0) / 1000), score = Math.max(0, Math.round(100 - S.errors * 9)), pass = score >= 70;
  card(`<div class="eyebrow">${pass ? "Aprovado" : "Refazer"}</div><h1>Sinalização de obra · BR-101 Pista Sul</h1>
    <div class="res"><div><small>Nota</small><b>${score}</b></div><div><small>Tempo</small><b>${fmtT(secs)}</b></div><div><small>Erros</small><b>${S.errors}</b></div></div>
    <ol class="log">${S.log.map((l) => `<li class="${l.ok ? "" : "x"}">${l.ok ? "" : "Erro: "}${l.t}</li>`).join("")}</ol>
    <p class="fine">Em uma versão futura, este resultado poderá ser registrado na ficha do colaborador (matrícula, data, nota e erros) e no painel do RH e do SESMT.</p>
    <div class="acts"><button class="btn primary" type="button" id="demoBtn">Ver a execução correta</button><button class="btn" type="button" id="again">Refazer</button><button class="btn" type="button" id="toMenu">Início</button></div>`);
  $("demoBtn").onclick = demoStart; $("again").onclick = startTest; $("toMenu").onclick = intro;
}

// ---------- Correct-execution demonstration ----------
let D = null, narr = true;
function speak(text) {
  try { speechSynthesis.cancel(); if (!narr) return; const u = new SpeechSynthesisUtterance(text); u.lang = "pt-BR"; u.rate = 1.03; const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith("pt")); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) { /* no speech */ }
}
const later = (ms, fn) => { const tok = D.token; setTimeout(() => { if (D && D.token === tok && S.demo) fn(); }, ms); };
const DEMO = [
  { k: "pre", short: "Pré-sinalização começando a 2 km, com redução de velocidade em degraus", cap: "A equipe começa pela pré-sinalização, a 2 quilômetros da obra. Anda pelo acostamento, de frente para o tráfego, com o uniforme refletivo, e vai avançando no sentido dos carros.", wait: 9000,
    fx: (i) => { showAreas([]); setNight(false); installer.root.visible = true; installer.root.position.set(sx(0) + 6, 0, LANE + SH - 0.2); installer.faceTo(sx(0) - 20, LANE + SH - 0.2); carried.visible = false;
      const f = () => { Z.pre.visible = true; }; if (i) f(); else { installer.set(P.point); later(2500, f); } }, cam: [[sx(0) - 18, 3.2, 5.5], [sx(0) - 2, 1.4, LANE + SH]] },
  { k: "pre", short: "Placas: obras a 2 km e a 1 km, 80 km/h, pista estreita a 500 m, 60 km/h, pista estreita a 300 m e obras a 100 m", cap: "Depois: obras a 1 quilômetro, velocidade de 80, pista estreita a 500 metros, velocidade de 60, pista estreita a 300 metros e obras a 100 metros. O boneco sinalizador reforça o alerta.", v: "preAll", fx: () => { Z.pre.visible = true; } },
  { k: "trans", short: "Transição de 200 m com tambores e cones a cada 15 m", cap: `A transição tem ${TAPER} metros, porque a velocidade é de ${VREG} quilômetros por hora. Os primeiros dispositivos são tambores com luz piscante, e o espaçamento não passa de 15 metros.`, wait: 12000,
    fx: (i) => { Z.trans.visible = true; if (i) { transCones.forEach((c) => c.visible = true); return; }
      transCones.forEach((c) => c.visible = false); installer.root.position.set(T0 - 6, 0, LANE + SH - 0.1); carried.visible = true; installer.set(P.carry);
      transCones.forEach((c, n) => later(600 + n * 700, () => { c.visible = true; }));
      later(300, () => { installer.idle(); installer.walkTo([[T0 + TAPER * 0.5, LANE + SH - 0.4]], () => { carried.visible = false; installer.set(P.point); }); }); },
    cam: [[T0 - 30, 9, -12], [T0 + 70, 0, 3]] },
  { k: "prot", short: "Área de proteção de 30 m livre, com barreira, tambores e o radar de velocidade", cap: "Na área de proteção, 30 metros antes do canteiro, ficam a barreira, os tambores e o radar que mostra a velocidade do motorista. Nada de material estocado aqui.", v: "prot", fx: () => { Z.prot.visible = true; transCones.forEach((c) => c.visible = true); } },
  { k: "ordem", short: "Implantar da área mais distante para o canteiro", cap: "Só agora o canteiro é liberado. A implantação sempre segue esta ordem: pré-sinalização, transição, proteção, canteiro, retorno e fim das obras.", v: "work", fx: () => { Z.work.visible = true; } },
  { k: "esp", short: "Cones a cada 30 m na reta; 15 m de proteção depois do canteiro", cap: "Na reta, os cones ficam a no máximo 30 metros. Depois do canteiro há 15 metros de proteção, o retorno à faixa, a placa de fim das obras e a velocidade normal.", v: "fim", fx: () => { Z.ret.visible = true; Z.fim.visible = true; } },
  { k: "noite", short: "À noite: retrorrefletivos, luzes piscantes no início, luz contínua na canalização e torres sem ofuscar", cap: "À noite, tudo é retrorrefletivo e limpo, as luzes amarelas piscam no início da transição, os cones têm luz contínua e as torres iluminam a área de trabalho sem ofuscar os motoristas.", v: "trans", wait: 9000,
    fx: () => { showAreas(ALL); setNight(true); applyAllOn(); } },
  { k: "conserv", short: "Placa danificada: trocar na hora pela reserva", cap: "Na ronda noturna, placa rasgada ou suja é trocada na hora por uma reserva do canteiro.", v: "sign60", wait: 8000,
    fx: (i) => { if (i) return; setProblems({ damaged: true }); later(3500, () => setProblems()); } },
  { k: "lastro", short: "Cavalete aprumado e lastreado com sacos de areia", cap: "Cavalete sempre de pé, virado para o motorista, com sacos de areia nos pés. Nunca pedras ou blocos de concreto.", v: "sign80", wait: 8000,
    fx: (i) => { setNight(false); if (i) return; setProblems({ lean: true }); later(3500, () => setProblems()); } },
  { k: "degrau", short: "Degrau da fresagem dentro da canalização, com cones e luz", cap: "O degrau da fresagem fica dentro da área canalizada, com cones e luz ao longo dele, até o recapeamento.", v: "drop", fx: () => { setNight(true); applyAllOn(); } },
  { k: "band", short: "Sinaleiro: parar, siga e advertência, com cone 10 m antes", cap: "O sinaleiro fica fora do fluxo, com um cone 10 metros antes. Para parar: bandeira na horizontal, na altura do ombro, e a mão espalmada. Para seguir: de lado, bandeira baixa e gesto com a mão.", v: "flag", wait: 11000,
    fx: (i) => { setNight(false); if (i) { setFlag("warn"); return; } setFlag("stop"); later(3500, () => setFlag("go")); later(7000, () => setFlag("warn")); } },
  { k: "noite", short: "Visão do motorista à noite, com o radar mostrando a velocidade", cap: "Agora a visão do motorista à noite: avisos com antecedência, redução de 100 para 80 e 60, a diagonal bem marcada e o radar mostrando a velocidade.", wait: 34000,
    fx: (i) => { if (i) return; setNight(true); applyAllOn(); later(800, () => startDrive(4, null)); } },
  { k: "ret", short: "Retirada na ordem inversa", cap: "No fim, a sinalização é retirada na ordem inversa: do fim das obras em direção à pré-sinalização.", v: "overview", wait: 9000,
    fx: (i) => { stopDrive(); setNight(false); const order = ["fim", "ret", "work", "prot", "trans", "pre"]; if (i) { showAreas([]); return; } showAreas(ALL); order.forEach((k, n) => later(1200 + n * 1100, () => Z[k].visible = false)); } }
];
function demoReset() { stopDrive(); setNight(false); setProblems(); setFlag("warn"); showAreas([]); transCones.forEach((c) => c.visible = true); carried.visible = false; installer.idle(); }
function demoStart() { closeCard(); S.demo = true; D = { i: -1, playing: true, timer: null, token: 0 }; demoReset(); demoGo(0); }
function demoGo(i) {
  clearTimeout(D.timer); D.token++;
  if (i <= D.i) { demoReset(); for (let j = 0; j < i; j++) DEMO[j].fx(true); }
  D.i = i; const st = DEMO[i];
  if (!(st.wait >= 30000)) stopDrive();
  st.fx(false);
  if (st.cam) camTo(st.cam[0], st.cam[1]); else if (st.v) view(st.v);
  setStep(i + 1, DEMO.length, st.cap, "Execução correta · DNIT IPR-738");
  const errs = S.log.filter((l) => !l.ok && l.k === st.k), first = DEMO.findIndex((s) => s.k === st.k) === i, note = $("demoNote");
  if (first && errs.length) { note.className = "demo-note bad"; note.hidden = false; note.innerHTML = `<b>Você errou nesta etapa:</b><ul>${errs.map((e) => `<li>${e.t}</li>`).join("")}</ul>`; }
  else if (first && S.log.length) { note.className = "demo-note ok"; note.hidden = false; note.innerHTML = "<b>✓ Você fez esta etapa certo.</b>"; }
  else note.hidden = true;
  acts(`<button class="btn" type="button" id="dPrev"${i === 0 ? " disabled" : ""}>Voltar</button>
    <button class="btn" type="button" id="dPlay">${D.playing ? "Pausar" : "Continuar"}</button>
    <button class="btn" type="button" id="dNext">${i === DEMO.length - 1 ? (S.log.length ? "Ver comparativo" : "Concluir") : "Avançar"}</button>
    <button class="btn${narr ? " on" : ""}" type="button" id="dVoice" aria-pressed="${narr}">Narração ${narr ? "ligada" : "desligada"}</button>
    <button class="btn" type="button" id="dEnd">Encerrar</button>`);
  $("dPrev").onclick = () => demoGo(Math.max(0, D.i - 1));
  $("dNext").onclick = () => (D.i + 1 < DEMO.length ? demoGo(D.i + 1) : demoEnd());
  $("dPlay").onclick = () => { D.playing = !D.playing; demoGo(D.i); };
  $("dVoice").onclick = () => { narr = !narr; if (!narr) try { speechSynthesis.cancel(); } catch (e) {} demoGo(D.i); };
  $("dEnd").onclick = demoEnd;
  speak(st.cap);
  if (D.playing) D.timer = setTimeout(() => (D.i + 1 < DEMO.length ? demoGo(D.i + 1) : demoEnd()), st.wait || Math.max(6000, st.cap.length * 72));
}
function demoEnd() {
  clearTimeout(D.timer); D.token++; try { speechSynthesis.cancel(); } catch (e) {}
  stopDrive(); setNight(false); setProblems(); setFlag("warn"); showAreas(ALL); transCones.forEach((c) => c.visible = true); applyAllOn(); view("overview");
  $("demoNote").hidden = true; acts(""); S.demo = false;
  if (!S.log.length) { intro(); return; }
  const keys = []; DEMO.forEach((s) => { if (!keys.includes(s.k)) keys.push(s.k); });
  const rows = keys.map((k) => { const errs = S.log.filter((l) => !l.ok && l.k === k); const caps = DEMO.filter((s) => s.k === k).map((s) => s.short); return `<tr><td class="${errs.length ? "bad" : "ok"}">${errs.length ? errs.map((e) => "✗ " + e.t).join("<br>") : "✓ Fez certo"}</td><td>${caps.join("<br>")}</td></tr>`; }).join("");
  card(`<div class="eyebrow">Comparativo</div><h2>O que você fez × o correto</h2>
    <div class="cmp-wrap"><table class="cmp"><thead><tr><th>O que você fez</th><th>O correto (DNIT IPR-738)</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="acts"><button class="btn primary" type="button" id="dAgain">Rever a demonstração</button><button class="btn" type="button" id="again">Refazer o teste</button><button class="btn" type="button" id="toMenu">Início</button></div>`);
  $("dAgain").onclick = demoStart; $("again").onclick = startTest; $("toMenu").onclick = intro;
}

// ---------- Top bar ----------
$("tDay").onclick = () => { setNight(false); applyAllOn(); };
$("tNight").onclick = () => { setNight(true); applyAllOn(); };
$("tAir").onclick = () => { stopDrive(); view("overview"); };
$("tDrive").onclick = () => { if (drive) stopDrive(); else { closeCard(); startDrive(3, null); } };
$("tMenu").onclick = () => { if (D) { clearTimeout(D.timer); D.token++; } S.demo = false; stopDrive(); try { speechSynthesis.cancel(); } catch (e) {} intro(); };

// ---------- Loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / Math.max(innerHeight, 1); camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let radarT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (S.running) $("time").textContent = fmtT(Math.round((performance.now() - S.t0) / 1000));
  if (camAnim) { camAnim.k = Math.min(1, camAnim.k + dt / 1.6); const e = camAnim.k * camAnim.k * (3 - 2 * camAnim.k); camera.position.lerpVectors(camAnim.p0, camAnim.p, e); controls.target.lerpVectors(camAnim.t0, camAnim.t, e); if (camAnim.k >= 1) camAnim = null; }
  crew.forEach((w) => { if (w.root.parent && (w.root.parent.visible !== false)) w.update(dt); });
  // mannequin flag waving
  mFlag.rotation.x = 0.5 * Math.sin(t * 2.4);
  // devices: flashing ~60/min
  const fl = Math.floor(t * 2) % 2 === 0;
  flashMat.opacity = fl ? 1 : 0.05; lensFlash.emissiveIntensity = night && nightSel.has("flash") ? (fl ? 3 : 0.1) : 0;
  const bk = night && Math.sin(t * 7) > 0;
  [pv.userData.beacon, rl.userData.beacon, pr.userData.beacon].forEach((b) => b.material.emissiveIntensity = bk ? 4 : 0.2);
  hazes.forEach((s) => { const u = s.userData; u.life += dt * 0.2; if (u.life > 1) u.life -= 1; s.position.set(u.x + Math.sin(t * 0.5 + u.z) * 0.3, 0.2 + u.life * 2.6, u.z); s.scale.setScalar(0.8 + u.life * 2.4); s.material.opacity = Math.sin(u.life * Math.PI) * (night ? 0.12 : 0.2); });
  // through traffic: our carriageway uses faixa 1 only near the work zone; the opposite one runs freely
  traffic.forEach((c) => {
    const u = c.userData; u.x += dt * u.v * u.dir;
    if (u.x > X1) u.x = X0; if (u.x < X0) u.x = X1;
    if (u.dir > 0) c.position.set(u.x, 0, -LANE / 2); else c.position.set(u.x, 0, OPP - 0.6 - LANE * 0.5);
    c.rotation.y = (u.dir > 0 ? 0 : Math.PI) + (u.kind === "truck" ? Math.PI : 0);
  });
  // radar display: driver's speed in the drive, otherwise passing traffic
  radarT -= dt;
  if (drive) { const d = PROT0 + 8 - drive.x; const v = d > 5 && d < 180 ? Math.round(drive.v) : 0; if (v !== radar.userData.value) { radar.userData.value = v; radar.userData.draw(v); } }
  else if (radarT < 0) { radarT = 2.5; const v = [58, 62, 84, 71, 66, 59, 77][Math.floor(Math.random() * 7)]; radar.userData.value = v; radar.userData.draw(v); }
  // driver's view
  if (drive) {
    const target = vAt(drive.x); drive.v += (target - drive.v) * Math.min(1, dt * 0.8);
    drive.x += drive.v / 3.6 * dt * drive.speedUp;
    const z = zAt(drive.x), z2 = zAt(drive.x + 8);
    myCar.position.set(drive.x, 0, z); myCar.rotation.y = -Math.atan2(z2 - z, 8);
    tmp.set(drive.x + 0.35, 1.5, z - 0.38).sub(myCar.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), myCar.rotation.y).add(myCar.position);
    camera.position.copy(tmp);
    const look = new THREE.Vector3(drive.x + 30, 1.45, zAt(drive.x + 30));
    camera.lookAt(look); controls.target.copy(look);
    $("kmh").textContent = Math.round(drive.v);
    if (night) {
      retro.forEach((m) => { if (!m.isMesh || m.isInstancedMesh) return; m.getWorldPosition(tmp); const d = tmp.x - drive.x; m.material.emissiveIntensity = d > 2 && d < 260 ? 0.25 + 1.1 * (1 - d / 260) : 0.12; });
      coneMat.refl.emissiveIntensity = 0.9;
    }
    if (drive.x > WORK1 + 260) stopDrive();
  } else controls.update();
  if (!drive) tags.forEach((s) => { if (s.parent && s.parent.visible) s.visible = camera.position.distanceTo(s.getWorldPosition(tmp)) > 28; });
  sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(sunDir, 100);
  renderer.render(scene, camera);
});
intro();
