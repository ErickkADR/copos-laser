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

## DIREITO AUTORAL (regra do Erick, 24/11/2026) — leia antes de mexer em arte
- Homem de Ferro, Coringa e Mulher-Maravilha são personagens com direitos autorais. As 3 artes (SVG do Erick) ficam **só como exemplos
  locais**: `exemplos-locais/*.svg` (fonte) e `public/locais/` (máscaras geradas). As duas pastas estão no `.gitignore` e no
  `.vercelignore`, e o `npm run build` ainda apaga `dist/locais`. Em dev (`import.meta.env.DEV`) elas aparecem no seletor e no estúdio
  (`addLocalArts` em `config/arts.js`); em produção o código nem existe (tree-shaking).
- No deploy público só entram **Boiadeira e Poker** (do Erick) + **Mandala e Constelação** (desenhadas por código, sem imagem).
- Antes de publicar: `git ls-files | grep -iE "locais|homem|coringa|maravilha"` e `grep -rIil "homem de ferro\|coringa\|maravilha" dist` têm que ser vazios.
  O upload do visitante cobre o caso de uso de arte própria. Se aparecer a og.jpg/print com o seletor de dev aberto, refazer a partir do `npm run preview`.
- **Marca:** nada de "Stanley" (nem logo, nem texto, nem modelo). O copo é um quencher genérico gerado por código.

## Como a gravação funciona (o coração do projeto)
- A arte vira uma **máscara** (alfa) num canvas do tamanho do mapa do corpo (`modules/engrave.js`): máscara 1 = inox escovado (metal 1,
  rugosidade ~0,34 com ruído), 0 = pintura fosca (metal 0, rugosidade 0,74). Saem 3 mapas: baseColor, metallicRoughness (G/B) e um normal leve.
- Medidas físicas em mm (`config/engrave.js`): corpo 283 × 220 mm (circunferência média × altura), faixa da arte 283 × 126 mm, nome logo abaixo,
  arquivo do laser 283 × 162 mm a 400 dpi (4457 × 2551 px) com o DPI gravado no PNG (chunk pHYs, `png-dpi.js`).
- **CanvasTexture tem `flipY = true`**: os mapas são escritos de cabeça para baixo de propósito (glTF tem a origem no topo). Se mexer na
  composição e a arte aparecer de cabeça para baixo, é isso.
- Duas "pranchas" de textura (A/B) em `cup.js`: a arte nova é composta na reserva antes do giro e entra no pico dele. Edição ao vivo do estúdio escreve na ativa.
- O corpo é cônico (raio 52,5 → 36,5 mm): a arte plana é esticada um pouco mais embaixo. Aceito (rotativo de verdade faz parecido).
- Artes prontas `kind: 'mask'`: WebP lossless **binário** (`scripts/build-art.mjs`): 2048 px na tela, 400 dpi só sob demanda no download. Binário pesa
  ~5x menos que suavizado e o laser é 1 bit mesmo. Fonte: `assets-src/arte/` (o PDF da Boiadeira vira SVG com PyMuPDF: `scripts/pdf-to-svg.py`).
- Armadilha do `build-art`: nos SVGs do CorelDRAW o librsvg aplica o dpi duas vezes (a largura cresce com o quadrado do dpi); o script mede a 72 e 144 dpi.
  Arte em negativo (branco sobre fundo escuro, ex.: mulher-maravilha local) precisa de `invert`.

## Decisões deliberadas (parecem erro, não são)
- `public/decoders/meshopt-ready.js` é um arquivo **vazio de propósito** (ativa o Meshopt que já vem no bundle do model-viewer).
- `modules/mv-patch.js` contorna bug do model-viewer 4.4.0 (`orientation` quebra o ARRenderer fora de AR). Testar sem o patch ao atualizar.
- O model-viewer nasce com `environment-image="neutral"` e **troca para `/img/studio-env.jpg` 2,5 s depois** (`scene.js`): gerar o ambiente de
  estúdio (PMREM) custa ~5 s de TBT no Lighthouse (renderização por software). Sem o ambiente, o inox fica chapado. Não "simplificar" para o ambiente já no HTML.
- A textura embutida no `cup.glb` é 256 px e sem metallicRoughness: nunca aparece (`reveal="manual"` só revela depois da gravação do canvas).
- O loop (`loop.js`) **não pode ler o DOM** (a v0 lia `getBoundingClientRect`: ~500 recálculos de estilo/s contra ~60).
- Cada mudança de `orientation` faz o model-viewer percorrer todos os vértices: modelo novo tem que passar pelo pipeline.
- `scene.js` é importado depois do `load` (TBT/LCP). Cliques antes disso ficam numa fila em `main.js`.
- O normal map não tem desfoque 3x3: a média 2x2 na meia resolução já suaviza e o desfoque custava ~100 ms de TBT no celular (TBT 5,9 s → 0,1 s somando o ambiente).

## Assets: o que é versionado e o que é gerado
- Versionados: `public/models`, `public/art`, `public/img`, `assets-src/arte` (fontes das artes públicas). Não: `assets-src/models-raw`, `assets-src/img-raw`.
- Mudou `scripts/generate-models.mjs`? `npm run models:raw && npm run models:optimize`. Mudou arte? `npm run art:build`. Mudou o visual? `images:capture` (dev no ar) + `images:optimize`.
- v0 e v1 estão no histórico (`git log`): a v0 é a linha de base sem otimização (modelos crus, SVG original, fonte por CDN...). Não "consertar" a v0.

## Armadilhas
- ExtrudeGeometry sai sem índice: sem o passo `reindexCreased` do pipeline ela não simplifica (alça, estrelas, losango, chapinha, faísca).
- Peças torneadas (LatheGeometry) têm a costura em +Z, de frente para a câmera: o gerador gira 180°.
- `RecalcStyleCount` é a métrica certa do "reflow" do loop; `ScriptDuration` não mostra o custo do model-viewer (usar `measure:profile`).
- O `npm install` pede aprovação de script do `fsevents`: ignorar (não é necessário).
