# Identidade visual AELO

**Estado:** proposta de 22/11/2026, derivada do logo do design system "Abrigo". Nada aqui foi testado com usuários, e o logo não passou por pesquisa de registro de marca (INPI). Antes de usar fora do TCC, verificar se já existe marca "AELO" registrada na classe de software e serviços de saúde.

Arquivos: `docs/design/identidade/assets/` (SVG) e `docs/design/identidade/png/` (exportações). Página navegável da identidade: artefato "Identidade visual AELO" (Design).

## Ideia

Um consultório, não um hospital. O símbolo é um **arco**: a porta que se atravessa para entrar na sessão. Dentro dele, um **ponto de argila**, a luz que fica acesa no limiar.

Regra que sustenta o resto: **um ponto por composição**. O ponto é a única cor quente de qualquer peça. Se houver dois, nenhum vale.

## Símbolo

Construído numa grade de 40 unidades:

| Parte | Medida |
| --- | --- |
| Arco externo | largura 22, raio 11, base na linha 32 |
| Vão (arco interno) | largura 9, raio 4,5 |
| Ponto | raio 2,3, centrado, 4,8 acima da base |
| Tile (ícone do app) | 40 × 40, raio de canto 11 |

Variações, todas em `assets/`:

| Arquivo | Uso |
| --- | --- |
| `aelo-simbolo-tile.svg` | Ícone do app, favicon, avatar |
| `aelo-arco.svg` | Sobre papel ou fundo claro, com ponto de argila |
| `aelo-arco-claro.svg` | Sobre oliva ou fundos escuros |
| `aelo-arco-oliva-mono.svg`, `aelo-arco-tinta.svg`, `aelo-arco-branco-mono.svg` | Uma cor só: carimbo, fax, impressão P&B, gravação |

O vão é recorte real (máscara), não um arco pintado na cor do fundo. Por isso o arco funciona sobre foto ou textura.

## Assinatura (logo + nome)

O nome **AELO** é desenhado em Fraunces (peso 540), com as letras convertidas em curvas: o arquivo não depende de fonte instalada. O espaçamento entre letras é +3,5%. O descritor **Memória clínica assistiva** usa Atkinson Hyperlegible Next.

| Arquivo | Uso |
| --- | --- |
| `aelo-horizontal*.svg` | Padrão: cabeçalhos, rodapés, e-mail |
| `aelo-vertical*.svg` | Capas, apresentações, espaços quadrados |
| `aelo-wordmark*.svg` | Só o nome, quando o arco já aparece em outro lugar da peça |
| sufixo `-descritor` | Primeira aparição numa peça. Em tamanho pequeno, sem descritor |
| sufixo `-claro` | Fundos oliva ou escuros |
| sufixo `-tinta` | Uma cor, para impressão |

**Área de proteção:** a largura do vão (9 unidades do símbolo) em todos os lados. Nada entra nessa área.

**Tamanho mínimo:** símbolo 16 px (favicon, o ponto vira só um sinal de cor), assinatura horizontal 96 px de largura, com descritor 160 px. Abaixo disso, usar só o arco.

## Cor

| Nome | Hex | Papel |
| --- | --- | --- |
| Oliva | `#35523F` | Cor da marca, ação principal |
| Papel | `#FAF5EC` | Fundo |
| Linho | `#F1E9DB` | Superfície rebaixada |
| Tinta | `#2A2018` | Texto e versão de uma cor |
| Argila | `#A4482B` (sobre claro), `#E8A27C` (sobre escuro) | Só o ponto e acentos pequenos |
| Sálvia | `#A9CBA0` | Oliva no tema escuro |

Proporção de uma peça: papel ou linho cerca de 65%, oliva e tinta cerca de 30%, argila menos de 5%. Argila nunca é botão principal, nunca é fundo grande e nunca é o único sinal de estado.

Pares de texto e controles seguem o contraste medido em `AELO_DESIGN_SYSTEM_ABRIGO.md`.

## Tipografia

| Uso | Fonte |
| --- | --- |
| Nome, títulos, números grandes | Fraunces |
| Interface e texto corrido | Atkinson Hyperlegible Next |
| Registro clínico e citações | Source Serif 4 |

Todas com licença livre (OFL) e hospedadas no próprio site.

## Padrão "arcada"

`aelo-padrao-arcada.svg` e `aelo-padrao-arcada-oliva.svg`: fileiras alternadas de arcos em tom sobre tom, com **um** ponto de argila dentro de um vão. Serve de fundo de capa, apresentação e login. Fica discreto: contraste baixo de propósito, nunca atrás de texto corrido.

## Voz

Calma, direta, honesta sobre limites. Frases curtas, verbos ativos, português do Brasil, sem jargão de TI.

- Diz o que aconteceu e o que fazer: "A nota foi salva. A análise ainda não foi pedida."
- Não promete o que não comprovou: nada de "100% seguro", "totalmente conforme" ou "inteligência clínica".
- A IA é "sugestão", sempre sob revisão da pessoa profissional.
- Não infantiliza nem dramatiza: sem "Ops!", sem exclamação em erro.

## O que não fazer

1. Não girar, inclinar, esticar nem contornar o arco.
2. Não trocar a cor do ponto, nem usar mais de um ponto.
3. Não pôr o arco colorido (com ponto) sobre fundo que reduza o contraste do ponto abaixo de 3:1. Nesse caso, usar uma versão de uma cor.
4. Não recriar o nome em outra fonte.
5. Não usar o logo como ícone de estado ou de "IA". O arco é a marca, não um botão.
6. Não aplicar sombra, brilho nem degradê.

## Aplicações previstas

Ícone e favicon (feitos), avatar, cabeçalho de relatório e de documento exportado, assinatura de e-mail, capa de apresentação do TCC, tela de login (feita). Detalhes visuais no artefato.

## Limites

- Marca não pesquisada no INPI.
- Peso 540 e espaçamento de +3,5% do nome foram escolhidos a olho e conferidos em tela, não em impressão.
- O favicon de 16 px é legível no arco; o ponto some. Aceito como limite.
- Sem versão animada e sem manual de aplicação para impresso (papel, cartão): os mockups do artefato são ilustrativos.
