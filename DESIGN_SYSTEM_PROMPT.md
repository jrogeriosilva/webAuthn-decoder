# Prompt de Design System — FIDO2 Lab

Use este prompt como contexto ao gerar novas ferramentas/aplicações que devem compartilhar a mesma identidade visual do FIDO2 Lab. Ele descreve filosofia, paleta, tipografia, espaçamento, primitivas e padrões de componentes para reproduzir fielmente o design.

---

## Prompt pronto para colar em outra IA

> Construa a interface seguindo o design system abaixo. Trate-o como restrição obrigatória: cores, tipografia, raio de borda, escala de espaçamento e variantes de componentes não devem ser alterados sem justificativa explícita.
>
> ### 1. Filosofia visual
> - Estética **dark-only**, **developer tool** sóbrio: tela preta-azulada, alto contraste tipográfico, zero ornamentação supérflua.
> - Foco no conteúdo monoespaçado (payloads, JSON, hex, CBOR). UI cede espaço para os dados.
> - Estilo shadcn `base-nova` com `baseColor: neutral` e `cssVariables: true`. Ícones **Lucide**.
> - Layout single-column, centralizado, com largura máxima confortável para leitura técnica.
> - Sem gradientes, sem sombras coloridas, sem ilustrações decorativas. Diagramas só quando explicam um conceito.
> - Animações discretas: somente `transition-colors`, `transition-opacity`, `transition-all` em hover/focus. Sem motion gratuita.
>
> ### 2. Paleta de cores (CSS variables, dark-first)
>
> Definida em `:root` e replicada em `.dark` — o app é dark-first, então ambos os escopos têm os mesmos valores.
>
> | Token                  | Valor                          | Uso                                                   |
> |------------------------|--------------------------------|-------------------------------------------------------|
> | `--background`         | `#0b1120`                      | Fundo da página (azul-marinho quase preto)            |
> | `--foreground`         | `oklch(0.92 0 0)`              | Texto principal (off-white neutro)                    |
> | `--card` / `--popover` | `#141928`                      | Superfícies elevadas (cards, dropdowns, output)       |
> | `--card-foreground`    | `oklch(0.92 0 0)`              | Texto sobre card                                      |
> | `--primary`            | `oklch(0.88 0 0)`              | Botão padrão (cinza-claro neutro)                     |
> | `--primary-foreground` | `oklch(0.15 0 0)`              | Texto sobre primary (quase preto)                     |
> | `--secondary`          | `#1a2845`                      | Botão secundário, badges informativos                 |
> | `--secondary-foreground` | `oklch(0.92 0 0)`            | Texto sobre secondary                                 |
> | `--muted`              | `#1a2845`                      | Fundo de chips de código inline (`<code>`), hover sutil |
> | `--muted-foreground`   | `oklch(0.62 0 0)`              | Texto secundário, descrições, labels                  |
> | `--accent`             | `#1a2845`                      | Hover de menu items                                   |
> | `--accent-foreground`  | `oklch(0.92 0 0)`              | Texto sobre accent                                    |
> | `--destructive`        | `oklch(0.704 0.191 22.216)`    | Erros, alertas (vermelho desaturado)                  |
> | `--border`             | `oklch(1 0 0 / 10%)`           | Bordas padrão (branco a 10%)                          |
> | `--input`              | `oklch(1 0 0 / 12%)`           | Bordas de inputs                                      |
> | `--ring`               | `oklch(0.55 0 0)`              | Anel de focus-visible                                 |
>
> **Cores de sintaxe da árvore (tree view JSON-like, valores literais hex):**
> - Chaves de objeto: `#e06c75` (rosa-vermelho)
> - Strings: `#98c379` (verde)
> - Números: `#61afef` (azul)
> - Booleanos: `#e5c07b` (amarelo-âmbar)
> - `null`, separadores `:`, índices, pontuação: `#6b737c` (cinza)
> - Botão de copiar inline: `bg-white/10` no hover, `bg-white/20` ao pressionar; check de sucesso em `text-green-400`.
>
> **Variante badge "warning"** (não está nos tokens, é literal): `bg-[oklch(0.75_0.15_85/15%)]` com `text-[oklch(0.75_0.15_85)]`.
>
> ### 3. Tipografia
> - Fonte sans/heading: **Geist Variable** (`@fontsource-variable/geist`). `--font-sans: 'Geist Variable', sans-serif`. `--font-heading` herda de `--font-sans`.
> - Fonte mono: stack padrão do navegador (`font-mono` do Tailwind), usada para payloads, badges de formato, chaves COSE, código inline.
> - Escala observada:
>   - H1 (app title): `text-xl font-semibold leading-tight`
>   - H2 (seção principal): `text-2xl font-semibold`
>   - H2 (subseções): `text-lg font-semibold`
>   - Corpo padrão: `text-sm` (14px) com `leading-relaxed` em conteúdo longo
>   - Microcopy/labels: `text-xs` (12px), frequentemente `text-muted-foreground`
>   - Tree view: `font-mono text-[13px] leading-relaxed`
>   - Código inline em parágrafos: `font-mono text-xs bg-muted px-1 rounded`
>
> ### 4. Espaçamento e layout
> - Container principal: `mx-auto max-w-5xl px-4` (≈1024px de largura máxima).
> - Wrapper do app: `min-h-screen bg-background text-foreground`.
> - Stack vertical do conteúdo: `<main className="flex flex-col gap-8">`.
> - Header: `flex items-center justify-between py-6 px-4` com título + subtítulo `text-sm text-muted-foreground`.
> - Conteúdo educacional / artigos: separado por `mt-16 border-t border-border pt-12 pb-16 space-y-10`.
> - Seções dentro de artigo: `space-y-3`; listas: `space-y-1` ou `space-y-2`; definition lists: `space-y-3` ou `space-y-5`.
> - Output area: `min-h-[200px] rounded-md border border-border bg-card p-4`.
> - Gap entre input e badges: `flex flex-col gap-2`, com barra inferior em `min-h-[28px]` para evitar layout shift.
>
> ### 5. Raio de borda (radius scale)
>
> Base `--radius: 0.625rem` (10px), com escala derivada:
> ```
> --radius-sm:  calc(var(--radius) * 0.6)   ≈ 6px
> --radius-md:  calc(var(--radius) * 0.8)   ≈ 8px
> --radius-lg:  var(--radius)               = 10px
> --radius-xl:  calc(var(--radius) * 1.4)   ≈ 14px
> --radius-2xl: calc(var(--radius) * 1.8)   ≈ 18px
> --radius-3xl: calc(var(--radius) * 2.2)   ≈ 22px
> --radius-4xl: calc(var(--radius) * 2.6)   ≈ 26px
> ```
> Convenções:
> - Botões e textareas: `rounded-lg`
> - Cards/output/popovers: `rounded-md`
> - Badges (pílulas): `rounded-4xl`
> - Botões `xs`/`sm`: `rounded-[min(var(--radius-md),10px|12px)]`
>
> ### 6. Foco e acessibilidade
> - Anel de foco padrão: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` (3px com 50% de opacidade).
> - Estado inválido: `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`.
> - Disabled: `disabled:pointer-events-none disabled:opacity-50`.
> - Botões usam micro-feedback tátil: `active:not-aria-[haspopup]:translate-y-px`.
> - Em erros, sempre incluir `role="alert"` e copy descritiva curta + sugestão opcional.
>
> ### 7. Primitivas de componente (variantes obrigatórias)
>
> #### Button (`@base-ui/react/button` + cva)
> Classes base: `inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all`.
>
> Variantes:
> - `default` — `bg-primary text-primary-foreground hover:bg-primary/80`
> - `outline` — `border-border bg-background hover:bg-muted`
> - `secondary` — `bg-secondary text-secondary-foreground hover:bg-secondary/80`
> - `ghost` — `hover:bg-muted hover:text-foreground`
> - `destructive` — `bg-destructive/10 text-destructive hover:bg-destructive/20`
> - `link` — `text-primary underline-offset-4 hover:underline`
>
> Tamanhos: `xs` (h-6), `sm` (h-7), `default` (h-8), `lg` (h-9), `icon`/`icon-xs`/`icon-sm`/`icon-lg`. Ícones internos (Lucide) ficam em `size-3` a `size-4` conforme tamanho.
>
> #### Badge
> Pílula `rounded-4xl h-5 px-2 text-xs font-medium`. Variantes: `default`, `secondary` (mais usada em rótulos de formato/tipo), `destructive`, `warning` (cor amarela literal), `outline`, `ghost`, `link`. Quando exibe formato técnico, usar `font-mono text-xs`.
>
> #### Textarea
> `rounded-lg border border-input bg-transparent px-2.5 py-2 text-base md:text-sm`. No FIDO2 Lab é estilizada em `font-mono text-sm min-h-[120px] max-h-[320px] resize-none bg-card border-border` com auto-grow controlado por JS (limita a 320px de altura).
>
> #### Card / superfície elevada
> Não há `<Card>` shadcn — usa-se `div` com `rounded-md border border-border bg-card p-4`. Para placeholder vazio: incluir copy curta em `text-sm text-muted-foreground`. Para erros: borda em `border-destructive/50` e título em `text-sm font-medium text-destructive` + sugestão em `text-sm text-muted-foreground`.
>
> #### Menu/Dropdown (`@base-ui/react/menu`)
> `Menu.Popup`: `min-w-[280px] max-w-[360px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md`. `Menu.Item`: `rounded-sm px-2 py-1.5 text-sm data-[highlighted]:bg-muted`. Item composto = título `font-medium leading-tight` + descrição `text-xs text-muted-foreground leading-snug`. Trigger geralmente um `Button variant="outline" size="sm"` com ícone Lucide à esquerda + `ChevronDown` à direita (`opacity-70`).
>
> #### Tree view (estilo "JSON viewer")
> Container: `font-mono text-[13px] leading-relaxed`. Cada nó:
> - Chave em `#e06c75 font-medium`, separador `:` em `#6b737c`.
> - Valores coloridos por tipo (ver paleta acima).
> - Toggle de expand/collapse com `ChevronDown`/`ChevronRight` (Lucide, `size-3`) em cor `#6b737c`, hover muda para `text-foreground`.
> - Indentação: 14px por nível, aplicada via `paddingLeft` inline.
> - Botão de copiar valor: aparece só no hover do nó (`opacity-0 group-hover/val:opacity-100`), em `bg-white/10` com check verde após copiar (1500ms de feedback).
> - CSS adicional: `.decode-tree-container :where(ul, li) { background: var(--card); color: var(--foreground); }` e `line-height: 1.6`.
>
> #### Botão "Copy all" / "Copied"
> `Button variant="outline" size="sm" className="gap-1.5"` com ícone `Copy` (size-3.5). Após clique vira `Check` em `text-green-500` + texto "Copied" por 1500ms.
>
> #### Diagramas / imagens explicativas
> `<img>` em `w-full rounded-lg cursor-zoom-in transition-opacity hover:opacity-90`. Click abre lightbox: `fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out`, imagem interna em `max-w-full max-h-full rounded-lg shadow-2xl`. Fechar com Esc ou clique no overlay.
>
> ### 8. Padrões de conteúdo
> - **Definition lists** (`<dl>`) para glossários/FAQ:
>   - `<dt>` técnico: `font-mono text-xs text-foreground font-medium`
>   - `<dd>`: `mt-0.5 pl-3 text-muted-foreground`
>   - FAQ: `<dt>` em `font-semibold text-foreground`, `<dd>` em `mt-1 text-muted-foreground`.
> - **Listas com bullet** dentro de seções educacionais: `list-disc list-inside space-y-1 text-muted-foreground`. Termos enfatizados ficam em `<strong className="text-foreground">`.
> - **Código inline** dentro de parágrafos longos: `font-mono text-xs bg-muted px-1 rounded`.
> - **Hierarquia de cor de texto**: títulos e ênfases em `text-foreground`; corpo descritivo em `text-muted-foreground`. Nunca use cor pura branca — sempre `oklch(0.92 0 0)`.
>
> ### 9. Stack técnico (lock-in)
> - **Build**: Vite + TypeScript. Tailwind CSS v4 via `@tailwindcss/vite`. Configuração CSS-first dentro de `src/index.css` usando `@theme` e `@import "tailwindcss"` — **não criar `tailwind.config.*`**.
> - **Componentes**: shadcn/ui (style `base-nova`, baseColor `neutral`, cssVariables `true`) sobre `@base-ui/react`. Ícones `lucide-react`.
> - **Variantes**: `class-variance-authority` + `clsx` + `tailwind-merge` (helper `cn`).
> - **Animações utilitárias**: `tw-animate-css`.
> - **Path alias**: `@/*` → `src/*`.
>
> ### 10. Tom de voz da UI
> - Microcopy em inglês, direto, técnico, sem floreios.
> - Placeholders descrevem o input esperado: ex. *"Paste a base64url, hex, or CBOR payload..."*.
> - Headers indicam função, não estado: *"Decoded output will appear here"* em vez de *"No data"*.
> - Erros explicam **o que** falhou e oferecem uma sugestão acionável (campo `suggestion` no resultado).
> - Subtítulos resumem propósito em uma linha (`text-sm text-muted-foreground` logo abaixo do H1).
>
> ### 11. Comportamentos padrão
> - Auto-detecção de formato em vez de pedir ao usuário escolher.
> - Debounce de 300ms em inputs de texto que disparam parsing pesado; resposta imediata em paste/sample-load.
> - Feedback de cópia visual por 1500ms (ícone troca de `Copy` para `Check` verde).
> - Lightbox de imagem fecha com Esc.
> - Auto-grow de textareas com cap (ex.: até 320px).
>
> ### 12. Restrições rígidas
> - **Dark-first**: não introduzir tema light sem redesign explícito da paleta.
> - Não trocar `cbor-x`, `react-json-view-lite`, `@hexagon/base64` ou `@base-ui/react` por equivalentes.
> - Não adicionar gradientes, glassmorphism, neumorfismo ou efeitos coloridos de glow.
> - Não usar emojis em UI a menos que o usuário peça.
> - Toda cor referenciada inline (`text-[#...]`) deve corresponder à paleta de sintaxe acima; outras cores devem vir das CSS variables.

---

## Resumo executivo (one-liner)

> Dark developer tool, Tailwind v4 + shadcn `base-nova` neutro, fundo `#0b1120`, cards `#141928`, secondary `#1a2845`, foreground `oklch(0.92 0 0)`, fonte Geist Variable + mono nativa, raio base 10px, ícones Lucide, container `max-w-5xl`, sintaxe estilo One-Dark (`#e06c75`/`#98c379`/`#61afef`/`#e5c07b`/`#6b737c`), micro-interações sutis, copy técnica e direta.
