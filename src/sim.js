// Porte para JavaScript do simulador Python do repositório MachineLearning_APS
// (sim/core.py + sim/estrategias.py). Mesmas constantes, mesma física
// cinemática simplificada, mesmas estratégias.

const RAD = Math.PI / 180;
export const C = {
  ARENA_RAIO: 50, BORDA: 5, LINHA: 45, TEMPO_ROUND: 60, DT: 0.02,
  COMP: 19.5, LARG: 17, ENTRE_EIXOS: 12, MASSA: 560, VEL_MAX: 60, MU: 0.6, G: 981,
  HC_ALC: 100, HC_CONE: 15 * RAD, HC_PER: 0.06,
};

let seed = 1;
export function setSeed(s) { seed = s >>> 0 || 1; }
function rand() { // mulberry32
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const uni = (a, b) => a + (b - a) * rand();
const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Robo {
  constructor(x, y, th, massa) {
    Object.assign(this, { x, y, th, massa, ce: 0, cd: 0 });
    this.raio = (Math.hypot(C.COMP, C.LARG) / 2) * 0.8;
  }
  cantos() {
    const c = Math.cos(this.th), s = Math.sin(this.th), hl = C.COMP / 2, hw = C.LARG / 2;
    return [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]].map(([lx, ly]) => [this.x + lx * c - ly * s, this.y + lx * s + ly * c]);
  }
  tracao() { return C.MU * (this.massa / 1000) * (C.G / 100); }
  aplicar(e, d) { this.ce = clamp(e, -1, 1); this.cd = clamp(d, -1, 1); }
  passo(dt) {
    const ve = this.ce * C.VEL_MAX, vd = this.cd * C.VEL_MAX;
    const v = (ve + vd) / 2, w = (vd - ve) / C.ENTRE_EIXOS;
    this.th = norm(this.th + w * dt);
    this.x += v * Math.cos(this.th) * dt;
    this.y += v * Math.sin(this.th) * dt;
  }
  caiu() { return Math.hypot(this.x, this.y) > C.ARENA_RAIO; }
}

class Sensores {
  constructor() { this.linha = [false, false, false, false]; this.dist = C.HC_ALC; this.tHc = -1; }
  atualizar(eu, ini, t) {
    this.linha = eu.cantos().map(([x, y]) => Math.hypot(x, y) > C.LINHA);
    if (t - this.tHc >= C.HC_PER) {
      this.tHc = t;
      const dx = ini.x - eu.x, dy = ini.y - eu.y, d = Math.hypot(dx, dy);
      let r = C.HC_ALC;
      if (d <= C.HC_ALC) {
        const ang = norm(Math.atan2(dy, dx) - eu.th);
        const meia = Math.atan2(ini.raio, Math.max(d, 1));
        if (Math.abs(ang) <= C.HC_CONE + meia) r = Math.max(0, d - ini.raio);
      }
      this.dist = r;
    }
  }
  get frente() { return this.linha[0] || this.linha[1]; }
  get qualquer() { return this.linha.some(Boolean); }
}

// ---------- estratégias ----------
export class Competidor {
  constructor() {
    this.nome = 'MEDGZ';
    Object.assign(this, { tAbertura: 0.45, velBusca: 0.55, distAtaque: 45, freio: 0.75, tFuga: 0.3, tGiro: 0.28, JANELA: 1.5 });
  }
  reiniciar() { Object.assign(this, { estado: 'ABERTURA', te: 0, tAnt: 0, lado: 1, bordaFrente: true, tDesdeFuga: this.JANELA }); }
  ir(e) { this.estado = e; this.te = 0; }
  decidir(s, t) {
    const dt = t - this.tAnt; this.tAnt = t; this.te += dt; this.tDesdeFuga += dt;
    if (s.qualquer && this.estado !== 'FUGA') { this.bordaFrente = s.frente; this.ir('FUGA'); }
    if (this.estado === 'FUGA') {
      if (this.te < this.tFuga) return this.bordaFrente ? [-1, -1] : [1, 1];
      if (this.te < this.tFuga + this.tGiro) return [1, -1];
      this.tDesdeFuga = 0; this.ir('BUSCA'); return [0, 0];
    }
    if (this.estado === 'ABERTURA') { if (this.te >= this.tAbertura) this.ir('BUSCA'); return [1, -1]; }
    if (this.estado === 'ATAQUE') return this.ataque(s);
    return this.busca(s);
  }
  busca(s) {
    if (s.dist < C.HC_ALC * 0.9) { this.ir('ATAQUE'); return this.ataque(s); }
    if (this.te > 1.2) { this.lado *= -1; this.te = 0; }
    const v = this.velBusca;
    return [v * this.lado, -v * this.lado];
  }
  ataque(s) {
    if (s.dist > C.HC_ALC * 0.9) { this.ir('BUSCA'); return this.busca(s); }
    let vel = s.dist < this.distAtaque ? 1 : 0.75;
    const cautela = Math.max(0, 1 - this.tDesdeFuga / this.JANELA);
    if (cautela > this.freio) vel *= 0.55;
    return [vel, vel];
  }
}

class Kamikaze {
  nome = 'Kamikaze';
  reiniciar() { this.tAnt = 0; this.f = 0; }
  decidir(s, t) {
    const dt = t - this.tAnt; this.tAnt = t;
    if (this.f > 0) { this.f -= dt; return [-1, -0.6]; }
    if (s.frente) { this.f = 0.35; return [-1, -1]; }
    return [1, 1];
  }
}
class Tanque {
  nome = 'Tanque';
  reiniciar() { this.tAnt = 0; this.f = 0; }
  decidir(s, t) {
    const dt = t - this.tAnt; this.tAnt = t;
    if (this.f > 0) { this.f -= dt; return [-0.9, -0.5]; }
    if (s.qualquer) { this.f = 0.4; return [-0.9, -0.9]; }
    if (s.dist < 35) return [0.9, 0.9];
    return [0.3, -0.3];
  }
}
class Fujao {
  nome = 'Fujão';
  reiniciar() { this.tAnt = 0; this.f = 0; }
  decidir(s, t) {
    const dt = t - this.tAnt; this.tAnt = t;
    if (this.f > 0) { this.f -= dt; return [0.8, -0.8]; }
    if (s.qualquer) { this.f = 0.5; return [-0.8, -0.8]; }
    if (s.dist < 40) return [-0.7, 0.7];
    return [0.45, 0.45];
  }
}
class Aleatorio {
  nome = 'Aleatório';
  reiniciar() { this.prox = 0; this.cmd = [0.5, 0.5]; }
  decidir(s, t) {
    if (s.qualquer) return [-1, -0.4];
    if (t > this.prox) { this.prox = t + uni(0.3, 1); this.cmd = [uni(-1, 1), uni(-1, 1)]; }
    return this.cmd;
  }
}
export const OPONENTES = { kamikaze: Kamikaze, tanque: Tanque, fujao: Fujao, aleatorio: Aleatorio };

// ---------- um round ----------
export class Round {
  constructor(Op, sementePos = 0) {
    const off = 15 + sementePos;
    this.a = new Robo(-off, 0, Math.PI / 2, C.MASSA);
    this.b = new Robo(off, 0, -Math.PI / 2, C.MASSA);
    this.sa = new Sensores(); this.sb = new Sensores();
    this.ea = new Competidor(); this.eb = new Op();
    this.ea.reiniciar(); this.eb.reiniciar();
    this.t = 0; this.fim = null;
  }
  passo() {
    if (this.fim) return;
    const { a, b, sa, sb } = this;
    sa.atualizar(a, b, this.t); sb.atualizar(b, a, this.t);
    a.aplicar(...this.ea.decidir(sa, this.t));
    b.aplicar(...this.eb.decidir(sb, this.t));
    a.passo(C.DT); b.passo(C.DT);
    colisao(a, b);
    const fa = a.caiu(), fb = b.caiu();
    if (fa && fb) this.fim = 'EMPATE';
    else if (fa) this.fim = 'DERROTA';
    else if (fb) this.fim = 'VITORIA';
    this.t += C.DT;
    if (!this.fim && this.t >= C.TEMPO_ROUND) this.fim = 'EMPATE';
  }
}

function colisao(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.raio + b.raio;
  if (d >= min || d < 1e-6) return;
  const nx = dx / d, ny = dy / d, sob = min - d;
  a.x -= nx * sob * 0.5; a.y -= ny * sob * 0.5; b.x += nx * sob * 0.5; b.y += ny * sob * 0.5;
  const pa = a.tracao() * ((a.ce + a.cd) / 2) * (Math.cos(a.th) * nx + Math.sin(a.th) * ny);
  const pb = b.tracao() * ((b.ce + b.cd) / 2) * (Math.cos(b.th) * -nx + Math.sin(b.th) * -ny);
  const desl = (pa - pb) * 0.9 * C.DT;
  a.x += nx * desl * 0.35; a.y += ny * desl * 0.35; b.x += nx * desl; b.y += ny * desl;
}

// ---------- interface da arena ----------
export function initSim(root) {
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const out = {
    estado: root.querySelector('[data-sim="estado"]'),
    tempo: root.querySelector('[data-sim="tempo"]'),
    dist: root.querySelector('[data-sim="dist"]'),
    resultado: root.querySelector('[data-sim="resultado"]'),
    lote: root.querySelector('[data-sim="lote"]'),
  };
  const btnLote = root.querySelector('[data-sim-lote]');
  let opKey = 'kamikaze';
  let round, raf = null, acc = 0, last = 0, visible = false, rodada = 0, pausaFim = 0;

  function novo() {
    rodada++;
    setSeed(1000 + rodada * 7);
    round = new Round(OPONENTES[opKey], uni(-2, 2));
    out.resultado.textContent = 'Lutando…';
    out.resultado.dataset.r = '';
    pausaFim = 0;
  }

  root.querySelectorAll('[data-op]').forEach((b) => {
    b.addEventListener('click', () => {
      root.querySelectorAll('[data-op]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      opKey = b.dataset.op;
      out.lote.textContent = '';
      novo();
    });
  });
  root.querySelector('[data-sim-novo]').addEventListener('click', novo);

  btnLote.addEventListener('click', () => {
    btnLote.disabled = true;
    const N = 200; let i = 0; const r = { VITORIA: 0, DERROTA: 0, EMPATE: 0 };
    const nomeOp = new OPONENTES[opKey]().nome;
    const chunk = () => {
      const end = Math.min(N, i + 10);
      for (; i < end; i++) {
        setSeed(i + 1);
        const rd = new Round(OPONENTES[opKey], uni(-2, 2));
        while (!rd.fim) rd.passo();
        r[rd.fim]++;
      }
      out.lote.textContent = `Simulando ${i} de ${N} lutas contra ${nomeOp}…`;
      if (i < N) setTimeout(chunk, 0);
      else {
        const p = (k) => Math.round((r[k] / N) * 1000) / 10;
        out.lote.textContent = `${N} lutas contra ${nomeOp}: ${p('VITORIA')}% vitórias, ${p('EMPATE')}% empates, ${p('DERROTA')}% derrotas.`;
        btnLote.disabled = false;
      }
    };
    chunk();
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  }
  addEventListener('resize', resize);
  resize();

  const NOMES = { ABERTURA: 'Abertura', BUSCA: 'Procurando', ATAQUE: 'Atacando', FUGA: 'Fugindo da borda' };

  function drawRobot(r, fill, edge, face) {
    const s = scale();
    ctx.save();
    ctx.translate(cx() + r.x * s, cy() - r.y * s);
    ctx.rotate(-r.th);
    const L = C.COMP * s, W = C.LARG * s;
    ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-L / 2, -W / 2, L, W); ctx.fill(); ctx.stroke();
    // frente
    ctx.fillStyle = face;
    ctx.fillRect(L / 2 - L * 0.16, -W / 2, L * 0.16, W);
    ctx.restore();
  }
  const scale = () => (Math.min(canvas.width, canvas.height) / 2) * 0.82 / C.ARENA_RAIO;
  const cx = () => canvas.width / 2, cy = () => canvas.height / 2;

  function draw() {
    const s = scale();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx(), cy(), C.ARENA_RAIO * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(cx(), cy(), C.LINHA * s, 0, 7); ctx.fill();
    // cone do sonar
    const a = round.a;
    const d = round.sa.dist;
    ctx.save();
    ctx.translate(cx() + a.x * s, cy() - a.y * s);
    ctx.rotate(-a.th);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d * s + C.COMP * s / 2);
    const seen = d < C.HC_ALC * 0.9;
    grad.addColorStop(0, seen ? 'rgba(246,196,0,.55)' : 'rgba(246,196,0,.28)');
    grad.addColorStop(1, 'rgba(246,196,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(C.COMP * s / 2, 0);
    ctx.arc(C.COMP * s / 2, 0, d * s, -C.HC_CONE, C.HC_CONE); ctx.closePath(); ctx.fill();
    ctx.restore();
    drawRobot(round.b, '#5b5f66', '#2b2e33', '#a9adb3');
    drawRobot(a, '#c9a274', '#3b2310', '#f6c400');
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!round.fim) {
      acc += dt;
      while (acc >= C.DT && !round.fim) { round.passo(); acc -= C.DT; }
      if (round.fim) {
        const msg = { VITORIA: 'Vitória: o adversário saiu da arena.', DERROTA: 'Derrota: nosso robô saiu da arena.', EMPATE: 'Empate.' };
        out.resultado.textContent = msg[round.fim];
        out.resultado.dataset.r = round.fim;
      }
    } else {
      pausaFim += dt;
      if (pausaFim > 2.6) novo();
    }
    out.estado.textContent = NOMES[round.ea.estado] || round.ea.estado;
    out.tempo.textContent = round.t.toFixed(1).replace('.', ',') + ' s';
    out.dist.textContent = round.sa.dist >= C.HC_ALC * 0.9 ? 'nada à vista' : Math.round(round.sa.dist) + ' cm';
    draw();
  }

  novo();
  draw();
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = null; }
  }).observe(canvas);
}
