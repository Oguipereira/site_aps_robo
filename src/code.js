// Trechos reais do código campeão, com explicação em linguagem simples.
const BLOCOS = [
  {
    id: 'setup',
    nome: 'setup()',
    papel: 'Prepara tudo e espera a largada',
    code: `void setup() {
  Serial.begin(9600);
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  pinMode(MOTOR_ESQ_A, OUTPUT);
  // ... demais pinos ...
  parar();

  while (digitalRead(PINO_BOTAO) == HIGH) delay(20);
  delay(30);
  while (digitalRead(PINO_BOTAO) == LOW) delay(20);

  for (int i = 5; i > 0; i--) {
    Serial.print("COMECA EM: "); Serial.println(i);
    delay(1000);
  }
  calibrarSensores();
  modo = ABERTURA_FRENTE;
  inicioModo = millis();
}`,
    texto: [
      'O setup roda uma única vez, assim que o robô é ligado. Ele diz ao Arduino quais pinos são entradas (sensores, botão) e quais são saídas (motores).',
      'Depois o robô fica parado esperando o botão. Ele espera o dedo apertar e soltar, o que evita uma largada acidental. Em seguida conta 5 segundos, como manda o regulamento.',
      'O último passo é a calibração: ainda parado sobre o piso preto, o robô aprende qual é a leitura "normal" de cada sensor. Assim ele funciona mesmo se a luz do ginásio for diferente da do laboratório.',
    ],
  },
  {
    id: 'loop',
    nome: 'loop()',
    papel: 'A hierarquia de decisões',
    code: `void loop() {
  atualizarLeiturasLinha();

  if (modo == RE_BORDA) {        // 1. termina a ré
    atualizarReBorda();
    return;
  }
  if (detectarBorda()) {         // 2. borda: cancela tudo
    iniciarReBorda();
    return;
  }
  if (modo == ABERTURA_FRENTE ||
      modo == ABERTURA_DIREITA) {
    executarAbertura();          // 3. jogada de abertura
    return;
  }
  atualizarUltrassonico();       // 4. viu o adversário?
  if (atacando) return;

  executarVarredura();           // 5. senão, procura
}`,
    texto: [
      'O loop é o coração do robô: o Arduino repete essa função sem parar, centenas de vezes por segundo.',
      'A ordem das perguntas é a estratégia. A borda vem antes de tudo: não adianta empurrar o adversário se o nosso robô cair junto. Só depois ele pensa em atacar e, por último, em procurar.',
      'Cada "return" encerra a volta assim que uma decisão é tomada. O robô faz uma coisa de cada vez, sem conflito entre comandos.',
    ],
  },
  {
    id: 'borda',
    nome: 'detectarBorda()',
    papel: 'Filtro contra alarmes falsos',
    code: `bool detectarBorda() {
  unsigned long agora = millis();
  bool bordaDir = (ultimaLeituraDir != COR_DIR) &&
                  (agora - mudancaDir >= CONFIRMACAO_BORDA);
  bool bordaEsq = (ultimaLeituraEsq != COR_ESQ) &&
                  (agora - mudancaEsq >= CONFIRMACAO_BORDA);
  return bordaDir || bordaEsq;
}`,
    texto: [
      'Os sensores de linha comparam o que veem agora com a cor aprendida na calibração. Se a leitura mudou, pode ser a faixa branca.',
      'Mas pode ser só um reflexo, poeira ou o tranco de uma batida. Por isso a mudança precisa durar pelo menos 30 milissegundos (CONFIRMACAO_BORDA) para ser aceita.',
      'Confirmada a borda, o robô dá ré na velocidade máxima por 950 ms e espera os dois sensores voltarem ao preto antes de seguir.',
    ],
  },
  {
    id: 'sonar',
    nome: 'lerDistancia()',
    papel: 'Transforma eco em centímetros',
    code: `float lerDistancia() {
  digitalWrite(TRIGGER, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER, LOW);
  unsigned long duracao = pulseIn(ECHO, HIGH, TIMEOUT_ECHO);
  if (duracao == 0) return -1;
  return duracao * 0.0343 / 2.0;
}`,
    texto: [
      'Um pulso de 10 microssegundos no pino TRIGGER faz o sensor emitir um "grito" ultrassônico, acima de 20.000 Hz, que ninguém escuta.',
      'O pino ECHO fica ligado enquanto o som vai e volta. O som anda 0,0343 cm por microssegundo e faz o caminho duas vezes, por isso a conta é d = c · t / 2.',
      'Se o eco demora mais de 12 ms, não há nada perto: a função devolve -1 e o robô não perde tempo esperando.',
    ],
  },
  {
    id: 'ataque',
    nome: 'executarAtaque()',
    papel: 'Três zonas de distância',
    code: `void executarAtaque(float cm) {
  if (cm > 25 && cm <= 40) {
    moverFrente(ATAQUE_LEVE_ESQ, ATAQUE_LEVE_DIR);
  } else if (cm > 10 && cm <= 25) {
    moverFrente(ATAQUE_MEDIO_ESQ, ATAQUE_MEDIO_DIR);
  } else if (cm > 0 && cm <= 10) {
    moverFrente(ATAQUE_MAX_ESQ, ATAQUE_MAX_DIR);
  }
}`,
    texto: [
      'O ataque é dividido em três zonas: até 40 cm, até 25 cm e até 10 cm. Cada zona tem a sua própria velocidade para cada motor.',
      'Na versão campeã, depois de muitos testes, as três zonas foram configuradas com 255, a força máxima. A estrutura em zonas ficou no código para permitir ajustes rápidos no dia da competição sem mexer na lógica.',
      'Se o sonar deixa de ver o adversário, o robô para, volta à varredura e recomeça a procura.',
    ],
  },
  {
    id: 'varredura',
    nome: 'executarVarredura()',
    papel: 'Procura sem ficar cego',
    code: `switch (etapa) {
  case 0: moverFrente(VEL_FRENTE_ESQ, VEL_FRENTE_DIR);
          duracao = TEMPO_FRENTE; break;     // 500 ms
  case 1: direita();  duracao = TEMPO_GIRO_45;    break;
  case 2: esquerda(); duracao = TEMPO_GIRO_VOLTA; break;
  case 3: moverFrente(VEL_FRENTE_ESQ, VEL_FRENTE_DIR);
          duracao = TEMPO_FRENTE; break;
  case 4: esquerda(); duracao = TEMPO_GIRO_45;    break;
  case 5: direita();  duracao = TEMPO_GIRO_VOLTA; break;
}
if (agora - inicioEtapa >= duracao) { etapa++; }`,
    texto: [
      'Sem adversário à vista, o robô segue um padrão de seis passos: avança, olha para a direita, para a esquerda, avança de novo e repete o movimento espelhado.',
      'O giro de volta (750 ms) é um pouco maior que o de ida (500 ms). Assim o sonar varre um ângulo um pouco maior a cada ciclo.',
      'O detalhe mais importante: não existe delay aqui. O tempo é medido com millis(), então a cada volta do loop o robô continua lendo a borda e o sonar enquanto gira.',
    ],
  },
  {
    id: 'motores',
    nome: 'controlarMotores()',
    papel: 'Um número vira movimento',
    code: `void controlarMotores(int velEsq, int velDir) {
  velEsq = constrain(velEsq, -255, 255);
  velDir = constrain(velDir, -255, 255);

  if (velEsq >= 0) {
    analogWrite(MOTOR_ESQ_A, velEsq);
    analogWrite(MOTOR_ESQ_B, 0);
  } else {
    analogWrite(MOTOR_ESQ_A, 0);
    analogWrite(MOTOR_ESQ_B, -velEsq);
  }
  // DIREITO INVERTIDO EM RELACAO AO ESQUERDO
  if (velDir >= 0) {
    analogWrite(MOTOR_DIR_A, 0);
    analogWrite(MOTOR_DIR_B, velDir);
  } else {
    analogWrite(MOTOR_DIR_A, -velDir);
    analogWrite(MOTOR_DIR_B, 0);
  }
}`,
    texto: [
      'Todo movimento passa por esta função. Ela recebe a velocidade de cada roda, de -255 (ré total) a 255 (frente total), e manda os sinais para a ponte H L9110S.',
      'Cada motor tem dois fios de controle. Ligando um e desligando o outro, a corrente passa num sentido; invertendo, passa no outro.',
      'Durante a montagem, a polaridade do motor direito ficou invertida. Em vez de refazer a fiação, a equipe inverteu os pinos no código. Para girar no lugar, basta mandar valores opostos: uma roda para frente, a outra para trás.',
    ],
  },
];

const KW = /\b(void|int|bool|float|const|unsigned|long|if|else|return|while|for|switch|case|break|true|false|enum)\b/;
function highlight(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const re = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)(?=\s*\()|(\b[A-Z][A-Z0-9_]{2,}\b)|(\b[A-Za-z_]\w*\b)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const t = esc(m[0]);
    if (m[1]) out += `<span class="tk-c">${t}</span>`;
    else if (m[2]) out += `<span class="tk-s">${t}</span>`;
    else if (m[3]) out += `<span class="tk-n">${t}</span>`;
    else if (m[4]) out += KW.test(m[4]) ? `<span class="tk-k">${t}</span>` : `<span class="tk-f">${t}</span>`;
    else if (m[5]) out += `<span class="tk-const">${t}</span>`;
    else out += KW.test(m[6]) ? `<span class="tk-k">${t}</span>` : t;
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}

export function initCode(root) {
  const tabs = root.querySelector('.code-tabs');
  const pre = root.querySelector('.code-view code');
  const title = root.querySelector('.code-explain h3');
  const body = root.querySelector('.code-explain .code-text');
  BLOCOS.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.id = `tab-${b.id}`;
    btn.setAttribute('aria-controls', 'code-panel');
    btn.innerHTML = `<span class="fn">${b.nome}</span><span class="role">${b.papel}</span>`;
    btn.addEventListener('click', () => select(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % BLOCOS.length, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + BLOCOS.length) % BLOCOS.length, true); }
    });
    tabs.appendChild(btn);
  });
  function select(i, focus) {
    const b = BLOCOS[i];
    [...tabs.children].forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
    if (focus) tabs.children[i].focus();
    pre.innerHTML = highlight(b.code);
    title.textContent = b.papel;
    body.innerHTML = b.texto.map((p) => `<p>${p}</p>`).join('');
    root.querySelector('.code-view').scrollTop = 0;
    root.querySelector('#code-panel').setAttribute('aria-labelledby', `tab-${b.id}`);
  }
  select(0);
}
