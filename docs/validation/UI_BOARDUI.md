# UI-01 — Integração dos componentes BoardUI

Estado: **EM REVISÃO**. Solicitação explícita de atualização visual em 06/11/2026. Base: `cf8fb9a`; branch: `feat/boardui-interface`.

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

Antes de mesclar, executar `npm.cmd run dev`, conferir login, pacientes, agenda, auditoria e editor em desktop/móvel, incluindo foco visível, busca, diálogos e estados de erro/carregamento. O PR #14 de identidade visual também altera o login: conciliar sua marca com os estilos desta branch durante a revisão.

O escopo não inclui back-end, dados, autorização, assinatura, inferência ou indexação. Continuam pendentes os critérios de G0 descritos no registro. Nenhuma afirmação de conformidade clínica ou jurídica decorre desta integração.
