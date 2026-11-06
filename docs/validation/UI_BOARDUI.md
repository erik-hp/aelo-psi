# UI-01 — Integração dos componentes BoardUI

Estado: **EM REVISÃO**. Solicitação explícita de atualização visual em 06/11/2026. Base: `cf8fb9a`; branch: `feat/boardui-interface`.

Implementação: commit `0a6830a`, [PR #15 em rascunho](https://github.com/erik-hp/aelo-psi/pull/15).

## Decisão e rastreabilidade

Integrar os componentes gratuitos fornecidos pelo MCP BoardUI às telas existentes. Requisitos relacionados: RNF-06 (usabilidade e acessibilidade) e RNF-08 (qualidade e evidências); verificação de regressão vinculada a F0-05. É uma manutenção visual solicitada, sem liberação de F1/F6 nem conclusão desses requisitos. G0 continua bloqueado.

React 18, Vite e TypeScript permanecem. Tailwind passa de 3 para 4, requisito dos componentes BoardUI, com PostCSS correspondente e lockfile atualizado. O `@config` conserva as classes e tokens legados durante a adoção incremental. Os estilos oficiais ficam em `src/styles/boardui.css`, `theme.css` e `typography.css`; a entrada continua `globals.css`.

## Aplicação

- Button, InputBase, TextareaBase, Chip e Skeleton oficiais instalados em `Frontend/src/components/base/`. Os adaptadores em `components/ui/` preservam as propriedades usadas nas telas.
- Referências nomeadas `buttonRef`/`inputRef` adaptam o código distribuído para React 18. Ao atualizar pelo MCP, revisar essas alterações antes de sobrescrever.
- Botões comuns usam `type="button"`; envio de formulário continua explícito com `type="submit"`. Testes verificam que ações comuns não enviam o formulário.
- Busca usa o slot de ícone do campo. Cabeçalhos, cartões e login recebem tokens semânticos e tipografia do BoardUI. Badges mantêm categorias textuais e cores distintas.
- Locale `pt-BR`, direção LTR e classe `dark` definidos na entrada. Erros do login têm associação com o campo e anúncio acessível; carregamento tem região de status.
- Não foram instalados templates com conteúdo de demonstração, componentes Pro ou funcionalidades clínicas novas.

## Evidência local

Executado em 06/11/2026, no diretório `Frontend/`:

| Comando | Resultado |
| --- | --- |
| `npm.cmd test` | 92 testes aprovados em 18 arquivos |
| `npm.cmd run lint` | 0 erros, 13 avisos (Fast Refresh, imports/variáveis e hook) |
| `npm.cmd run build` | TypeScript e Vite aprovados; avisos de comentários do Zod e chunks maiores que 500 kB |
| Instalação npm com auditoria | 451 pacotes auditados, nenhuma vulnerabilidade reportada nessa execução |

Os três testes novos verificam referências DOM no React 18, eventos de alteração, validação/foco/envio com react-hook-form, navegação por teclado e bloqueio de ações desabilitadas. A suíte existente inclui cenários de acesso protegido, falha, edição clínica e permissões; isso não substitui testes do back-end.

Não executados: inspeção visual em navegador, dimensões móveis, leitor de tela, avaliação completa de contraste ou conformidade WCAG. A consulta às superfícies de automação retornou nenhum navegador conectado. A suíte DOM não prova aparência nem comportamento completo do navegador.

## Revisão e próximo item

### Revisão de todas as páginas — 06/11/2026

Continuação solicitada de UI-01 no PR #15. Revisão do código e teste de renderização das 14 páginas, incluindo os componentes de layout e os blocos internos compartilhados:

Entrega: commit `39792be`, na mesma branch e PR.

| Página | Revisão aplicada |
| --- | --- |
| Dashboard | Tokens, tipografia, ações de navegação BoardUI e colunas redimensionáveis |
| Pacientes | Busca, filtros, cartões, carregamento e erro distintos de lista vazia |
| Perfil do paciente | Abas oficiais com teclado, adaptação em grade, ações e textos com quebra de linha |
| Agenda | Busca, filtros, calendário com rolagem local, ações e diálogo oficial de agendamento |
| Editor narrativo | Tipografia, superfícies e feedback de processamento |
| Financeiro | Tabela oficial, métricas e estado explícito de módulo indisponível |
| Auditoria | Busca, filtros, tabela oficial e diálogo de inspeção |
| Usuários | Tabela oficial; demonstração identificada e removida da apresentação em modo API |
| Configurações | Cartões, tipografia e superfícies compartilhadas |
| Login | Cores e superfícies consistentes com o restante da aplicação |
| Página não encontrada | Tipografia e ação de retorno com o mesmo botão de navegação |
| Sessões (legada) | Componentes compartilhados e estados de carregamento/falha |
| IA assistiva (legada) | Componentes compartilhados e estados de carregamento/falha |
| Longitudinal (legada) | Filtros, gráficos e estado sem paciente disponível |

As rotas de sessões, IA e longitudinal continuam redirecionando conforme `AppRoutes.tsx`; suas páginas existentes foram revisadas e renderizadas isoladamente nos testes, sem reativar rotas.

O shell recebe largura máxima, trilhas de grid que podem encolher, link para pular a navegação e estado expandido do menu. A navegação móvel fechada usa `display: none` abaixo de `lg`, evitando que seus links permaneçam apenas deslocados para fora da tela. Textos secundários escuros recebem tokens mais claros; isso não é comprovação de conformidade de contraste de toda a interface.

Diálogos usam o Modal oficial (foco contido, Escape, restauração de foco e rolagem interna). Tabelas usam os primitivos oficiais. Select mantém o contrato nativo necessário aos formulários e filtros, estendendo o shell `inputFieldClassName` do BoardUI. As abas em grade usam superfície selecionada, sem o indicador horizontal de linha única. Esses ajustes locais devem ser preservados em atualizações pelo MCP.

Markdown e listas de evidências usam rolagem com ScrollFade. Gráficos usam tokens de tema; grafo e legenda compartilham tokens categóricos explícitos. Toasts ficam acima dos diálogos. Não foram alterados endpoints, autorização, algoritmos clínicos, dados persistidos ou os redirecionamentos existentes.

Verificação adicional: 14 testes de renderização com fixtures sintéticas e dois testes de teclado (abas/painéis; foco e Escape do modal). O ambiente DOM ganhou polyfills de `CSS.escape` e `ResizeObserver`, usados apenas nos testes. A execução integrada aprovou **108 testes em 20 arquivos**. Lint: 0 erros e 13 avisos. Build aprovado; continuam os avisos de comentários Zod e chunks grandes.

**Limite de evidência:** a tentativa de abrir `iab` retornou `Browser is not available: iab`. Não houve inspeção visual real em desktop/móvel, zoom, leitor de tela ou medição completa de contraste. Os testes DOM e a revisão de breakpoints não equivalem a screenshots nem a certificação WCAG. Permanece **EM REVISÃO** até a conferência visual.

Antes de mesclar, executar `npm.cmd run dev`, conferir login, pacientes, agenda, auditoria e editor em desktop/móvel, incluindo foco visível, busca, diálogos e estados de erro/carregamento. O PR #14 de identidade visual também altera o login: conciliar sua marca com os estilos desta branch durante a revisão.

O escopo não inclui back-end, dados, autorização, assinatura, inferência ou indexação. Continuam pendentes os critérios de G0 descritos no registro. Nenhuma afirmação de conformidade clínica ou jurídica decorre desta integração.
