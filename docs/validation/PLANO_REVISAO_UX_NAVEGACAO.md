# Revisão de navegação, estrutura e clareza operacional

**06/11/2026 — planejamento e pesquisa inicial; EM REVISÃO.** Complementa o [plano operacional](../PLANO_OPERACIONAL_CLINICA.md), OP-01/OP-06/OP-10, F1-06 e F6-01/F6-05; RNF-06/RNF-08. Nenhum gate foi liberado.

## Problema e alcance

O autor relata que ainda existem telas difíceis de navegar, com estrutura insuficiente para localizar informações e tomar decisões operacionais de forma clara. **A padronização BoardUI e os testes de renderização não encerraram a avaliação de usabilidade. Será necessária uma análise específica de todas as telas e das transições entre elas**, incluindo menu, contexto de paciente/sessão, filtros, retorno e próximas ações.

Nesta rodada houve leitura de código e pesquisa de referências oficiais de interfaces. Não houve teste observado com usuários ou inspeção visual em navegador; não atribuir conclusões quantitativas, gravidade comprovada ou melhoria de produtividade. Hipóteses abaixo precisam de reprodução e evidência. Decisão operacional significa, por exemplo, saber qual atendimento vem a seguir, qual registro falta e qual ação está disponível; não significa automatizar decisão clínica.

## Evidência inicial e perguntas de investigação

| Área / código consultado | Observação estática ou relato | O que avaliar antes de redesenhar |
| --- | --- | --- |
| Shell: `Sidebar.tsx`, `Header.tsx`, `AppRoutes.tsx` | Menu por áreas e permissões, atalhos contextuais e redirecionamentos legados coexistem. | O usuário entende onde está e para onde cada ação leva? Rótulos/menu correspondem às tarefas por papel? Há ida e volta previsíveis em desktop/mobile? |
| Dashboard: `DashboardPage.tsx` | Vários blocos, métricas, cartões e atalhos na mesma página. | O que precisa estar primeiro por papel? Quais blocos ajudam a agir e quais competem por atenção? Métricas mostram fonte, período e estado? |
| Pacientes/perfil: `PatientsPage.tsx`, `PatientProfilePage.tsx` | Lista, perfil, sessões, análises e cofre distribuídos entre página e abas. | Como distinguir identificação, situação administrativa, sessão, nota e material restrito? Encontrar o registro certo exige alternâncias ou rolagem desnecessárias? |
| Agenda: `AgendaPage.tsx` | Calendário/lista, filtros e ações de atendimento no mesmo domínio. | É claro qual dia/profissional/filtro está ativo, qual horário está livre e se ação é remarcar, concluir sessão ou abrir nota? |
| Editor: `ClinicalEditorPage.tsx` e editor de sessão | Seletores de paciente/sessão e estado salvo/não salvo. | A identidade e a sessão permanecem inequívocas? Retorno preserva contexto? Avisos protegem o trabalho sem bloquear indevidamente a navegação? |
| Gestão: financeiro/equipe/configurações/auditoria | Integrações têm maturidades diferentes; algumas telas são consulta ou indisponíveis no modo API. | O menu diferencia funcionalidade disponível, leitura, sem permissão e futura? Não apresentar ausência de integração como zero ou sucesso. |
| Componentes e estados | Já houve correção de opções ilegíveis no Select; existe biblioteca compartilhada. | Contraste, foco, alvos, tabelas, menus, diálogos, teclado e feedback funcionam em todos os temas e tamanhos relevantes? |

Não antecipar solução para todo problema como mais cards, mais abas ou novo menu. Registrar sintoma, tarefa, papel, frequência/contexto, consequência e reprodução antes de escolher padrão.

## Referências de frontends e padrões pesquisados

Pesquisa inicial em 06/11/2026. São referências para comparar soluções, não novos frameworks a instalar. Manter React/Vite/TypeScript, Tailwind e componentes BoardUI; adaptar padrões compatíveis, respeitando licença/autoria. Exemplos de serviços públicos estrangeiros não transferem regras clínicas brasileiras ao AELO.

| Referência primária e exemplo | Contribuição documentada | Hipótese de aplicação no AELO e limite |
| --- | --- | --- |
| [GOV.UK — Service navigation](https://design-system.service.gov.uk/components/service-navigation/) | Navegação de serviço e identificação do contexto atual. | Menu principal coerente, item ativo e versão móvel; não copiar sua estrutura institucional sem teste. |
| [GOV.UK — Summary list](https://design-system.service.gov.uk/components/summary-list/) | Resumo de informações em pares, com ações associadas. | Identificação/dados administrativos do paciente e conferência antes de confirmar mudanças; não condensar narrativa clínica em tabela artificial. |
| [GOV.UK — Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) | Mostrar tarefas, ordem e conclusão de uma transação. | Pendências reais por atendimento; não inventar status nem impor sequência a tarefas independentes. |
| [NHS — Hub page](https://service-manual.nhs.uk/design-system/patterns/hub-page) e [catálogo de padrões](https://service-manual.nhs.uk/design-system/patterns) | Páginas de acesso a conteúdo e distinção entre padrões de tarefa/página. | Acesso organizado por objetivo e papel; avaliar se links diretos superam um painel cheio de cartões. |
| [IBM Carbon — Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Diretrizes para dados tabulares, toolbar, ordenação e ações. | Pacientes, auditoria e financeiro com busca/filtros claros e detalhes progressivos; ações em lote só quando autorizadas e apropriadas. |
| [USWDS — Complete a complex form](https://designsystem.digital.gov/patterns/complete-a-complex-form/) | Padrões para jornadas de formulários complexos. | Cadastro/contrato em etapas quando fizer sentido, revisão de respostas e recuperação de erros; não fragmentar formulários curtos sem necessidade. |
| [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) e [navegação consistente](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) | Critérios verificáveis de acessibilidade e previsibilidade da navegação. | Critérios A/AA pertinentes: contraste, teclado, foco visível/não oculto, rótulos, erros, alvos e status. Não tratar 2.4.13 (AAA) como exigência AA. |

Essa consulta documental não equivale a um benchmark concluído de produtos ou testes dos exemplos em navegador. A próxima etapa deverá abrir e comparar as demonstrações dessas famílias de frontends com as mesmas tarefas aplicáveis, em temas/tamanhos definidos. Acrescentar produtos de gestão clínica com demonstração pública autorizada se trouxerem evidência útil; registrar limitações de acesso e evitar coletar dados de pacientes.

## Método de avaliação e artefatos

1. **Inventário:** listar todas as rotas reais, páginas legadas/redirecionadas, componentes comuns e estados por papel; separar API/demo e funcionalidades disponíveis/futuras. Vincular cada rota a tarefa, dado, ação e permissão. Não depender só do que aparece no menu de um usuário.
2. **Roteiro por tarefa:** entrada, objetivo, informação necessária, caminho esperado, ações alternativas e resultado observável. Começar por cadastrar paciente, achar agendamento, remarcar, abrir a nota da sessão correta, identificar se foi salva/assinada, voltar sem perder contexto e localizar pendência. Acrescentar baixa/estorno quando o financeiro existir.
3. **Linha de base no navegador:** capturas sintéticas, gravação de passos quando autorizada, teclado, foco, menus, Back/Forward, refresh e link direto. Incluir leitura longa, lista vazia, falha de API, carregamento, usuário sem permissão e viewport pequeno. O DOM não comprova a legibilidade do menu nativo.
4. **Pesquisa comparativa:** ficha por referência: URL/data/versão, tarefa/público, padrão e fluxo, pontos fortes/fracos, acessibilidade observada, compatibilidade, custo de adaptação e motivo para adotar/descartar. Comparar comportamento, não só screenshots. Não afirmar teste de uso com base em leitura de artigo.
5. **Arquitetura de informação:** mapa de conteúdo e navegação atual/proposto, rótulos e agrupamento por tarefa. Testar encontrabilidade com tarefas de árvore/protótipo; distinguir falha de organização de falha visual.
6. **Protótipos:** wireframes de shell, página inicial por papel, lista/detalhe e contexto paciente/sessão. Explicitar dado primário, ações e estados. Rever com autor/profissional antes de modificar fluxos clínicos; conteúdo sintético e sem inferências automáticas.
7. **Verificação:** teste comparável antes/depois, tarefas observadas e feedback; piloto sintético antes de participantes e exigências éticas aplicáveis. Se usar SUS/UMUX-Lite, seguir F6 e não inventar amostra/resultados.
8. **Implementação incremental:** uma jornada/componente por PR, com revisão de acesso, testes pertinentes e documentação. Manter URLs antigas por redirecionamento quando necessário. Não introduzir novo kit visual ou reescrever todas as páginas de uma vez.

Ficha de achado: `UX-ID | rota/papel/estado | tarefa | sintoma/evidência | impacto | hipótese causal | referência/padrão | proposta | teste de aceite | responsável | PR | resultado/limite`.

Severidade proposta: bloqueia tarefa, induz erro/perda de contexto, causa esforço recuperável ou problema cosmético. Classificar por impacto reproduzido, não pelo número de componentes alterados. Medir sucesso, erro, abandono, retorno indevido, ajuda necessária e tempo observado; registrar baseline primeiro e definir metas antes da intervenção. Contagem de cliques é evidência auxiliar, não objetivo isolado.

## Diretrizes candidatas a validar

- Navegação global estável por tarefa/papel; identificação clara da página, item ativo e retorno previsível. Breadcrumb quando houver hierarquia real, sem substituir o menu ou criar caminhos falsos.
- No contexto clínico, paciente e sessão persistentes e inequívocos. Links contextuais preservam seleção; filtros/abas relevantes recuperáveis pela URL ou estado definido, sem conteúdo clínico em URL.
- Hierarquia: título e contexto, informação necessária para a próxima ação, dados de suporte e histórico. Ação primária identificável; ações destrutivas ou assinatura com consequência explícita. Quantidade de informação baseada na tarefa.
- Separar estado do atendimento, estado da nota, recebimento e análise assistiva. Fonte/período dos indicadores visíveis; não usar alertas visuais de risco inferido ou métricas fictícias para orientar o trabalho.
- Padrões compartilhados para cabeçalho, filtro, lista/detalhe, resumo, seletor, abas, tabela, formulário, carregamento, erro e vazio. Revisar componentes existentes antes de criar novos.
- Dados administrativos mínimos por papel, inclusive em dashboards, badges, busca e exportação. Tornar o frontend mais legível não amplia autorização clínica.

## Backlog e aceite

| ID local | Entrega | Aceite/evidência |
| --- | --- | --- |
| UX-01 | Inventário + linha de base de todas as telas e transições | Lista de rotas/papéis/estados, tarefas e achados reproduzíveis; limitações explícitas. |
| UX-02 | Benchmark das referências e mapa de navegação | Fichas comparáveis e escolhas justificadas; padrões rejeitados também documentados. |
| UX-03 | Protótipos de navegação e lista/detalhe/contexto | Roteiros executáveis e revisão registrada; sem telas indisponíveis fingindo operação. |
| UX-04 | Melhorias em shell→pacientes→agenda→editor | PRs pequenos com teste de sucesso/falha/negação/regressão, teclado/Back/refresh e preservação do trabalho. |
| UX-05 | Homologação de clareza e acessibilidade | Evidências antes/depois; A/AA pertinentes conferidos automatizada e manualmente, sem declarar WCAG integral por uma única ferramenta. |

Esses IDs refinam F1-06/F6 e OP-10, sem renumerar o Plano Mestre ou liberar gates. Análise imediata recomendada: UX-01, junto do levantamento de permissões OP-01. Não esperar o marco de segurança de 80% para investigar usabilidade ou corrigir falhas conhecidas.

**Situação:** problema relatado formalizado; inspeção estática e pesquisa documental inicial realizadas. Auditoria visual, benchmark prático, protótipos, testes com usuários e redesign ainda não executados nesta rodada.
