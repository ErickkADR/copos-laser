# copos-laser — CLAUDE.md

Landing 3D de copos térmicos pretos com **gravação a fibra laser** (marca fictícia "Gravura"). Projeto **pessoal** do Erick, conta
pessoal em tudo: GitHub `ErickkADR/copos-laser` (público), Vercel conta `erickkadr`, produção https://copos-laser.vercel.app.
Irmão do `~/PROJETOS/latinhas-3d` (mesma base e mesma disciplina de medir antes/depois): quem já leu o CLAUDE.md de lá reconhece as armadilhas.
O README é a vitrine (decisões + números antes/depois). Ler o README antes de mexer.

## Stack e comandos
- Vite + JavaScript puro. `@google/model-viewer` 4.4 (three **pinado em ~0.183**, peer do model-viewer), GSAP.
- `npm run dev` (5173) / `npm run build` (já remove `dist/locais`) / `npm run preview` (4173).
- Publicar: `npx vercel --prod` na pasta (o projeto Vercel não está ligado ao GitHub; push não publica). Alias `copos-laser.vercel.app`.
- Prints e medições usam o **Chrome instalado** (`channel: 'chrome'`), não o Chromium do Playwright.

## DIREITO AUTORAL (decisão do Erick, 25/11/2026) — leia antes de mexer em arte
- **Mudou:** antes (24/11) Homem de Ferro, Coringa e Mulher-Maravilha eram só exemplos locais, fora do git e do deploy. Em 25/11 o Erick pediu para colocá-los **fixos no site público**,
  com a **Mulher-Maravilha como a primeira** (a que aparece ao entrar). São personagens com direitos autorais e o repositório é público: o risco é dele (avisado na época). Se alguém
  reclamar, tirar as 3 de `ARTS` (`config/arts.js`) e de `scripts/build-art.mjs`, rodar `npm run art:build` e apagar `public/art/{mulher-maravilha,homem-de-ferro,coringa}-*.webp`.
- Ordem no seletor: Mulher-Maravilha, Homem de Ferro, Coringa, Boiadeira, Poker, Mandala, Constelação. Fontes SVG em `assets-src/arte/`; a Mulher-Maravilha é arte em negativo (`invert: true` no build).
- O upload do visitante continua existindo.
- **Marca:** nada de "Stanley" em texto, nome de arquivo, logo ou commit. **Exceção pedida pelo Erick (24/11/2026):** o copo é um modelo real de copo
  térmico de 40 oz que ele forneceu (`~/Downloads/copo+stanley.skp` e `.dae`, ZIP do SketchUp). Só o `public/models/cup.glb` otimizado é versionado e vai
  para o deploy; a fonte (`.skp/.dae`) **não** entra no git. Origem e licença do modelo são desconhecidas (parece de galeria 3D pública): se algum dia
  alguém reclamar, voltar ao copo gerado por código (está no histórico, v1) e tirar o `cup.glb`.
- **Refazer o copo:** `node scripts/convert-dae.mjs <model.dae descompactado> assets-src/models-raw/cup.glb` e `npm run models:optimize`. O `.dae` é um ZIP: `unzip` numa pasta isolada.

## Como a gravação funciona (o coração do projeto)
- A arte vira uma **máscara** (alfa) num canvas do tamanho do mapa do corpo (`modules/engrave.js`): máscara 1 = inox escovado (metal 1,
  rugosidade ~0,34 com ruído), 0 = pintura fosca (metal 0, rugosidade 0,74). Saem 3 mapas: baseColor, metallicRoughness (G/B) e um normal leve.
- Medidas físicas em mm (`config/engrave.js`): corpo real de 284 mm de altura (parte estreita raio 45–50 mm, larga 65 mm), mapa = 298 mm de volta × 284 mm; arte 283 × 126 mm na parte estreita, nome comprimido na larga,
  arquivo do laser 283 × 160 mm a 400 dpi (4457 × 2520 px) com o DPI gravado no PNG (chunk pHYs, `png-dpi.js`).
- **CanvasTexture tem `flipY = true`**: os mapas são escritos de cabeça para baixo de propósito (glTF tem a origem no topo). Se mexer na
  composição e a arte aparecer de cabeça para baixo, é isso.
- Duas "pranchas" de textura (A/B) em `cup.js`: a arte nova é composta na reserva antes do giro e entra no pico dele. Edição ao vivo do estúdio escreve na ativa.
- O mapa tem UMA largura (volta de 298 mm) para todas as alturas: na parte larga o texto esticaria 1,37x, por isso o nome é comprimido (`NAME_ZONE.sx`). Os 18 mm de cima da arte caem no ombro entre as duas partes e deformam um pouco.
- O SketchUp exporta cada face duas vezes (frente/verso): `convert-dae.mjs` mantém só a da frente (tabela `KEEP`).
- Artes prontas `kind: 'mask'`: WebP lossless **binário** (`scripts/build-art.mjs`): 2048 px na tela, 400 dpi só sob demanda no download. Binário pesa
  ~5x menos que suavizado e o laser é 1 bit mesmo. Fonte: `assets-src/arte/` (o PDF da Boiadeira vira SVG com PyMuPDF: `scripts/pdf-to-svg.py`).
- Armadilha do `build-art`: nos SVGs do CorelDRAW o librsvg aplica o dpi duas vezes (a largura cresce com o quadrado do dpi); o script mede a 72 e 144 dpi.
  Arte em negativo (branco sobre fundo escuro, ex.: mulher-maravilha local) precisa de `invert`.

## Decisões deliberadas (parecem erro, não são)
- `public/decoders/meshopt-ready.js` é um arquivo **vazio de propósito** (ativa o Meshopt que já vem no bundle do model-viewer).
- `modules/mv-patch.js` contorna bug do model-viewer 4.4.0 (`orientation` quebra o ARRenderer fora de AR). Testar sem o patch ao atualizar.
- O model-viewer nasce com `environment-image="neutral"` e **troca para `/img/studio-env.jpg` 2,5 s depois** (`scene.js`): gerar o ambiente de
  estúdio (PMREM) custa ~5 s de TBT no Lighthouse (renderização por software). Sem o ambiente, o inox fica chapado. Não "simplificar" para o ambiente já no HTML.
- O `cup.glb` não tem textura embutida; o `prune` usa `keepAttributes: true` para não perder o UV do corpo (o canvas é a única textura). `reveal="manual"` só revela depois da gravação.
- O loop (`loop.js`) **não pode ler o DOM** (a v0 lia `getBoundingClientRect`: ~500 recálculos de estilo/s contra ~60).
- Cada mudança de `orientation` faz o model-viewer percorrer todos os vértices: modelo novo tem que passar pelo pipeline.
- `scene.js` é importado depois do `load` (TBT/LCP). Cliques antes disso ficam numa fila em `main.js`.
- O normal map não tem desfoque 3x3: a média 2x2 na meia resolução já suaviza e o desfoque custava ~100 ms de TBT no celular (TBT 5,9 s → 0,1 s somando o ambiente).

## Assets: o que é versionado e o que é gerado
- Versionados: `public/models`, `public/art`, `public/img`, `assets-src/arte` (fontes das artes públicas). Não: `assets-src/models-raw`, `assets-src/img-raw`.
- Mudou `scripts/generate-models.mjs`? `npm run models:raw && npm run models:optimize`. Mudou arte? `npm run art:build`. Mudou o visual? `images:capture` (dev no ar) + `images:optimize`.
- v0 e v1 estão no histórico (`git log`): a v0 é a linha de base sem otimização (modelos crus, SVG original, fonte por CDN...). Não "consertar" a v0.

## Armadilhas
- ExtrudeGeometry sai sem índice: sem o passo `reindexCreased` do pipeline ela não simplifica (estrelas, losango, chapinha, faísca).
- Peças torneadas (LatheGeometry) têm a costura em +Z, de frente para a câmera: o gerador gira 180°.
- `RecalcStyleCount` é a métrica certa do "reflow" do loop; `ScriptDuration` não mostra o custo do model-viewer (usar `measure:profile`).
- O `npm install` pede aprovação de script do `fsevents`: ignorar (não é necessário).

## v2 (24/11/2026, pedido do Erick)
- Fundo **sempre o mesmo preto** (`--bg: #0a0a0b`), igual ao `latinhas-3d`, sem troca de cor. Sem elementos 3D flutuantes, sem faíscas, sem nome e sem cor de pintura: a única opção
  é a arte. O estúdio ficou só com a escolha da arte, o envio com limiar/inverter e o download do laser. Módulos `elements.js`, `sparks.js` e `generate-models.mjs` (elementos) foram
  removidos (histórico do git). `text` e `paint` continuam nos temas (nome vazio, preto) porque `engrave.js` ainda os suporta.
- As seções acima que falam de nome na parte larga, cor da pintura na alça/tampa e elementos descrevem o que o código ainda suporta; a UI não expõe mais.
- Hero com `height: 100vh` exato (sem altura mínima).


## v3 (25/11/2026, pedido do Erick)
- **Só o herói**: sem seções abaixo, menu, rodapé nem cards (removidos `menu.js`, `sections.css`, imagens dos cards). A página não rola (`overflow: hidden`).
- **Giro livre de 360°**: `cup.enableDrag(hero)` (pointer events, inércia). `state.drag` é aditivo ao tilt do cursor e ao giro do GSAP. `touch-action: none` no herói (o seletor tem `pan-x`).
- **Canvas do copo = herói inteiro** (`.cup { width/height: 100% }`): o modelo gira sem ser cortado. Para a distância da câmera valer, o `<model-viewer>` precisa de `max-camera-orbit="auto auto 4m"`
  (o auto limita o raio ao enquadramento). Distância: 1,25 m no desktop, 1,3 m no celular (`scene.js`).
- **Fundo em CSS** (`hero.css`): degradê radial + brilho de chão + `public/img/noise.png` (128 px, opacidade 3,5%) para quebrar as faixas. A imagem de parede que o Erick mandou ficou pixelada
  (2 KB/7 KB em WebP de um JPG de 6000 px) e foi descartada; o `latinhas-3d` usa o mesmo CSS.
- **Layout do copo invertido**: arte na parte LARGA (`ART_ZONE.y = 14`, comprimida por `ART_SX`), texto na parte ESTREITA (`NAME_ZONE.y = 215`). `text` de cada arte pronta começa com o nome dela; o estúdio tem um campo "Texto gravado".

## 360° (25/11/2026, pedido do Erick)
- A arte dá a **volta inteira** da parte larga: o mapa todo (`W = layout.w`), altura 154 mm (`ART_ZONE`), esticada na horizontal (408 mm de volta contra os 283 mm do projeto original: ~1,2x com a altura nova). Sem `ART_SX`.
- Arquivo do laser: **408 × 188 mm a 400 dpi** (arte da volta inteira em cima, texto embaixo). Arte enviada pelo visitante se **repete** lado a lado (sem distorcer) até fechar a volta.
- Para arte nova: o ideal é proporção ~2,65:1 (408 × 154 mm), com as bordas esquerda e direita se encontrando (emenda nas costas).

## 25/11/2026 (2)
- Tampa do copo em **inox escovado** (material `Lid`: metal 1, rugosidade 0,3, não recebe a cor da pintura; só a alça recebe). Mandala e Constelação foram **removidas** (e o `procedural.js` junto; o tipo `proc` não existe mais). Artes no seletor: Mulher-Maravilha, Homem de Ferro, Coringa, Boiadeira, Poker, Sua arte.

## Pacote de artes de fibra laser (25/11/2026, pedido do Erick)
- `~/Downloads/PACK FIBRA LASER.zip` (71 PNG preto e branco, ~1820 px). `node scripts/build-pack.mjs <pasta extraída>` gera `public/art/pack/*.webp` (máscara lossless binária, 3,5 MB no total) e `src/config/pack-manifest.json`; as artes entram em `ARTS` depois das 5 principais (Mulher-Maravilha continua a primeira). O ZIP **não** é versionado.
- **Regra:** o CLARO vira inox, o ESCURO fica preto (papel branco = metal). `fit: 'contain'`: proporção preservada (altura cheia da faixa, largura em mm reais, centrada); o resto da volta fica pintado. Não esticar até 408 mm: as artes são 1,2 a 1,8:1 e deformaria rostos.
- **Fora de propósito:** LEANDRO, VICTOR e RICARDO (pessoas do círculo do Erick; site público). Há retratos de pessoas reais e muito IP (mangás, jogos) no pacote: risco assumido pelo Erick.
- Resolução do laser: o PNG exportado reusa a máscara de ~1820 px, ou seja, ~170 dpi no tamanho real (as artes principais têm máscara própria de 400 dpi).
- UI: seletor do herói é uma lista com rolagem (~73 itens); no estúdio a arte é um `<select>`. Só as 4 primeiras artes são pré-carregadas; as outras baixam ao escolher.

## Dois modelos de copo (25/11/2026, pedido do Erick)
- **Seletor de modelo** no cabeçalho: "Térmico 40 oz" (`cup.glb`, SketchUp) e "Caneca" (`pint.glb`, **feito no Blender via MCP**: corpo preto cônico, faixa de aço em cima, anel de aço embaixo, tampa com aba; fonte `assets-src/pint.blend`, exportado para `assets-src/models-raw/pint.glb` e otimizado por `npm run models:optimize`).
- Cada modelo tem a sua geometria em `config/engrave.js` (`MODELS`): `useModel(id)` preenche os objetos mutáveis `BODY_MM`, `ART_ZONE`, `NAME_ZONE`, `WRAP`, `EXPORT_ZONE`. A caneca tem 101,5 mm de corpo pintado, volta de 254 mm, arte de 91 mm de altura e **sem texto gravado** (`name_.on = false`); o arquivo do laser da caneca sai com 254 × 91 mm a 400 dpi.
- `cup.js` recarrega o `.glb` (`switchModel`), recria o motor de gravação e repinta a arte atual. `?model=pint` abre direto na caneca.
- Para criar o `.glb` no Blender: materiais `Body` (com UV cilíndrico: u = ângulo, 0,5 de frente = -Y do Blender; v = altura só no corpo pintado), `Steel` e `Lid`; exportar com y-up. O `Body` tem que ser a ÚNICA peça com UV.
- Caneca v2 (mesmo dia): maior e mais esguia, como na foto do Erick (190 mm de altura, corpo pintado de 131,5 mm, volta 251 mm, arte de 119 mm), tampa de **plástico preto** (material `Plastic`, não é sobrescrito pelo site) com aba de aço (`Lid`) e anel preto de borracha acima da base de aço. Câmera 0,6 m (desktop) / 0,72 m (celular).
- Caneca v3: faixas de aço do topo e da base reduzidas pela metade (12 mm cada; antes 24); corpo pintado de 155,5 mm, arte de 143 mm de altura, altura total igual (190 mm).
- **Cache de modelo:** `/models/*` agora é `max-age=0, must-revalidate` e o nome do arquivo leva `?v=N` (em `MODELS.file`). **Sempre incrementar o `v` ao trocar um .glb**, senão quem já abriu o site continua vendo o modelo antigo (aconteceu com a caneca em 25/11).
