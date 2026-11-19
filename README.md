# MEDGZ: robô sumô campeão invicto

Site interativo do robô sumô da equipe MEDGZ, campeão invicto (1º lugar entre mais de 20 equipes) do campeonato de robôs sumô da RoboQuest 2026, UNIP.

Conforme a página rola, o robô 3D se desmonta peça por peça e cada parte se explica: estrutura em MDF, sonar HC-SR04, Arduino Uno, ponte H L9110S, motores e sensores de linha. O site também traz:

- a estratégia de prioridades do robô, com o simulador de lutas da equipe rodando no navegador;
- o mapa interativo dos pinos do Arduino;
- o código campeão explicado em linguagem simples;
- o processo de testes e os resultados do simulador em Python ([MachineLearning_APS](https://github.com/Oguipereira/MachineLearning_APS)).

## Tecnologia

- [Vite](https://vite.dev) para build
- [Three.js](https://threejs.org): o robô é modelado de forma procedural a partir da planta das peças (sem arquivos 3D externos)
- [GSAP ScrollTrigger](https://gsap.com) para a animação ligada à rolagem
- [Lenis](https://lenis.darkroom.engineering) para rolagem suave

## Rodar localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # gera a pasta dist/
```

## Publicar na Vercel

Importe este repositório na Vercel. O preset "Vite" é detectado automaticamente (build `npm run build`, saída `dist`).

## Estrutura

```
index.html          conteúdo da página
src/main.js         cena 3D, timeline da desmontagem e rolagem
src/robot.js        modelo procedural do robô (peças 1 a 10 da planta)
src/sim.js          porte do simulador Python (sim/core.py + estrategias.py)
src/pinout.js       diagrama interativo dos pinos
src/code.js         trechos comentados do código Arduino
public/fotos/       fotos do relatório da equipe
public/robo_sumo_campeao.ino   código completo do robô
```

## Equipe

Diogo Hideyoshi P. S. de Souza, Eloá N. B. de Faria, Guilherme P. de Castro, Ian H. P. B. Zem, Mateus B. Ferreira.
