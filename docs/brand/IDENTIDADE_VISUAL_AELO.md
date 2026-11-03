# AELO — Identidade visual v1

**Data:** 03/11/2026. **Estado:** proposta em revisão, não aprovada como marca institucional definitiva.

## Essência e posicionamento

**Nome da marca:** AELO. **Nome técnico do repositório/TCC:** AELO-PSI.

A identidade expressa a conexão de registros, a continuidade do acompanhamento terapêutico, o valor das fontes e a autonomia do profissional. A forma do isotipo nasce da letra minúscula **a** em um traço contínuo que termina em um **nó azul**. Não utiliza um ícone genérico de cérebro, robô ou estetoscópio.

**Assinatura verbal proposta:** "Conexões com contexto. Cuidado com critério."

A plataforma organiza registros e oferece apoio documental e assistivo; não faz terapia, não diagnostica nem substitui a avaliação psicológica.

## Elementos da marca

| Local no repositório | Aplicação |
|---|---|
| `Frontend/public/brand/aelo-symbol.svg` | Símbolo em fundo transparente, reutilizável |
| `Frontend/public/brand/aelo-app-icon.svg` | Ícone quadrado para aplicação |
| `Frontend/public/brand/aelo-wordmark-dark.svg` | Assinatura para fundo escuro |
| `Frontend/public/brand/aelo-wordmark-light.svg` | Assinatura para fundo claro |
| `Frontend/public/favicon.svg` | Identificação da aba do navegador |
| `Frontend/src/components/brand/AeloBrand.tsx` | Componente tipográfico semântico para React |

As assinaturas SVG dependem de fontes locais (Inter / Arial / sans-serif) e podem apresentar pequenas variações entre plataformas. O isotipo sozinho é independente de fontes.

## Paleta oficial proposta

| Papel | Código HEX |
|---|---|
| Fundo profundo | `#0B1522` |
| Superfície de cartão | `#132333` |
| Primária / conexão | `#65DCC7` |
| Secundária / evidência | `#87B9F9` |
| Texto principal em fundo escuro | `#EAF3F6` |
| Texto secundário em fundo escuro | `#AABEC7` |
| Divisórias | `#2B4050` |
| Papel / modo claro futuro | `#F5F8F7` |

**Contrastes matematicamente calculados** (WCAG, aproximações): texto principal / fundo = 16,29:1; texto secundário / fundo = 9,52:1; texto escuro `#081B1C` / cor primária = 10,66:1; cor azul / fundo = 9,03:1. Os pares superam 4,5:1, mas isso **não atesta WCAG 2.2 AA no produto**. Não combinar texto branco pequeno com a cor primária clara.

## Tipografia, formas e iconografia

- Tipografia: **Inter**, fallback `ui-sans-serif, system-ui, sans-serif`.
- Peso 400 para leitura; 500 para controles; 600 para subtítulos; 700 para headings.
- Cantos arredondados moderados, divisórias discretas, uso generoso de espaçamento e leitura longitudinal sem excesso de estímulos.
- Evitar gradientes exagerados, efeitos neon, ilustrações infantis, metáforas de IA onipotente e qualquer imagem que infira diagnóstico automatizado.
- Preferir ícones lineares com rótulos claros em português. A cor não deve ser o único sinal de status.

## Aplicações e limites

Preferir marca nominativa **AELO** com símbolo em login, navegação e documentos. O ícone isolado cabe em favicon e aplicativo. Preservar espaço livre equivalente à espessura do traço do símbolo. Nunca esticar, rotacionar ou alterar seletivamente suas cores.

Em mockups clínicos, apresentar apenas dados **sintéticos**, rotular como conceito e distinguir informação documentada de relações sugeridas para revisão humana.

Esta PR não altera requisitos clínicos, fluxos de autorização, segurança, API ou motor de IA. Não libera G0 nem certifica o produto para operação real.

### Verificação a realizar no projeto

```bash
cd Frontend
npm ci
npm run lint
npm run test
npm run build
```

Revisão visual responsiva e WCAG continuam pendentes em ambiente real. O mockup do kit externo é **estudo de identidade, não captura da interface implementada**.
