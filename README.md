# Gravura · copos térmicos gravados a laser em 3D

Landing page 3D de uma marca fictícia de **copos térmicos pretos com gravação a fibra laser**. O copo gira, inclina em direção ao
cursor e recebe a arte que você escolher: uma das quatro prontas ou a sua própria (SVG/PNG). O diferencial
é a gravação: o copo é **preto fosco** (pintura eletrostática) e a gravação **remove a tinta e mostra o inox escovado** por baixo. Nada de
estampa colorida: a arte vira uma máscara e a máscara vira material (metal onde a tinta saiu, pintura onde ficou).

**No ar:** https://copos-laser.vercel.app

É também um estudo de front-end (irmão do [latinhas-3d](https://github.com/ErickkADR/latinhas-3d)): motion design, 3D no navegador e
performance tratada como requisito, com cada otimização justificada por um número medido antes e depois.

> Gravura é uma marca inventada; nome e logo de marcas reais de copo não aparecem na página. O copo é um **modelo real de copo térmico de 40 oz**
> (corpo largo em cima, parte de baixo estreita, alça retangular, tampa e canudo reto), fornecido pelo Erick em SketchUp e convertido por
> `scripts/convert-dae.mjs`. Os elementos decorativos são **gerados por código** (`scripts/generate-models.mjs`).
> Atenção: Mulher-Maravilha, Homem de Ferro e Coringa são personagens com direitos autorais, incluídos a pedido do autor.

## O que a página faz

- **Copo 3D real com `<model-viewer>`** (three.js por baixo) que inclina em direção ao ponteiro. Sem mouse (celular), ele passeia sozinho e o dedo assume.
  Fundo **sempre o mesmo preto**, sem elementos flutuantes, faíscas nem troca de cor de fundo.
- **Troca de arte coreografada com GSAP**: o copo gira 720° com **motion blur**, o nome da arte sai e volta e a gravação troca **no pico do giro**.
- **Só a arte muda**: seletor de quatro artes prontas (Boiadeira, Poker, Mandala, Constelação) e "Sua arte", que **envia a própria** (SVG, PNG, JPG, WebP; vira máscara por
  **limiar de luminância/alfa**, com controle de limiar e opção de **inverter**). Sem nome, sem cor: o copo é preto.
- **Baixar a arte para a fibra laser**: PNG preto e branco (preto = gravado) de **283 × 160 mm a 400 dpi (4457 × 2520 px)** com o DPI gravado no arquivo
  (chunk `pHYs`), para o LightBurn/EzCad/CorelDRAW importarem já no tamanho certo. Gerado no navegador; nada é enviado a servidor.
- **Copo real, gravação no lugar certo**: a arte de 283 × 126 mm cai na parte estreita do copo (onde a volta tem ~283 a 314 mm, a medida para a qual a arte foi feita).
- **Responsivo de verdade**: no celular o menu é próprio (painel em tela cheia, foco preso, Esc fecha), o estúdio vira uma folha inferior e a textura de gravação usa 1024 px em vez de 2048.

> **360° (25/11/2026):** a arte dá a volta inteira do copo (408 × 154 mm); o arquivo do laser sai com 408 × 188 mm a 400 dpi.
>
> **v3 (25/11/2026):** a página é só o herói animado (sem seções abaixo, sem menu, sem rodapé). **Giro livre de 360°**: arrastar em qualquer ponto livre gira o copo (com inércia).
> O canvas do copo ocupa o herói inteiro, então nada é cortado em nenhum ângulo. Texto à esquerda e temas à direita, centralizados na vertical. **Copo invertido:** a arte vai na parte larga
> de cima (comprimida na horizontal para manter a proporção real) e o texto gravado na parte estreita de baixo (começa com o nome da arte; o estúdio edita). O fundo agora é
> **CSS puro** (degradê + ladrilho de ruído de 24 KB como dithering), sem imagem para pixelar. Lighthouse local (mediana de 3): **100 · 100 · 100 · 100** no celular (TBT 69 ms, 0,56 MB) e no desktop (TBT 4 ms).
>
> **v2 (24/11/2026):** copo real no lugar do gerado por código; sem os elementos 3D decorativos, faíscas, nome e cor da pintura; fundo preto fixo.
> Números da v2 (mediana de 3, Lighthouse 13.6, local): celular **92 · 100 · 100 · 100** (TBT 356 ms, 0,60 MB), desktop **100 · 100 · 100 · 100** (TBT 45 ms, 0,56 MB). Com o mouse
> mexendo: **0 recálculos de estilo/s** no desktop (7 no celular) e **4,1%** da thread principal no desktop (4,8% no celular), contra 36% na v0. Só `cup.glb` (51 KB) vai
> para a rede. As seções sobre elementos, faíscas, nome e cor abaixo descrevem a v0/v1 e continuam no histórico do git.

## Como a gravação vira material

```
arte (máscara WebP binária | desenho por código | upload) + nome  ──►  canvas de máscara (alfa)  ──►  3 mapas
   máscara = 1  inox escovado   baseColor prata ±ruído   metalness 1   roughness ~0,34 ± ruído de escovado
   máscara = 0  pintura fosca   baseColor da cor         metalness 0   roughness 0,74
   normal leve: a tinta tem espessura, a borda da gravação pega luz
```

- Medidas **físicas em mm**: o mapa do corpo é a planificação do copo inteiro (298 mm de volta de referência × 284 mm de altura); a arte pronta mantém
  os mm do arquivo. O nome vai na parte larga (volta de 408 mm) e é desenhado comprimido para não esticar. O UV do corpo é cilíndrico, gerado na conversão. O que se vê no copo é o que sai no arquivo do laser.
- **Duas "pranchas" de textura (A/B)**: a arte nova é composta na reserva antes do giro e os 3 slots do material trocam no pico dele.
- Texturas vêm de `createCanvasTexture()` do model-viewer: sem encodar PNG a cada tecla digitada. O `CanvasTexture` tem `flipY = true`, então os mapas são escritos de cabeça para baixo.
- **Ambiente de estúdio** (`public/img/studio-env.jpg`, 10 KB, caixas de luz desenhadas em SVG): sem ele o inox fica chapado no ambiente cinza padrão.

## Como rodar

```bash
npm install
npm run dev               # http://localhost:5173
npm run build && npm run preview   # produção em http://localhost:4173
```

Regenerar assets e medir:

```bash
npm run models:raw && npm run models:optimize   # gerador -> .glb crus (não versionados) -> pipeline -> public/models + reports/models.md
npm run art:build         # SVG -> máscaras (tela 2048 px + laser 400 dpi) + reports/art.md. PDF: python3 scripts/pdf-to-svg.py (PyMuPDF)
npm run env:build         # ambiente de estúdio
npm run images:capture && npm run images:optimize   # com o dev rodando
npm run measure:lighthouse -- depois 3   # Lighthouse celular + desktop, mediana de 3
npm run measure:runtime -- depois        # recálculos de estilo/FPS com o mouse mexendo
npm run measure:profile -- 390 844 depois   # perfil de CPU: % da thread principal ocupada
```

## Arquitetura

```
src/
  main.js              entrada leve: CSS, menu, seletor, cards. Pinta sem esperar o 3D e importa scene.js depois do load
  scene.js             tudo que é 3D: ordem de carregamento, medidas, upgrade do ambiente
  config/
    engrave.js         medidas físicas (mm), tamanhos de textura, cores de pintura, aço
    arts.js            artes prontas (cores com contraste conferido, elemento 3D) + arte personalizada
    settings.js        todos os "quantos": elementos por tela, inclinação, repulsão, giro, escalonamento
  modules/
    engrave.js         máscara -> baseColor + metallicRoughness + normal; upload por limiar; arquivo do laser
    procedural.js      Mandala e Constelação desenhadas por código (zero byte de imagem)
    cup.js             copo: inclinação, giro, motion blur, pranchas A/B de textura
    elements.js        elementos: layout por arte, parallax, repulsão, implosão/explosão, troca de modelo
    theme-switch.js    a coreografia GSAP (fila: só o último pedido vale se clicarem no meio de uma troca)
    studio.js          estúdio: arte, limiar, inverter, nome, cor, download
    png-dpi.js         grava o DPI no PNG
    loop.js pointer.js sparks.js menu.js ui.js mv-patch.js
  styles/              tokens, base, header, hero, studio, sections
scripts/               gerador e pipeline dos modelos, artes, imagens, medições
```

### Decisões que valem registrar

- **Máscara binária para as artes prontas.** A mesma arte em formatos diferentes (mapa de 2048 px):

  | Formato | Boiadeira | Poker |
  |---|---:|---:|
  | SVG original | 480 KB | 1.891 KB |
  | SVG com svgo (multipass) | 169 KB | 1.177 KB |
  | PNG 8 bits, suavizada | 481 KB | 626 KB |
  | WebP lossless, suavizada | 336 KB | 432 KB |
  | WebP com perda (q80), suavizada | 321 KB | 411 KB |
  | PNG 1 bit (paleta com alfa), binária | 65,8 KB | 88,4 KB |
  | **WebP lossless, binária (escolhido)** | **56,6 KB** | **76,9 KB** |

  O svgo ajuda pouco (3.300 paths) e ainda obrigaria o navegador a rasterizar o vetor a cada recomposição. A máscara binária pesa ~5x
  menos que a suavizada e a fibra trabalha em 1 bit mesmo; a suavização das bordas na tela vem do mipmap da GPU. A versão de **400 dpi**
  (149 e 210 KB) só é baixada quando o visitante pede o arquivo do laser.
- **Carregamento escalonado:** primeira pintura (HTML + CSS + 5 KB de JS) → `load` → chunk do 3D → copo → elementos um a um a cada 160 ms →
  no ocioso, os modelos e as máscaras das outras artes → 2,5 s depois, o ambiente de estúdio.
- **O loop nunca lê o DOM.** Posição dos elementos na tela vem do próprio estado; o tamanho do herói vem de um `ResizeObserver`.
- **Fonte self-hosted** (Archivo, subconjunto latino só com o eixo de peso, 35 KB, com `preload`) e fonte de fallback com métricas ajustadas.
- **Meshopt sem CDN:** `public/decoders/meshopt-ready.js` é vazio de propósito (ativa o decodificador que já vem no bundle do model-viewer).
- **`prefers-reduced-motion`:** sem giro, sem blur, sem faíscas; a troca de arte vira troca direta.

## O modelo real do copo (v2)

Depois do estudo o copo gerado por código foi trocado por um **modelo real** em SketchUp (`.dae`/`.skp`), convertido por `scripts/convert-dae.mjs`:
o SketchUp exporta cada face **duas vezes** (cor da frente e do verso no mesmo grupo), então o conversor mantém só a frente; centraliza o eixo do corpo,
põe a base em y = 0, converte polegadas para metros e gera o UV cilíndrico do corpo (u = ângulo, v = altura; triângulos na costura passam de 1 e a textura
repete). O modelo já era leve (4.718 triângulos, 350 KB cru) e saiu do pipeline com **49,9 KB**. Achado: o `prune` do gltf-transform descarta o UV de um material
sem textura embutida (`keepAttributes: true` resolve). Os números do estudo abaixo (v0 → v1) são do copo gerado por código; os da v2 estão no fim da seção.

## O estudo: números antes e depois

"Antes" é a **v0** (commit `v0: primeira versão funcional...`): modelos crus do gerador (malha densa, texturas PNG com ruído), SVGs originais desenhados
no canvas, Google Fonts por CDN, model-viewer no bundle principal, tudo carregado de uma vez, 9 elementos também no celular, textura de 2048 px no
celular, PNGs 2x nos cards e a repulsão perguntando ao DOM onde cada elemento está (`getBoundingClientRect` por elemento, a cada frame).
"Depois" é a **v1** publicada. Medições locais com `vite preview`, Chrome 158, Lighthouse 13.6, mediana de 3 execuções.

### Lighthouse

| | Performance | Acessibilidade | Boas Práticas | SEO | FCP | LCP | TBT | Peso |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Celular, antes | 76 | 100 | 100 | 100 | 3,1 s | 3,1 s | 389 ms | 22,29 MB |
| **Celular, depois** | **99** | **100** | **100** | **100** | **0,8 s** | **0,8 s** | **120 ms** | **0,74 MB** |
| Desktop, antes | 99 | 100 | 100 | 100 | 0,7 s | 0,7 s | 0 ms | 22,29 MB |
| **Desktop, depois** | **100** | **100** | **100** | **100** | **0,2 s** | **0,2 s** | **8 ms** | **0,68 MB** |

Em produção (https://copos-laser.vercel.app, mesma mediana de 3): **celular 99 · 100 · 100 · 100** (FCP/LCP 0,8 s, TBT 135 ms, 0,69 MB) e
**desktop 100 · 100 · 100 · 100** (LCP 0,2 s, TBT 7 ms, 0,63 MB).

Honestidade sobre o TBT: parte da queda vem de o 3D ser importado depois do `load` e de o ambiente de estúdio entrar só 2,5 s depois (ver achado 3). O custo
existe, só não bloqueia a primeira pintura nem a interação com o texto. O que mede o 3D de verdade é a tabela de execução abaixo.

### Modelos 3D (`scripts/optimize-models.mjs`)

| Modelo | Antes | Depois | Redução | Triângulos antes | Triângulos depois |
|---|---:|---:|---:|---:|---:|
| copo | 12.786 KB | 88,8 KB | 99,3% | 50.560 | 12.930 |
| estrela | 926 KB | 22,5 KB | 97,6% | 30.980 | 3.717 |
| losango | 26,4 KB | 4,3 KB | 83,6% | 264 | 128 |
| chapinha | 2.027 KB | 19,4 KB | 99,0% | 27.344 | 3.278 |
| faísca | 2.929 KB | 21,6 KB | 99,3% | 31.224 | 3.746 |
| **Total** | **18.694 KB** | **157 KB** | **99,2%** | | |

Pipeline (gltf-transform 4): `dedup` → `reindexCreased` (próprio) → descarte das texturas que nunca aparecem → `flatten` → `join` → `weld` → `simplify`
(MeshoptSimplifier, alvo e erro por modelo) → `textureCompress` para WebP → `prune` → `dedup` → `meshopt` (quantização + compressão).

### Artes e imagens

| Item | Antes | Depois |
|---|---:|---:|
| Boiadeira + Poker (arte do copo) | 2,4 MB (SVG) | 134 KB (WebP binário) |
| Cards (4 imagens, 2x) | 2,7 MB (PNG) | ~36 KB (WebP 480 px, `srcset` + `loading="lazy"`) |
| Fonte | CDN (2 origens, bloqueia render) | 35 KB self-hosted com `preload` |
| Compartilhamento (og) | PNG 245 KB | JPG 1200×630, 65 KB |

### Em execução: 6 s com o mouse mexendo sobre o herói

| | Recálculos de estilo/s | Thread principal ocupada (4 s) | Só caixa envolvente do model-viewer |
|---|---:|---:|---:|
| Desktop, antes | 502 | 36,0% (1.439 ms) | 512 ms |
| **Desktop, depois** | **60** | **13,6% (545 ms)** | **145 ms** |
| Celular, antes | 507 | 34,9% (1.397 ms) | 561 ms |
| **Celular, depois** | **61** | **10,1% (405 ms)** | **84 ms** |

Medido com Playwright + CDP (`Performance.getMetrics` e `Profiler`), Chrome headless com GPU. Tabelas completas em `reports/`.

### O que as medições ensinaram (e o achismo teria errado)

1. **Geometria extrudada de novo era o vilão.** A alça do copo, a estrela, a chapinha e a faísca saem do three sem índice (3 vértices por triângulo, normal por
   face): nada solda e o simplificador não tem o que colapsar. O passo `reindexCreased` recalcula normais por ângulo de vinco e reindexa; sem ele a malha não simplifica.
   Mesma armadilha da Latinhas, já com a solução pronta.
2. **Texturas embutidas que ninguém vê.** O copo só aparece depois da gravação do canvas (`reveal="manual"`), então a textura do `.glb` não precisa existir:
   a `metallicRoughness` embutida e o "escovado" do inox saíram (e sem UV a emenda solda). Somado à simplificação e ao Meshopt, o copo foi de 12,8 MB para 88,8 KB.
3. **O ambiente de estúdio custou 5 segundos de TBT.** Com o `environment-image` próprio já no HTML, o Lighthouse mobile marcou TBT de 5,9 s (Performance 67):
   o model-viewer gera o ambiente (PMREM) e, em renderização por software, a tarefa passou de 4 s. Com o ambiente `neutral` o TBT cai para ~0,7 s, mas o
   inox fica chapado. Solução: nascer em `neutral` e **trocar para o ambiente de estúdio 2,5 s depois** da cena pronta (upgrade progressivo).
4. **O desfoque 3x3 do normal map custava ~0,6 s de TBT no celular.** Gerar o normal na meia resolução (média de 2x2) já suaviza a borda; tirar o desfoque levou
   Performance de 82 para 99 no celular. Medir o JS do projeto, não só o do model-viewer.
5. **Máscara binária vs. suavizada:** 5x menos bytes para o mesmo resultado na tela e exatamente o que a fibra precisa (ver a tabela de formatos).
6. **Os SVGs do CorelDRAW enganam o librsvg.** Largura em mm + viewBox em centésimos de mm: o dpi é aplicado duas vezes (a largura cresce com o quadrado do dpi).
   O script de arte mede a 72 e a 144 dpi e deduz o expoente, em vez de confiar nos mm declarados.
7. **Reflow forçado não era layout, era recálculo de estilo.** Ler `getBoundingClientRect` depois de escrever só `transform` não dispara layout; dispara
   recálculo de estilo forçado (um por elemento por frame: ~500/s). Tirar a leitura do loop levou a 60/s (1 por frame).
8. **Bug do model-viewer 4.4.0:** mudar `orientation` chama `arRenderer.onUpdateScene()` fora de AR e quebra a cada frame. `mv-patch.js` só deixa rodar com AR de verdade.

## Acessibilidade

Conteúdo legível sem 3D; modelos decorativos com `aria-hidden`; o copo tem `alt`. Seletor de arte como `radiogroup` com setas; estúdio com rótulos, foco
no primeiro campo e retorno do foco ao fechar; menu com `aria-expanded`, foco preso e Esc. Cada par cor de fundo × texto do herói passa no contraste AA.

## Limitações conhecidas

- O corpo é cônico e a arte é plana: embaixo ela fica um pouco mais esticada (um rotativo de verdade faz algo parecido). O arquivo do laser é a arte
  plana, sem compensação de cone.
- O arquivo do laser é PNG RGBA 8 bits só com preto e branco (o canvas não grava 1 bit): ~0,8 MB. Quem precisa de 1 bit converte no LightBurn.
- O canvas não aplica o eixo de largura da fonte variável; o nome usa a Archivo em peso 800.
- As medições foram feitas em Chrome headless numa máquina Apple Silicon; num Android de entrada o FPS real vai ser menor. O ganho relativo é o que se transfere.

## Créditos

Fonte [Archivo](https://github.com/Omnibus-Type/Archivo) (OFL) via Fontsource. Artes Boiadeira e Poker: Erick Dantas. Mandala e Constelação, copo e elementos 3D:
gerados por código neste repositório.

Feito por Erick Dantas · [github.com/ErickkADR](https://github.com/ErickkADR)
