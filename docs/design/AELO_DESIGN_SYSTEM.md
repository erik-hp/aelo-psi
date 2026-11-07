# Design system AELO: Continuidade

**Estado:** em revisão. É uma camada própria sobre o BoardUI: os componentes continuam usando tokens semânticos, e `Frontend/src/styles/aelo-tokens.css` define o que esses tokens significam no produto.

**Nada aqui foi testado com usuários.** O contraste é verificado por teste automático, mas isso não comprova conformidade com a WCAG, nem uso em navegador real ou leitor de tela.

## Ideia central

Cada sessão continua a anterior. O sistema separa duas vozes: a do registro clínico e a da ferramenta.

## Referências pesquisadas

- [NHS service manual, cores](https://service-manual.nhs.uk/design-system/styles/colour): cor nunca é o único portador de significado. O [pôster de acessibilidade](https://service-manual.nhs.uk/assets/nhs-digital-design-accessibility-poster.pdf) recomenda contraste mínimo AA.
- [OpenMRS 3](https://openmrs.atlassian.net/wiki/spaces/Archives/pages/404128143/Hacking+Healthcare+My+OpenMRS+GSoC+2025+Adventure), prontuário eletrônico aberto, construído com React e Carbon Design System: exemplo de interface clínica densa apoiada em design system.

Foram usadas como princípios. Componentes e identidade dessas organizações não foram copiados.

## Cor

| Nome | Valor | Papel |
| --- | --- | --- |
| Tinta | `#0B1522` | Texto principal no tema claro |
| Névoa | `#EDF2F1` | Fundo da aplicação no tema claro |
| Mar profundo | `#0E7269` | Ações e foco no tema claro |
| Evidência | `#2F5FA8` / `#87B9F9` | Ponto final do fio |
| Água | `#65DCC7` | Foco e fio no tema escuro |
| Noite | `#0F1D27` | Fundo da aplicação no tema escuro |

As neutras têm tom frio derivado da marca, e todas as superfícies herdam esse tom. O tema segue o sistema até a pessoa escolher outro, e a escolha fica salva no navegador. Cores de status e de gráficos continuam as do BoardUI.

## Tipografia

- **Atkinson Hyperlegible Next:** tudo o que é sistema, como navegação, formulários, tabelas e botões.
- **Source Serif 4:** somente títulos de página (`aelo-page-title`) e narrativa clínica (`aelo-record`), com até 72 caracteres por linha.

Se um texto foi escrito por uma pessoa sobre o atendimento, é serifado. Se foi escrito pelo sistema, não é. As fontes ficam no próprio site, como exige a CSP.

## Forma

A forma indica hierarquia: regiões da página têm raio de 14 px, controles de 6 a 10 px, e status é totalmente arredondado. A separação vem de borda e superfície, sem sombras de decoração.

## Fio de continuidade

A linha com ponto final do logo marca só duas coisas: a página atual e a sequência de sessões. Use `aelo-nav-link` na navegação e `aelo-thread-list` com `aelo-thread-item` nas sessões. Não use como decoração.

## O que evitar

- Cor literal em componentes. Mude o significado do token.
- Cor como único sinal: estado também precisa de texto ou ícone.
- Rótulos em caixa alta, com espaçamento largo ou unidos por ponto médio.
- Cartões idênticos para dados que cabem em uma lista.
- Animação sem ação da pessoa. A preferência de movimento reduzido sempre vale.
- Texto de interface alegando conformidade ou segurança sem evidência.

## Verificação

`npx vitest run src/styles/aelo-tokens.test.ts`, a partir de `Frontend/`, confere o contraste de texto, foco, fio e botão primário nos dois temas.
