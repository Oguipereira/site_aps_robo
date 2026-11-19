// Modelo 3D procedural do Robô Sumô RS100 V2 (projeto MEDGZ).
// Unidades em centímetros. Frente do robô = +Z, para cima = +Y.
// As peças de MDF são extrudadas a partir de contornos 2D com furos,
// como num corte a laser: face clara e borda queimada.
import * as THREE from 'three';

const T = 0.3; // espessura do MDF (3 mm)

// ---------- texturas procedurais ----------
function mdfTexture() {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a274';
  g.fillRect(0, 0, s, s);
  const img = g.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[i] += n; d[i + 1] += n * 0.88; d[i + 2] += n * 0.7;
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 1400; k++) {
    const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI;
    const l = 4 + Math.random() * 14;
    g.strokeStyle = `rgba(${110 + Math.random() * 40},${72 + Math.random() * 30},${36},${0.05 + Math.random() * 0.07})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 14, 1 / 14);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function unoTexture() {
  const w = 530, h = 690;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0b5f99';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,190,240,.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 46; i++) {
    g.beginPath();
    let x = Math.random() * w, y = Math.random() * h;
    g.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      if (Math.random() > 0.5) x += (Math.random() - 0.5) * 220; else y += (Math.random() - 0.5) * 220;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.fillStyle = '#e8f1f8';
  g.save();
  g.translate(150, 470); g.rotate(-Math.PI / 2);
  g.font = 'bold 74px sans-serif';
  g.fillText('UNO', 0, 0);
  g.restore();
  g.font = 'bold 22px monospace';
  g.fillText('DIGITAL (PWM~)', 360, 330);
  g.fillStyle = '#d9c27a';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc([30, 500, 40, 480][i], [40, 30, 660, 650][i], 14, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tireTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#0c0c0c';
  for (let i = 0; i < 32; i++) {
    g.fillRect(i * 16, 4, 7, 24);
    g.fillRect(i * 16 + 8, 36, 7, 24);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- helpers de forma ----------
function rectPath(cx, cy, w, h, P = THREE.Path) {
  const p = new P();
  p.moveTo(cx - w / 2, cy - h / 2);
  p.lineTo(cx + w / 2, cy - h / 2);
  p.lineTo(cx + w / 2, cy + h / 2);
  p.lineTo(cx - w / 2, cy + h / 2);
  p.closePath();
  return p;
}
function circlePath(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}
function slotPath(cx, cy, w, h) {
  // fenda arredondada (pílula)
  const p = new THREE.Path();
  const r = Math.min(w, h) / 2;
  if (w >= h) {
    p.absarc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2, false);
    p.absarc(cx - w / 2 + r, cy, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  } else {
    p.absarc(cx, cy + h / 2 - r, r, 0, Math.PI, false);
    p.absarc(cx, cy - h / 2 + r, r, Math.PI, Math.PI * 2, false);
  }
  p.closePath();
  return p;
}
function polyShape(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

export function buildRobot() {
  const mdfMap = mdfTexture();
  const M = {
    mdf: new THREE.MeshStandardMaterial({ map: mdfMap, roughness: 0.86, metalness: 0 }),
    burn: new THREE.MeshStandardMaterial({ color: 0x3b2310, roughness: 0.95 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf5c200, roughness: 0.45 }),
    tire: new THREE.MeshStandardMaterial({ map: tireTexture(), roughness: 0.92 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd4d6d9, roughness: 0.28, metalness: 1 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x777b80, roughness: 0.4, metalness: 1 }),
    mesh: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.7, metalness: 0.4 }),
    pcbBlue: new THREE.MeshStandardMaterial({ color: 0x0d4f86, roughness: 0.5 }),
    pcbGreen: new THREE.MeshStandardMaterial({ color: 0x1f7a3c, roughness: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.55 }),
    terminal: new THREE.MeshStandardMaterial({ color: 0x1fa65a, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd8231f, roughness: 0.35 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }),
    clear: new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.1, transparent: true, opacity: 0.5 }),
    uno: new THREE.MeshStandardMaterial({ map: unoTexture(), roughness: 0.5 }),
  };

  const plate = (shape) =>
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 20 }),
      [M.mdf, M.burn]
    );
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, seg = 28) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);

  const root = new THREE.Group();
  const parts = {};
  const group = (name) => {
    const g = new THREE.Group();
    g.name = name;
    g.userData.ex = new THREE.Vector3(); // deslocamento da explosão (scroll)
    g.userData.intro = new THREE.Vector3(); // deslocamento da animação de entrada
    g.userData.base = new THREE.Vector3();
    g.userData.dim = { v: 0 };
    parts[name] = g;
    root.add(g);
    return g;
  };

  // ======== PEÇA 1 — CHASSI PRINCIPAL ========
  {
    const g = group('chassis');
    // contorno (x, z) com recortes para as rodas; local y = -z
    const xz = [
      [-6.8, 8.6], [6.8, 8.6], [6.8, 1.0], [5.5, 1.0], [5.5, -5.0], [6.8, -5.0],
      [6.8, -8], [-6.8, -8], [-6.8, -5.0], [-5.5, -5.0], [-5.5, 1.0], [-6.8, 1.0],
    ];
    const s = polyShape(xz.map(([x, z]) => [x, -z]));
    // fendas diagonais dos sensores dianteiros
    const diag = (sx) => {
      const p = new THREE.Path();
      const cx = sx * 4.4, cy = -6.6, a = sx * Math.PI / 4, l = 2.6, w = 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts = [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca]);
      p.moveTo(...pts[0]); pts.slice(1).forEach((q) => p.lineTo(...q)); p.closePath();
      return p;
    };
    s.holes.push(diag(-1), diag(1));
    s.holes.push(circlePath(0, -6.2, 1.25)); // furo da roda boba
    s.holes.push(rectPath(-3.4, 2, 0.5, 3.2), rectPath(3.4, 2, 0.5, 3.2));
    s.holes.push(slotPath(0, 6.6, 4.2, 0.9)); // fenda do sensor traseiro
    [[-1.6, -3.4], [1.6, -3.4], [-1.6, -1.8], [1.6, -1.8], [-1.2, 0.8], [1.2, 0.8], [-4.6, 7.4], [4.6, 7.4]].forEach(([x, y]) => s.holes.push(circlePath(x, y, 0.22)));
    const m = plate(s);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 1.2;
    g.add(m);
    // roda boba (esfera de aço) — vista inferior das fotos
    const caster = new THREE.Group();
    const housing = cyl(1.1, 0.7, M.darkSteel); housing.position.y = 0.85;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), M.steel); ball.position.y = 0.6;
    caster.add(housing, ball);
    caster.position.set(0, 0, 6.2);
    g.add(caster);
    g.userData.anchor = new THREE.Vector3(-6.8, 1.4, -6.5);
  }

  // ======== ALIMENTAÇÃO (power bank externo) ========
  {
    const g = group('battery');
    const pb = cyl(1.15, 6.4, M.black, 32);
    pb.rotation.z = Math.PI / 2;
    pb.position.set(0, 2.7, -6.6);
    const cap = cyl(1.17, 0.5, M.darkSteel, 32); cap.rotation.z = Math.PI / 2; cap.position.set(3.3, 2.7, -6.6);
    g.add(pb, cap);
    g.userData.anchor = new THREE.Vector3(-3.2, 3.4, -6.6);
  }

  // ======== PONTE H L9110S ========
  {
    const g = group('driver');
    const b = box(2.6, 0.14, 2.1, M.pcbBlue); b.position.set(0, 1.62, 2.2);
    g.add(b);
    for (let i = 0; i < 2; i++) {
      const t = box(1.0, 0.75, 0.7, M.terminal); t.position.set(-0.6 + i * 1.2, 2.05, 3.0); g.add(t);
    }
    const chip1 = box(0.45, 0.18, 0.55, M.black); chip1.position.set(-0.6, 1.78, 1.9);
    const chip2 = chip1.clone(); chip2.position.x = 0.6;
    const pins = box(1.8, 0.5, 0.22, M.black); pins.position.set(0, 1.95, 1.25);
    g.add(chip1, chip2, pins);
    g.userData.anchor = new THREE.Vector3(1.3, 2.2, 3);
  }

  // ======== MOTORES (caixa de redução TT) ========
  const motor = (side) => {
    const g = group(side < 0 ? 'motorL' : 'motorR');
    const gb = box(2.2, 1.9, 4.6, M.yellow); gb.position.set(side * 4.4, 3.3, -2.6);
    const can = cyl(0.95, 2.4, M.steel); can.rotation.x = Math.PI / 2; can.position.set(side * 4.4, 3.3, -6.0);
    const endcap = cyl(0.8, 0.35, M.black); endcap.rotation.x = Math.PI / 2; endcap.position.set(side * 4.4, 3.3, -7.3);
    const clip = box(2.25, 0.5, 0.6, M.clear); clip.position.set(side * 4.4, 3.3, -4.9);
    const shaft = cyl(0.28, 1.6, M.white); shaft.rotation.z = Math.PI / 2; shaft.position.set(side * 5.9, 3.3, -2);
    g.add(gb, can, endcap, clip, shaft);
    // fios vermelho/preto
    const wire = (dx, mat) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (4.4 + dx), 3.3, -7.45),
        new THREE.Vector3(side * (4.0 + dx), 2.4, -7.7),
        new THREE.Vector3(side * 2.4, 1.8, -5.5),
      ]);
      return new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.07, 6), mat);
    };
    g.add(wire(0.25, M.red), wire(-0.25, M.black));
    g.userData.anchor = new THREE.Vector3(side * 4.4, 4.3, -3.2);
  };
  motor(-1); motor(1);

  // ======== RODAS ========
  const wheel = (side) => {
    const g = group(side < 0 ? 'wheelL' : 'wheelR');
    const w = new THREE.Group();
    const prof = [];
    const R = 3.3, W = 2.4;
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      prof.push(new THREE.Vector2(R - 0.45 + Math.sin(a) * 0.45, -W / 2 + (i / 12) * W));
    }
    prof.unshift(new THREE.Vector2(2.3, -W / 2));
    prof.push(new THREE.Vector2(2.3, W / 2));
    const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), M.tire);
    M.tire.map.repeat.set(1, 1);
    w.add(tire);
    const rim = cyl(2.32, W * 0.86, M.yellow, 40);
    w.add(rim);
    // face com raios (5 aberturas)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const hole = cyl(0.55, W * 0.9, M.black, 16);
      hole.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
      w.add(hole);
    }
    const hub = cyl(0.65, W * 0.95, M.yellow, 20);
    w.add(hub);
    const capOuter = cyl(0.3, W + 0.05, M.white, 12);
    w.add(capOuter);
    w.rotation.z = Math.PI / 2;
    w.position.set(side * 7.9, 3.3, -2);
    g.add(w);
    g.userData.spin = w;
    g.userData.anchor = new THREE.Vector3(side * 9.1, 5.6, -2);
  };
  wheel(-1); wheel(1);

  // ======== SENSORES DE LINHA (pinos 11, 12, 13) ========
  {
    const g = group('sensors');
    const sensor = (x, z, rotY) => {
      const s = new THREE.Group();
      const b = box(1.35, 0.14, 3.0, M.pcbBlue); b.position.y = 0;
      const tcrt = box(0.95, 0.55, 0.5, M.black); tcrt.position.set(0, -0.34, 1.1);
      const ledA = cyl(0.18, 0.3, M.clear, 12); ledA.position.set(-0.22, -0.66, 1.1);
      const ledB = cyl(0.18, 0.3, M.mesh, 12); ledB.position.set(0.22, -0.66, 1.1);
      const pot = box(0.5, 0.35, 0.5, M.pcbBlue.clone()); pot.material.color.set(0x2a6fd6); pot.position.set(0, 0.24, -0.2);
      const hdr = box(0.95, 0.5, 0.22, M.black); hdr.position.set(0, 0.3, -1.25);
      s.add(b, tcrt, ledA, ledB, pot, hdr);
      s.position.set(x, 0.95, z);
      s.rotation.y = rotY;
      g.add(s);
    };
    sensor(-4.4, 6.6, -Math.PI / 4); // esquerdo (12)
    sensor(4.4, 6.6, Math.PI / 4); // direito (11)
    sensor(0, -6.9, Math.PI); // traseiro (13)
    g.userData.anchor = new THREE.Vector3(4.6, 0.4, 7.6);
  }

  // ======== PEÇAS 7 e 8 — PLACAS LATERAIS ========
  const side = (sx) => {
    const g = group(sx < 0 ? 'sideL' : 'sideR');
    const s = polyShape([[-8, 1.5], [9.5, 0.5], [6, 9.3], [-8, 9.3]]);
    s.holes.push(circlePath(-2, 3.3, 0.75));
    s.holes.push(slotPath(-3.6, 5.7, 3.2, 0.7));
    s.holes.push(rectPath(1.8, 6.4, 0.9, 1.3));
    s.holes.push(circlePath(0.2, 4.6, 0.3), circlePath(-5.6, 7.4, 0.3), circlePath(3.4, 3.4, 0.3));
    [-6.2, -1.2, 3.4].forEach((z) => s.holes.push(rectPath(z, 8.75, 0.7, 0.3)));
    const m = plate(s);
    m.rotation.y = -Math.PI / 2;
    m.position.x = sx < 0 ? -6.5 : 6.8;
    g.add(m);
    g.userData.anchor = new THREE.Vector3(sx * 6.8, 7.2, -5.5);
  };
  side(-1); side(1);

  // ======== PEÇA 4 — SUPORTES LATERAIS (triângulos dentados) ========
  const support = (sx) => {
    const g = group(sx < 0 ? 'supportL' : 'supportR');
    const a = [9.0, 1.5], b = [6.16, 8.4];
    const pts = [[5.4, 1.5]];
    const n = 9;
    const dz = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dz, dy);
    const inZ = (-dy / dl) * 0.32, inY = (dz / dl) * 0.32; // normal para dentro
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const p0 = [a[0] + dz * t0, a[1] + dy * t0], p1 = [a[0] + dz * t1, a[1] + dy * t1];
      if (i % 2) pts.push([p0[0] + inZ, p0[1] + inY], [p1[0] + inZ, p1[1] + inY]);
      else pts.push(p0, p1);
    }
    pts.push([5.4, 8.4]);
    const s = polyShape(pts);
    const m = plate(s);
    m.rotation.y = -Math.PI / 2;
    m.position.x = sx < 0 ? -5.9 : 6.2;
    g.add(m);
    g.userData.anchor = new THREE.Vector3(sx * 6.0, 6.5, 6.6);
  };
  support(-1); support(1);

  // ======== PEÇA 10 — TAMPA INFERIOR (2º andar) ========
  {
    const g = group('deck');
    const s = polyShape([[-5.2, -4], [5.2, -4], [5.2, 4], [-5.2, 4]]);
    [[-4.2, -3], [4.2, -3], [-4.2, 3], [4.2, 3], [0, 3.2]].forEach(([x, y]) => s.holes.push(circlePath(x, y, 0.28)));
    const m = plate(s);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 5.0, -3.0);
    g.add(m);
    g.userData.anchor = new THREE.Vector3(-5.2, 5.2, -1);
  }

  // ======== ARDUINO UNO ========
  {
    const g = group('arduino');
    const a = new THREE.Group();
    const board = box(5.33, 0.16, 6.86, [M.pcbBlue, M.pcbBlue, M.uno, M.pcbBlue, M.pcbBlue, M.pcbBlue]);
    a.add(board);
    const chip = box(0.78, 0.32, 3.5, M.black); chip.position.set(0.9, 0.24, 0.7); a.add(chip);
    const sock = box(0.95, 0.12, 3.7, M.darkSteel); sock.position.set(0.9, 0.12, 0.7); a.add(sock);
    const hdrD = box(0.25, 0.85, 5.2, M.black); hdrD.position.set(2.4, 0.5, 0.6); a.add(hdrD);
    const hdrA = box(0.25, 0.85, 3.6, M.black); hdrA.position.set(-2.4, 0.5, 1.4); a.add(hdrA);
    const usb = box(1.2, 1.1, 1.6, M.steel); usb.position.set(-1.3, 0.62, -3.05); a.add(usb);
    const jack = box(0.9, 1.1, 1.4, M.black); jack.position.set(1.7, 0.62, -3.0); a.add(jack);
    const xtal = box(0.35, 0.3, 1.0, M.steel); xtal.position.set(-0.6, 0.22, -1.2); a.add(xtal);
    const reg = box(0.6, 0.45, 0.6, M.black); reg.position.set(1.7, 0.3, -1.6); a.add(reg);
    [[0.2, -2.2], [0.7, -2.2]].forEach(([x, z]) => { const c = cyl(0.3, 0.6, M.darkSteel, 16); c.position.set(x, 0.38, z); a.add(c); });
    const rst = box(0.4, 0.25, 0.4, M.red); rst.position.set(-1.8, 0.2, -1.4); a.add(rst);
    a.position.set(0, 5.6, -3.0);
    g.add(a);
    // jumpers coloridos saindo do header digital
    const cols = [0xe8442e, 0xf2b31b, 0x2e9c4a, 0x2c7be5, 0x8a49c9, 0xf2f2f2];
    cols.forEach((c, i) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.4, 6.4, -1.6 + i * 0.6),
        new THREE.Vector3(3.6, 7.2 + (i % 3) * 0.25, -1.2 + i * 0.5),
        new THREE.Vector3(3.2, 4.2, 1.5 + i * 0.3),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.07, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })));
    });
    g.userData.anchor = new THREE.Vector3(-2.6, 6.2, -5.6);
  }

  // ======== PEÇA 3 — PLACA FRONTAL (rampa com rosto) ========
  const FRONT_TILT = -Math.atan2(3.5, 8.5); // 22,4° — acompanha a rampa
  const FRONT_LEN = Math.hypot(3.5, 8.8);
  {
    const g = group('front');
    const s = polyShape([[-6.85, 0], [6.85, 0], [6.85, FRONT_LEN], [-6.85, FRONT_LEN]]);
    s.holes.push(circlePath(-1.65, 5.3, 1.32), circlePath(1.65, 5.3, 1.32));
    // sobrancelhas bravas
    const brow = (sx) => {
      const p = new THREE.Path();
      p.moveTo(sx * 3.3, 7.3);
      p.quadraticCurveTo(sx * 2.2, 7.85, sx * 0.55, 6.85);
      p.quadraticCurveTo(sx * 2.2, 7.35, sx * 3.3, 7.3);
      return p;
    };
    s.holes.push(brow(-1), brow(1));
    // boca carrancuda (crescente)
    const mouth = new THREE.Path();
    mouth.moveTo(-2.7, 2.0);
    mouth.quadraticCurveTo(0, 4.25, 2.7, 2.0);
    mouth.quadraticCurveTo(0, 3.45, -2.7, 2.0);
    s.holes.push(mouth);
    [1.4, 2.9, 4.4, 5.9, 7.4].forEach((y) => { s.holes.push(rectPath(-6.25, y, 0.3, 0.65), rectPath(6.25, y, 0.3, 0.65)); });
    const m = plate(s);
    g.add(m);
    g.rotation.x = FRONT_TILT;
    g.position.set(0, 0.5, 9.5);
    g.userData.anchor = new THREE.Vector3(6.9, 4.2, 8.3);
  }

  // ======== HC-SR04 + PEÇA 9 (suporte do sensor) ========
  {
    const g = group('sonar');
    const pcb = box(4.5, 2.05, 0.15, M.pcbBlue); pcb.position.set(0, 5.3, -0.55);
    g.add(pcb);
    for (const x of [-1.65, 1.65]) {
      const c = cyl(0.8, 1.3, M.steel, 32); c.rotation.x = Math.PI / 2; c.position.set(x, 5.3, 0.1); g.add(c);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.66, 32), M.mesh); face.position.set(x, 5.3, 0.76); g.add(face);
    }
    const xtal = box(0.9, 0.35, 0.3, M.steel); xtal.position.set(0, 6.0, -0.4); g.add(xtal);
    const pins = box(1.2, 0.3, 0.6, M.black); pins.position.set(0, 4.1, -0.8); g.add(pins);
    // peça 9: suporte com recorte de três lóbulos
    const s = polyShape([[-3.4, 3.4], [3.4, 3.4], [3.4, 7.2], [-3.4, 7.2]]);
    const lob = new THREE.Path();
    lob.absarc(-1.65, 5.3, 1.0, Math.PI * 0.35, Math.PI * 1.65, false);
    lob.absarc(0, 5.3, 0.75, Math.PI * 1.2, Math.PI * 1.8, false);
    lob.absarc(1.65, 5.3, 1.0, Math.PI * 1.35, Math.PI * 2.65, false);
    lob.absarc(0, 5.3, 0.75, Math.PI * 0.2, Math.PI * 0.8, false);
    lob.closePath();
    s.holes.push(lob);
    const sup = plate(s); sup.position.z = -1.1;
    g.add(sup);
    g.rotation.x = FRONT_TILT;
    g.position.set(0, 0.5, 9.5);
    g.userData.anchor = new THREE.Vector3(-3.6, 5.2, 7.0);
  }

  // ======== PEÇA 2 — PLACA SUPERIOR + BOTÃO (pino 2) ========
  {
    const g = group('top');
    const s = polyShape([[-6.85, -7.15], [6.85, -7.15], [6.85, 7.15], [-6.85, 7.15]]);
    s.holes.push(circlePath(0, 0.4, 1.15));
    [-3.4, 3.4].forEach((x) => { s.holes.push(rectPath(x, 0.4, 0.45, 3.4)); s.holes.push(rectPath(x * 0.62, 0.4, 0.3, 2.6)); });
    [-5.6, 5.6].forEach((x) => s.holes.push(slotPath(x, 0.6, 0.45, 2.6)));
    [[-4.6, 2.6], [4.6, 2.6], [-4.6, -1.6], [4.6, -1.6], [-4.6, 0.5], [4.6, 0.5], [-2.2, 3.6], [2.2, 3.6], [-2.2, -3.6], [2.2, -3.6]].forEach(([x, y]) => s.holes.push(circlePath(x, y, 0.28)));
    [[-6.1, 6.3], [6.1, 6.3], [-6.1, 5.2], [6.1, 5.2], [-6.1, -6.3], [6.1, -6.3]].forEach(([x, y]) => s.holes.push(rectPath(x, y, 0.3, 0.65)));
    s.holes.push(circlePath(0, 4.2, 0.4)); // passagem do botão
    const m = plate(s);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 9.3, -0.85);
    g.add(m);
    const btnBase = box(1.2, 0.5, 1.2, M.black); btnBase.position.set(0, 9.85, -5.05);
    const btn = cyl(0.42, 0.55, M.red, 24); btn.position.set(0, 10.35, -5.05);
    g.add(btnBase, btn);
    g.userData.anchor = new THREE.Vector3(0, 10.7, -5.05);
  }

  // sombras e materiais independentes por grupo (para esmaecer peça a peça)
  Object.values(parts).forEach((g) => {
    const cache = new Map();
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const clone = (mat) => {
        if (!cache.has(mat)) cache.set(mat, mat.clone());
        return cache.get(mat);
      };
      o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
    });
    g.userData.materials = [...cache.values()];
    g.userData.materials.forEach((m) => { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; });
    g.userData.base.copy(g.position);
  });

  return { root, parts, FRONT_TILT };
}

// aplica a opacidade de "foco" de cada grupo
export function applyDim(g) {
  const v = g.userData.dim.v;
  for (const m of g.userData.materials) {
    const o = m.userData.baseOpacity * (1 - 0.86 * v);
    const t = v > 0.001 || m.userData.baseTransparent;
    if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
    m.opacity = o;
    m.depthWrite = v < 0.5;
  }
}
