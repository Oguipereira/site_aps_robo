import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { buildRobot, applyDim } from './robot.js';
import { initSim } from './sim.js';
import { initCode } from './code.js';
import { initPinout } from './pinout.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- rolagem suave ----------
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: 0 }) : t.scrollIntoView();
  })
);

// ---------- cena 3D ----------
const canvas = document.querySelector('#stage');
const isTouch = matchMedia('(pointer: coarse)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch || devicePixelRatio < 2, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = isTouch ? 1.2 : 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 70, 150);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

// luzes
scene.add(new THREE.HemisphereLight(0xfff4e6, 0x080808, 0.35));
const key = new THREE.SpotLight(0xfff1dc, 2600, 160, 0.42, 0.55, 1.6);
key.position.set(18, 52, 24);
key.target.position.set(0, 2, 0);
key.castShadow = true;
key.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.03;
key.shadow.camera.near = 20; key.shadow.camera.far = 120;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xbfd8ff, 1.3);
rim.position.set(-30, 18, -34);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe2bf, 0.4);
fill.position.set(-20, 6, 30);
scene.add(fill);

// arena (dohyô): preta com faixa branca
const arena = new THREE.Group();
const floor = new THREE.Mesh(new THREE.CircleGeometry(50, 128), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const ring = new THREE.Mesh(new THREE.RingGeometry(45, 50, 128), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
ring.receiveShadow = true;
arena.add(floor, ring);
scene.add(arena);

const { root, parts } = buildRobot();
scene.add(root);
const all = Object.values(parts);

// ---------- estado animável ----------
const S = {
  cam: new THREE.Vector3(42, 22, 56),
  tgt: new THREE.Vector3(0, 4.6, 0),
  lift: 0,
  shift: 1, // desloca o robô para a direita (desktop) / para cima (mobile)
  spin: 1, // giro automático no hero
  yaw: -0.55,
  wheelRoll: 0,
};

// ---------- passos da desmontagem ----------
// cada passo: grupos em foco, deslocamentos e câmera
const STEPS = [
  { focus: ['top'], ex: { top: [0, 8.5, 0] }, cam: [30, 34, 48], tgt: [0, 16.5, 0] },
  { focus: ['front', 'sonar'], ex: { front: [0, 3.4, 9.5], sonar: [0, 1.6, 4.6] }, cam: [44, 20, 56], tgt: [0, 11, 6] },
  { focus: ['arduino', 'deck', 'driver'], ex: { arduino: [0, 6.8, -1.5], deck: [0, 3.2, -0.5], driver: [0, 2.6, 2.5] }, cam: [-32, 46, -40], tgt: [0, 13, -1] },
  { focus: ['sideL', 'sideR', 'supportL', 'supportR'], ex: { sideL: [-7.5, 0, 0], sideR: [7.5, 0, 0], supportL: [-3.4, 0, 1.6], supportR: [3.4, 0, 1.6] }, cam: [58, 26, 38], tgt: [0, 11, 0] },
  { focus: ['wheelL', 'wheelR', 'motorL', 'motorR'], ex: { wheelL: [-9.5, 0, 0], wheelR: [9.5, 0, 0], motorL: [-4.4, 0, 0], motorR: [4.4, 0, 0] }, cam: [52, 18, 34], tgt: [1, 9, -2] },
  { focus: ['sensors'], ex: { sensors: [0, -4.6, 0] }, cam: [44, 10, 50], tgt: [0, 4.5, 2] },
  { focus: ['chassis', 'battery'], ex: { battery: [0, 2.8, -1.5] }, cam: [62, 40, 68], tgt: [0, 11, 0] },
];

const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
STEPS.forEach((st, i) => {
  const at = i;
  if (i === 0) {
    tl.to(S, { lift: 5.5, spin: 0, yaw: -0.62, duration: 0.8 }, at);
    tl.to(ring.material.color, { r: 0.16, g: 0.16, b: 0.15, duration: 0.8 }, at);
  }
  for (const [name, v] of Object.entries(st.ex)) {
    tl.to(parts[name].userData.ex, { x: v[0], y: v[1], z: v[2], duration: 0.8 }, at);
  }
  tl.to(S.cam, { x: st.cam[0], y: st.cam[1], z: st.cam[2], duration: 0.8 }, at);
  tl.to(S.tgt, { x: st.tgt[0], y: st.tgt[1], z: st.tgt[2], duration: 0.8 }, at);
  all.forEach((g) => {
    const last = i === STEPS.length - 1;
    const v = last ? 0 : st.focus.includes(g.name) ? 0 : 1;
    tl.to(g.userData.dim, { v, duration: 0.45 }, at + 0.05);
  });
  if (i === 4) tl.to(S, { wheelRoll: Math.PI * 2, duration: 0.8 }, at);
});
tl.to({}, { duration: 0.3 }); // segura o último quadro

// ---------- rótulo da peça (estilo planta técnica) ----------
const callout = document.querySelector('.callout');
const calloutNum = callout.querySelector('.callout-num');
const calloutName = callout.querySelector('.callout-name');
const leader = document.querySelector('.leader line');
const leaderDot = document.querySelector('.leader circle');
const stepEls = [...document.querySelectorAll('.step')];
const rail = [...document.querySelectorAll('.rail li')];
let activeStep = -1;
const tmp = new THREE.Vector3();

function setActive(i) {
  if (i === activeStep) return;
  activeStep = i;
  rail.forEach((li, j) => li.toggleAttribute('data-on', j === i));
  stepEls.forEach((s, j) => s.toggleAttribute('data-on', j === i));
  if (i >= 0) {
    const s = stepEls[i];
    calloutNum.textContent = s.dataset.peca;
    calloutName.textContent = s.dataset.rotulo;
  }
}

// ---------- scroll ----------
const explode = document.querySelector('#montagem');
ScrollTrigger.create({
  trigger: explode,
  start: 'top bottom',
  end: 'bottom bottom',
  scrub: reduced ? true : 1,
  onUpdate: (self) => {
    // p = -1 com o hero na tela; p = i quando o texto do passo i ocupa a tela
    const n = STEPS.length;
    const p = self.progress * n - 1;
    tl.progress(Math.max(0, Math.min(1, (p + 0.9) / tl.duration())));
    setActive(p < -0.45 || p > n - 0.4 ? -1 : Math.min(n - 1, Math.round(p)));
  },
});

// esconde o canvas quando as seções sólidas cobrem a tela
let stageOn = true;
ScrollTrigger.create({
  trigger: '#estrategia',
  start: 'top top',
  onEnter: () => { stageOn = false; canvas.style.visibility = 'hidden'; },
  onLeaveBack: () => { stageOn = true; canvas.style.visibility = 'visible'; },
});

// barra de progresso
const bar = document.querySelector('.progress span');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => (bar.style.transform = `scaleX(${s.progress})`) });

// ---------- animação de entrada: as peças se encaixam ----------
const introOffsets = {
  top: [0, 14, 0], front: [0, 4, 14], sonar: [0, 2, 10], arduino: [0, 10, -4], deck: [0, 6, 0], driver: [0, 4, 4],
  sideL: [-12, 2, 0], sideR: [12, 2, 0], supportL: [-6, 0, 3], supportR: [6, 0, 3], wheelL: [-14, 0, 0], wheelR: [14, 0, 0],
  motorL: [-7, 0, 0], motorR: [7, 0, 0], sensors: [0, -6, 0], chassis: [0, -2, 0], battery: [0, 4, -2],
};
const order = ['chassis', 'sensors', 'battery', 'motorL', 'motorR', 'wheelL', 'wheelR', 'driver', 'deck', 'arduino', 'sideL', 'sideR', 'supportL', 'supportR', 'sonar', 'front', 'top'];
if (!reduced) {
  order.forEach((n, i) => {
    const o = introOffsets[n];
    const u = parts[n].userData;
    u.intro.set(...o);
    u.dim.v = 1;
    gsap.to(u.intro, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'expo.out', delay: 0.25 + i * 0.07 });
    gsap.to(u.dim, { v: 0, duration: 0.6, ease: 'power1.out', delay: 0.25 + i * 0.07 });
  });
  gsap.from(S, { spin: 0, duration: 2.5, delay: 1.2 });
  gsap.from('.hero-copy > *', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 1.5 });
}

// ---------- render ----------
ScrollTrigger.config({ ignoreMobileResize: true });
const mobileMQ = matchMedia('(max-width: 760px), (max-width: 1024px) and (orientation: portrait)');
mobileMQ.addEventListener('change', () => resize(true));
let W = 0, H = 0, mobile = false;
function resize(force) {
  const w = innerWidth;
  // no celular, a barra de endereço muda a altura ao rolar: só refaz ao girar a tela
  if (isTouch && !force && w === W) return;
  W = w;
  H = canvas.clientHeight || innerHeight; // o canvas tem 100lvh: altura estável
  mobile = mobileMQ.matches;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.fov = mobile ? 36 : 30;
  camera.updateProjectionMatrix();
}
addEventListener('resize', () => resize(false));
addEventListener('orientationchange', () => setTimeout(() => resize(true), 200));
resize(true);

let lastT = performance.now();
let spinAngle = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  if (!stageOn) { document.body.classList.remove('has-callout'); return; }
  if (!reduced) spinAngle += dt * 0.22 * S.spin;

  root.position.y = S.lift;
  root.rotation.y = S.yaw + spinAngle * 1;
  // após o hero, o giro acumulado vai sendo absorvido
  if (S.spin < 0.01) spinAngle *= 0.94;

  for (const g of all) {
    const u = g.userData;
    g.position.copy(u.base).add(u.ex).add(u.intro);
    applyDim(g);
    if (u.spin) u.spin.rotation.x = S.wheelRoll * (g.name === 'wheelL' ? 1 : 1);
  }

  // no celular, a câmera recua para o robô caber acima do texto
  const far = mobile ? (W / H < 0.6 ? 1.62 : 1.4) : 1;
  camera.position.copy(S.cam).sub(S.tgt).multiplyScalar(far).add(S.tgt);
  scene.fog.near = 70 * far; scene.fog.far = 150 * far;
  camera.lookAt(S.tgt);
  const sh = S.shift;
  if (mobile) camera.setViewOffset(W, H, 0, H * 0.24 * sh, W, H);
  else {
    // centraliza o robô no espaço livre à direita do texto
    const ref = activeStep < 0 ? document.querySelector('.hero h1') : stepEls[0].firstElementChild;
    const textRight = ref.getBoundingClientRect().right || W * 0.38;
    camera.setViewOffset(W, H, -Math.min(W * 0.24, textRight / 2 + 10) * sh, 0, W, H);
  }

  // rótulo
  if (activeStep >= 0 && !mobile) {
    const names = STEPS[activeStep].focus;
    const g = parts[names[0]];
    tmp.copy(g.userData.anchor).applyMatrix4(g.matrixWorld);
    tmp.project(camera);
    const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
    const cw = callout.offsetWidth;
    let lx = x + (mobile ? 30 : 70);
    if (lx + cw > W - (mobile ? 12 : 150)) lx = x - (mobile ? 30 : 70) - cw;
    lx = Math.max(8, Math.min(W - cw - 8, lx));
    const ly = Math.max(70, y - (mobile ? 46 : 80));
    callout.style.transform = `translate(${lx}px, ${ly}px)`;
    leader.setAttribute('x1', x); leader.setAttribute('y1', y);
    leader.setAttribute('x2', lx < x ? lx + cw : lx); leader.setAttribute('y2', ly + 14);
    leaderDot.setAttribute('cx', x); leaderDot.setAttribute('cy', y);
    document.body.classList.add('has-callout');
  } else document.body.classList.remove('has-callout');

  renderer.render(scene, camera);
}
frame();

// ---------- cartões: "mais detalhes" no celular ----------
document.querySelectorAll('.step-more').forEach((more, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'step-toggle';
  btn.setAttribute('aria-expanded', 'false');
  more.id = `step-more-${i}`;
  btn.setAttribute('aria-controls', more.id);
  btn.textContent = 'Mais detalhes';
  btn.addEventListener('click', () => {
    const open = more.parentElement.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Menos detalhes' : 'Mais detalhes';
  });
  more.before(btn);
});

// ---------- seções interativas ----------
initSim(document.querySelector('#arena-sim'));
initPinout(document.querySelector('#fiacao'));
initCode(document.querySelector('#codigo'));

// barras do gráfico entram quando ficam visíveis
document.querySelectorAll('.chart').forEach((c) => {
  ScrollTrigger.create({ trigger: c, start: 'top 80%', once: true, onEnter: () => c.classList.add('in') });
});
