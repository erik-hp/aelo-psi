# Auditoria funcional — 06/11/2026

**Estado: EM REVISÃO.** Branch `fix/auditoria-fluxos-operacionais`, base `e53ed94` de `feat/boardui-interface` (PR #15). Solicitação: investigar cadastro ausente, editor invisível e demais fluxos incompletos. Trabalho de diagnóstico/regressão F0-01/F0-02/F0-03/F0-05, com correções parciais relacionadas a F1-01/F1-02/F1-03/F1-06. Requisitos: RF-01–RF-04, RNF-02/RNF-03/RNF-06/RNF-08. **G0 continua BLOQUEADO**; esta entrega não libera fases ou uso com dados reais.

## Método e alcance

Inspeção de rotas, componentes, serviços, permissões, serializers e testes; regressão DOM das páginas; integração dos novos fluxos com serviços HTTP do frontend em ambiente de teste; chamadas HTTP reais contra Django/PostgreSQL locais com dados sintéticos. O inventário de layout anterior cobre as 14 páginas existentes em [UI_BOARDUI.md](UI_BOARDUI.md).

Não houve inspeção visual em navegador: a superfície disponível retornou `Browser is not available: iab`. Responsividade real, contraste, leitor de tela e tarefas com usuários continuam pendentes. Não foram validados produção, disponibilidade do worker/Ollama, qualidade clínica de IA ou todos os cenários concorrentes. As evidências abaixo têm esses limites.

## Achados e soluções

| ID | Prioridade | Erro/causa observada | Solução aplicada e evidência |
| --- | --- | --- | --- |
| AF-01 | Alta | Pacientes não oferecia cadastro no modo API. | Botão **Adicionar paciente** para profissional autorizado, formulário de nome/código, POST real, estado pendente e erro sem perder os campos. Lista e dashboard invalidados após sucesso. Testes de sucesso, falha e papel sem escrita. |
| AF-02 | Alta | Código de paciente duplicado podia atingir a restrição do banco sem validação amigável. | Validação do código por clínica com HTTP 400; criação de paciente e grant inicial em transação. Testados duplicado na mesma clínica e código igual em outra clínica. A corrida entre duas requisições simultâneas ainda exige tratamento específico. |
| AF-03 | Alta | Editor em modo API renderizava apenas cabeçalho. | Editor funcional com paciente, sessão do próprio profissional e grant explícito de edição. Nota começa vazia ou carrega o texto original autorizado. Estados de carregamento, ausência de dados, falha e leitura restrita. Testes de salvamento, recarga, negação e retenção do texto. |
| AF-04 | Alta | Registro narrativo estava acoplado à solicitação de IA; texto anonimizado podia aparecer como original. | Salvamento explícito de nota via POST/PATCH, independente da IA; leitura de `raw_text` autorizado. IA opcional usa a nota já salva, prévia para revisão e confirmação; fila/falha explícitas, sem criar outra nota nem inventar resultado. Worker/Ollama integral não executado nesta auditoria. |
| AF-05 | Alta | Agenda criava registros apenas em memória, com identificadores de paciente fabricados. | No modo API, seleção de paciente existente e POST real de sessão; alterações persistidas e listas invalidadas. Dados demonstrativos permanecem identificados e separados do modo API. Teste DOM e HTTP real. |
| AF-06 | Alta | Mudanças locais de status sugeriam conclusão/assinatura sem persistência. | PATCH dos estados aceitos pelo servidor: concluído, cancelado e ausência. Concluir atendimento não assina nota; removidas ações fictícias no modo API. Smoke real confirma `locked_at` vazio após conclusão da sessão. |
| AF-07 | Média | Mesmo profissional podia reservar duas sessões no mesmo instante sem validação de formulário/API. | Serializer rejeita horário exato ocupado com HTTP 400 e permite reutilizar cancelado/ausência. Não implementa intervalos de duração, bloqueio concorrente no banco ou fluxo completo de remarcação. |
| AF-08 | Alta | Edição de nota não detectava versão desatualizada. | Novo editor envia `expected_version`; servidor compara sob bloqueio e retorna HTTP 409, preservando versão e texto atuais. Testado em unidade e HTTP real. Campo opcional mantém compatibilidade com clientes antigos; esses clientes ainda precisam adotá-lo. Interface conserva o texto em conflito, sem mesclagem automática. |
| AF-09 | Média | Listagens consumiam apenas a primeira página da API. | Helper percorre páginas preservando endpoint/filtros originais, rejeita ciclos e nunca usa domínio recebido em `next` para enviar autorização. Aplicado a pacientes, sessões, análises, notas, auditoria e equipe. Três testes de paginação. |
| AF-10 | Alta | Cache clínico podia sobreviver à troca de identidade na mesma aplicação. | Cancelamento e limpeza do QueryClient em login, logout, expiração e mudança de sessão entre abas. Logout preserva autorização da própria requisição antes de limpar credenciais locais. Testes do ciclo de autenticação. |
| AF-11 | Média | Busca global não executava consulta; paginação visual alegava página única. | Enter na busca navega para pacientes com filtro em URL; escopo da busca explicitamente limitado a pacientes. Contagem real substitui paginação fictícia. |
| AF-12 | Média | Notificações e preferências sugeriam operações ainda indisponíveis. | Notificações desabilitadas com motivo; configurações identificadas como consulta e modo atual, sem promessa de edição ou afirmação fixa de API pronta. Integração operacional continua pendente. |
| AF-13 | Alta | Métrica ausente virava relevância zero; dashboard sugeria avaliação automática de risco/segurança. | Relevância ausente/inválida é `null`, exibida como indisponível; zero explícito preservado. No modo API, retiradas alegações de risco automático e substituídas por contagens registradas. Quatro testes do mapeamento; gráficos longitudinais sem fonte permanecem explicitamente indisponíveis. |
| AF-14 | Média | Revisão de análises não estava exposta adequadamente no perfil; cofre confundia erro com vazio. | Cards reais de análise disponíveis no perfil, invalidação das consultas após revisão; cofre com estados de erro/carregamento e falha de download tratada. Sem alegar validação da inferência completa. |
| AF-15 | Média | Equipe em modo API não mostrava a listagem existente; permissões de admin sugeriam escrita clínica indevida. | Diretório administrativo real via GET autorizado, somente leitura. Removidas permissões de sessões/revisão clínica implícitas de admin; editor exige escrita de notas. Estagiário sem escrita; autorização do servidor preservada. Criação/edição de contas pela UI continua pendente. |
| AF-16 | Média | Data/hora de ISO UTC era recortada e podia divergir do horário informado. | Envio de data local convertido para ISO e leitura no fuso do navegador, declarado na agenda. Data corrente também usa calendário local. Não foi criada configuração de fuso por clínica. |
| AF-17 | Média | Textos afirmavam conformidade jurídica/imutabilidade sem evidência suficiente. | Descrições das telas revistas para funcionalidades observáveis; auditoria e assinatura não prometem conformidade legal automática. Nenhuma avaliação jurídico-normativa foi realizada ou alegada. |

## Inventário de telas e limites

| Tela/rota | Resultado desta rodada |
| --- | --- |
| Login | Regressão de autenticação e limpeza do cache; acesso local sintético já restabelecido. |
| Dashboard | Dados autorizados, agenda real, erros explícitos e indicadores sem classificação automática de risco no modo API. Atalhos continuam sujeitos às permissões da rota. |
| Pacientes | Cadastro real, filtro pela URL, listagem completa e erros. |
| Perfil do paciente | Sessões ligam ao editor; notas originais autorizadas, revisão de análises e estados do cofre. |
| Agenda | Agendamento/status persistidos, paciente real, horário local e estados de falha. |
| Editor Clínico | Nova tela operacional em modo API; seleção de paciente/sessão/grant e salvamento independente da IA. |
| Auditoria | Listagem paginada completa; linguagem de controle técnico sem certificação presumida. |
| Usuários | Diretório administrativo real; operações de gestão pela interface ainda pendentes. |
| Configurações | Consulta honesta do modo/estado; preferências editáveis não implementadas. |
| Financeiro | Sem contrato de backend; indisponibilidade explícita no modo API. Não preenchido com valores fictícios. |
| Sessões/Análises/Longitudinal legados | Mantidos os redirecionamentos e restrições existentes; não reativados como novas funcionalidades. |
| Página não encontrada | Mantida e incluída na regressão de renderização. |

## Contratos utilizados

Sem migração de schema ou mudança de stack. POST `/patients/` usa nome/código e grant definido pelo servidor; POST `/sessions/` exige paciente autorizado; PATCH `/sessions/{id}/` persiste status. GET `/clinical-notes/` preserva filtros paciente/sessão; POST e PATCH de notas persistem fonte original e versão. PATCH aceita `expected_version` e pode retornar 409. A solicitação `/analysis/request/` reutiliza ID de nota salva; prévia requer revisão e fila tem estado explícito. GET `/users/` permanece administrativo e restrito à clínica. Frontend não substitui autorização do backend.

## Verificações executadas

| Comando/ambiente | Resultado observado |
| --- | --- |
| `Frontend: npm.cmd test -- --run` | **132 testes aprovados, 24 arquivos**, incluindo sete cenários novos dos fluxos operacionais. |
| `Frontend: npm.cmd run build` | Aprovado (TypeScript/Vite); avisos existentes de anotação Zod e chunks acima de 500 kB. |
| `Frontend: npm.cmd run lint` | **0 erros, 11 avisos** de Fast Refresh/imports não usados. |
| `Backend: .venv/Scripts/python.exe -m pytest -q` | **59 aprovados, 2 ignorados, 1 aviso**. Casos específicos PostgreSQL/pgvector não executados na suíte SQLite. |
| `Backend: .venv/Scripts/python.exe -m ruff check` nos sete arquivos Python alterados/adicionados | Sem erros. |
| `docker compose config --quiet` e `docker compose up -d --no-deps --build api` | Configuração válida; API local reconstruída e iniciada. |
| API local: `python manage.py check` e `python manage.py makemigrations --check --dry-run` | Sem problemas; nenhuma migração nova. |
| `Backend/tests/live_operational_smoke.py` via `manage.py shell` no container local | **LIVE_OPERATIONAL_SMOKE_OK**: paciente/sessão/nota persistidos; duplicado de código/horário 400; versão antiga 409; anônimo 401 e outro profissional 404; conclusão não assinou a nota. |

O smoke exige DEBUG e conta local sintética não administrativa. Usa token somente em memória e não imprime textos/credenciais. Um paciente explicitamente sintético de auditoria e seus registros foram preservados no banco local para inspeção. Esse resultado não substitui o CI remoto ou a suíte adversarial completa.

## Uso e pendências

Fluxo disponível: **Pacientes → Adicionar paciente → Agenda → selecionar paciente e agendar → Abrir editor → Salvar nota**. O editor também permite selecionar paciente e sessão diretamente. Salvar a nota não solicita IA nem assina o documento. Alterações pendentes bloqueiam troca dos seletores; links e fechamento da aba têm aviso de descarte.

Continuam pendentes: inspeção manual de todas as telas e acessibilidade; notificações; financeiro; preferências editáveis; gestão completa de contas; remarcação e sobreposição de intervalos/concorrência de agenda; corrida de cadastro duplicado; fluxo integral de assinatura/retificação; autosave por sessão e proteção universal do botão Voltar da SPA; mesclagem visual de conflito de versões; execução worker/Ollama e avaliação de suas falhas/resultados. Não se declarou esses itens concluídos. Próxima tarefa da fase mais baixa continua a revisão F0 e seus gates conforme o Plano Mestre.
