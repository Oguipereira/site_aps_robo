// Mapa interativo de pinos do Arduino Uno do robô.
const COMP = [
  { id: 'botao', nome: 'Botão de partida', pinos: [2], cor: '#e8442e',
    det: 'Pino 2, configurado como INPUT_PULLUP. Solto, o pino lê HIGH; apertado, vai para LOW. O robô só começa depois de detectar o aperto e a soltura.' },
  { id: 'motorE', nome: 'Motor esquerdo', pinos: [5, 6], cor: '#f6c400',
    det: 'Pinos 5 e 6, ambos com PWM (~). Ligados às entradas A e B da ponte H L9110S. Um pino recebe a força (0 a 255), o outro fica em zero; trocar quem recebe a força inverte o sentido.' },
  { id: 'sonar', nome: 'Sonar HC-SR04', pinos: [7, 8], cor: '#9fd3ff',
    det: 'Pino 8 é o TRIGGER (saída: dispara o pulso). Pino 7 é o ECHO (entrada: fica ligado enquanto o som vai e volta). O tempo em microssegundos vira distância.' },
  { id: 'motorD', nome: 'Motor direito', pinos: [9, 10], cor: '#f6c400',
    det: 'Pinos 9 e 10, ambos PWM. A polaridade deste motor ficou invertida na montagem, então o código troca A e B só para ele. Para o resto do programa, "frente" é igual nos dois lados.' },
  { id: 'linhaD', nome: 'Sensor de linha dianteiro direito', pinos: [11], cor: '#ffffff',
    det: 'Pino 11. Sensor infravermelho reflexivo: o preto absorve a luz e o branco reflete. Lido como sinal digital, comparado com a cor gravada na calibração.' },
  { id: 'linhaE', nome: 'Sensor de linha dianteiro esquerdo', pinos: [12], cor: '#ffffff',
    det: 'Pino 12. Junto com o pino 11, protege a frente: qualquer um dos dois vendo a borda por 30 ms aciona a ré máxima.' },
  { id: 'linhaT', nome: 'Sensor de linha traseiro', pinos: [13], cor: '#ffffff',
    det: 'Pino 13. Se a traseira chega à borda (por exemplo, quando está sendo empurrado), o robô acelera para frente por 950 ms em vez de dar ré.' },
];

export function initPinout(root) {
  const svg = root.querySelector('svg');
  const list = root.querySelector('.pin-list');
  const detail = root.querySelector('.pin-detail');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a = {}, parent = svg) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, a[k]);
    parent.appendChild(e);
    return e;
  };
  const px = (p) => 742 - p * 42; // posição x do pino no header digital
  const HY = 300;

  // placa
  el('rect', { x: 120, y: 270, width: 700, height: 300, rx: 14, class: 'uno-board' });
  el('rect', { x: 150, y: 286, width: 620, height: 30, rx: 4, class: 'uno-header' });
  el('rect', { x: 92, y: 420, width: 90, height: 70, rx: 4, class: 'uno-usb' });
  el('rect', { x: 100, y: 510, width: 70, height: 50, rx: 4, class: 'uno-jack' });
  el('rect', { x: 430, y: 420, width: 300, height: 56, rx: 4, class: 'uno-chip' });
  const tt = el('text', { x: 580, y: 454, class: 'uno-chip-label', 'text-anchor': 'middle' });
  tt.textContent = 'ATmega328P';
  const tu = el('text', { x: 250, y: 410, class: 'uno-name' });
  tu.textContent = 'Arduino Uno';

  // pinos 0..13
  const pinEls = {};
  for (let p = 0; p <= 13; p++) {
    const g = el('g', { class: 'pin', 'data-pin': p });
    el('rect', { x: px(p) - 9, y: HY - 9, width: 18, height: 18, rx: 2 }, g);
    const t = el('text', { x: px(p), y: HY + 36, 'text-anchor': 'middle' }, g);
    t.textContent = ([3, 5, 6, 9, 10, 11].includes(p) ? '~' : '') + p;
    pinEls[p] = g;
  }

  // fios e etiquetas
  const slots = [130, 250, 370, 490, 610, 730, 850];
  const wires = {};
  COMP.forEach((c, i) => {
    const lx = slots[i];
    const g = el('g', { class: 'wire', 'data-comp': c.id });
    c.pinos.forEach((p, j) => {
      const sx = px(p), endx = lx - 8 + j * 16;
      el('path', { d: `M${sx},${HY - 9} C${sx},${180} ${endx},${200} ${endx},${118}`, stroke: c.cor }, g);
    });
    el('circle', { cx: lx, cy: 104, r: 14, fill: c.cor }, g);
    const lab = el('text', { x: lx, y: 70, 'text-anchor': 'middle', class: 'wire-label' }, g);
    lab.textContent = c.nome.replace('Sensor de linha ', 'Linha ').replace('dianteiro ', '');
    wires[c.id] = g;
  });

  function select(c) {
    root.dataset.active = c ? c.id : '';
    Object.entries(wires).forEach(([id, g]) => g.classList.toggle('on', c && id === c.id));
    Object.entries(pinEls).forEach(([p, g]) => g.classList.toggle('on', c && c.pinos.includes(+p)));
    list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', c && b.dataset.id === c.id));
    if (c) {
      detail.innerHTML = `<h3>${c.nome}</h3><p class="pin-nums">Pino${c.pinos.length > 1 ? 's' : ''} ${c.pinos.join(' e ')}</p><p>${c.det}</p>`;
    }
  }

  COMP.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = c.id;
    b.innerHTML = `<span class="sw" style="background:${c.cor}"></span><span>${c.nome}</span><span class="pn">${c.pinos.join(', ')}</span>`;
    b.addEventListener('click', () => select(c));
    b.addEventListener('mouseenter', () => select(c));
    b.addEventListener('focus', () => select(c));
    list.appendChild(b);
    wires[c.id].addEventListener('mouseenter', () => select(c));
    wires[c.id].addEventListener('click', () => select(c));
  });
  select(COMP[1]);
}
