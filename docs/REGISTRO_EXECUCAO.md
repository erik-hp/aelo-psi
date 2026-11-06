# Registro de execução e decisões — AELO-PSI (TCC2)

**Atualizado em:** 06/11/2026. **Padrão:** somente fatos verificados; este documento é o ponto de retomada de novas sessões/assistentes.

## Estado geral

- **Fase corrente:** F0 — diagnóstico e contenção de riscos.
- **Gate liberado:** nenhum gate de implementação verificado.
- **Próxima tarefa:** conciliar a pilha de PRs em rascunho #15–#19 e o PR #21, confirmando checks remotos; em seguida OP-00/UX-01. Ver a entrada "Revisão transversal F0" abaixo. G0 permanece bloqueado.
- **Referência da documentação:** [PR #1](https://github.com/erik-hp/aelo-psi/pull/1), originado da branch `feat/tcc2-foundation-security-docs`. **Confirmar o estado do PR e o commit atual da `main` no GitHub** ao retomar o trabalho; não inferir estado de merge a partir deste registro.
- **Ambiente de produção:** não avaliado; **não autorizado como pronto para dados clínicos reais**.

## Evidências já obtidas

| Referência | Observação | Tipo e limite |
| --- | --- | --- |
| Leitura de `Backend/config/settings.py` | Django/DRF/JWT/PostgreSQL; chaves e defaults de desenvolvimento exigem endurecimento | Inspeção estática, sem teste de runtime |
| `Backend/apps/patients/views.py`, `Backend/apps/clinical_notes/views.py`, `Backend/apps/therapy_sessions/views.py` | Fluxos precisam de isolamento por tenant/objeto; administradores com escopo amplo | Inspeção estática, não prova de exploração |
| `Backend/apps/clinical_notes/models.py` | Texto clínico em campo de texto, `locked_at` sem enforcement no viewset | Inspeção estática |
| `Backend/ai_service/main.py` | Fallback gerando `relevance_score` fictício; sem RAG vetorial | Inspeção estática |
| `Frontend/src/services/clinicalService.ts` | Métricas longitudinais derivadas de dados mock ou transformação artificial | Inspeção estática |
| `Backend/docker-compose.yml`, `Backend/apps/clinics/management/commands/seed_initial_data.py` | Seed iniciada pelo API container e senha fixa de exemplo; portas expostas | Inspeção estática |
| `docs/architecture/ADR-001-memoria-terapeutica-longitudinal.md` | Proposta de MTLI, eventos, fontes e revisão humana | Arquitetura *proposta*, não implementada |
| `docs/PLANO_MESTRE_IMPLEMENTACAO.md` | Sequência F0–F7, gates e testes | Plano documentado, ainda não executado |

## Execuções verificadas

| Data | ID | Ação | Evidência | Situação |
| --- | --- | --- | --- | --- |
| 2026-10-17 | DOC-01 | Inventário estático do repositório e base do TCC | Leitura de código e documentos vinculados | CONCLUÍDO (somente documentação) |
| 2026-10-17 | DOC-02 | Redação ADR-001 MTLI | Arquivo em branch `feat/tcc2-foundation-security-docs` | EM REVISÃO |
| 2026-10-17 | DOC-03 | Plano mestre, matriz, README e instruções permanentes | [PR #1](https://github.com/erik-hp/aelo-psi/pull/1); resultado do merge verificável no GitHub | EM REVISÃO na data de abertura |
| 2026-10-17 | F0-01 | Inventariar comandos e adicionar workflow CI | `docs/validation/F0_BASELINE.md` e `.github/workflows/ci.yml`; execução pendente | EM REVISÃO |
| 2026-10-17 | F0-02 | Corrigir consultas com privilégios amplos | Política `apps/patients/access.py` e testes em branch; revisão e execução pendentes | EM REVISÃO |
| 2026-10-17 | F0-03 | Bloquear fallback inventado de IA e gráficos fictícios em modo real | Código em branch; testes CI pendentes | EM REVISÃO |

## Modelos de entrada para trabalhos futuros

### Entrada de tarefa
- Data/branch/commit:
- ID plano e requisito(s):
- Escopo e risco (incluindo LGPD):
- Arquivos afetados:
- Testes planejados:
- Dependências e gate:

### Saída da tarefa
- PR/commit/link:
- Código e documentação alterados:
- Comandos **realmente executados**:
- Resultados e evidências (passou/falhou/não executado):
- Riscos residuais:
- Estado: NÃO INICIADO / EM ANDAMENTO / BLOQUEADO / EM REVISÃO / CONCLUÍDO:
- Gate status e próximo ID:


## Evidência de CI da primeira rodada F0

- **Commit verificado:** `cdcd2dfd997488d64d358b567f77498c0eac5d9f`.
- **GitHub Actions:** [execução #39031546521](https://github.com/erik-hp/aelo-psi/actions/runs/39031546521).
- **Resultado:** `frontend` (lint e build) **SUCESSO**; `django` (check, migrações e testes dos apps) **SUCESSO**; `ai-service` (compile e testes) **SUCESSO**.
- **Correção durante a verificação:** o primeiro job Django falhou porque a descoberta global tentou importar testes do FastAPI sem suas dependências; isolamos as suítes Django (`apps`) e FastAPI, ambas aprovadas depois.
- **Ressalva:** testes automatizados disponíveis são limitados; ainda não houve verificação de implantação Docker nem revisão independente de autorização e LGPD. O **gate G0 permanece BLOQUEADO**, principalmente por F0-04 (credenciais de seed e endurecimento de ambiente), F0-05/F0-06.
- **Após registrar esta evidência:** nova execução de CI poderá ser disparada pelo commit documental e deverá ser conferida no PR antes do merge.

## Segunda evidência de CI — F0-04 parcial e novos testes

- **Commit validado:** `757596e893a5bdc78618486f2f256c28b50486ee`.
- **GitHub Actions:** [execução #39031839343](https://github.com/erik-hp/aelo-psi/actions/runs/39031839343).
- **Resultado:** `frontend` (lint/build) **SUCESSO**; `django` (Compose config, check, migrations, testes) **SUCESSO**; `ai-service` (compilação/testes) **SUCESSO**.
- **F0-04 parcialmente atendida:** Compose não executa automaticamente seed nem expõe serviço IA/Ollama no host; arquivos de exemplo exigem alteração de credenciais locais; comando sintético não cria senhas nem usuários. Não foi feito pentest nem testes de uso com dados reais.
- **Atenção:** este registro foi atualizado após o commit indicado e dispara novo workflow; confirme os jobs no PR #2 antes de merge. **G0 continua BLOQUEADO** até revisar requisitos F0-02 a F0-06 e validar o ambiente em cenário real de deployment.

## Continuação de revisão F0 — integração interna e admin

- Rota `/admin/` desabilitada por padrão; só habilitada explicitamente com `DEBUG` e `AELO_ENABLE_DJANGO_ADMIN` no desenvolvimento.
- `AI_SERVICE_TOKEN` exigido em chamadas Django → FastAPI, verificado com comparação resistente a diferenças de tempo; uso de token separado do segredo Django.
- Proteção de segredo `DJANGO_SECRET_KEY` para execução fora de DEBUG.
- Testes unitários de ausência, configuração e correção de token adicionados ao serviço de IA.
- **Estas alterações são propostas no PR #2, não se declara liberação G0 nem conformidade jurídica.** Verificar checks do último commit do PR antes de merge.

## F0 — Auditoria minimizada e criptografia planejada (17/10/2026)

- **Auditoria (código em PR #2, ainda em revisão):** os eventos agora restringem metadados a campos explicitamente permitidos; comentários livres, textos de prontuário, caminhos de URL e cabeçalhos de IP encaminhados não confiáveis não são persistidos como metadados. Identificadores de registros, ação e ator continuam rastreáveis.
- **Leituras individuais:** ações GET de detalhe de prontuário e análise passam a registrar eventos `READ` sem texto narrativo. Listagens e exportações ainda exigem política de auditoria por finalidade; a implementação não representa auditoria completa.
- **Testes propostos:** `Backend/apps/audit_logs/tests.py` verifica minimização de metadados, confiança do IP, evento de leitura e isolamento de log entre clínicas.
- **Criptografia:** [ADR-002](architecture/ADR-002-criptografia-prontuarios.md) propõe envelope encryption, migração incremental sem perda de registros e testes obrigatórios. **Nenhuma nota foi criptografada por esta entrega**.
- **Gate:** G0 permanece bloqueado; checar resultados do CI do commit mais recente do PR #2 e auditoria dos controles ainda faltantes antes de avançar F1.

## F0-03 — Verificação adicional de fontes de IA

- Citações automáticas agora exigem que `note_id`, `session_id` e o trecho coincidam com notas autorizadas fornecidas ao modelo; resposta narrativa sem fonte é rejeitada. **Verificação de trecho não equivale à validação semântica da afirmação**: esta depende de avaliação posterior (F2).
- Falha na chamada interna de IA é traduzida para HTTP 503 sem devolver payload clínico.
- Testes unitários para trechos inventados e análises narrativas sem fontes foram adicionados.
- Aguardando o CI do último commit do PR #2; G0 permanece bloqueado e não houve merge.

## F0-02 — Revisão de privilégios e usuários (17/10/2026)

- **Falha identificada:** a API de gerenciamento de usuários anteriormente aceitava atribuição de papel `ADMIN` e fornecia visibilidade/edição a identidades administrativas da mesma clínica. Correções aplicadas à branch do [PR #2](https://github.com/erik-hp/aelo-psi/pull/2).
- **Correções:** o serializer deixa `clinic` somente leitura (associação sempre definida pelo servidor), proíbe criar/promover para `ADMIN`, exige validação de senhas e nega modificação de identidades administrativas/superusuário por essa API; a listagem de equipe exclui essas identidades.
- **Testes sintéticos:** promoção indevida, criação de admin, transferência de clínica, alteração de administrador próprio ou de outra clínica.
- **Evidência:** [CI #39035408010](https://github.com/erik-hp/aelo-psi/actions/runs/39035408010), commit `2e47a6568e80f893885a2690af9caacb8d50b94b`, três jobs aprovados (`django`, `frontend`, `ai-service`).
- **Estado:** F0-02 em revisão; governança de criação de contas privilegiadas deve ser definida fora da API; faltam auditoria independente de grants, testes de negação por endpoint/role, assinatura e governança de chaves. **Gate G0 BLOQUEADO** e PR não integrado.

## F0-02 — Concessões clínicas (17/10/2026)

- A revisão identificou concessão automática de `can_edit` ao administrador que cadastrava pacientes, ainda que a política previsse distinção entre cadastro operacional e dados clínicos.
- A criação de paciente agora concede acesso automático somente a criador com papel de psicólogo. A atribuição posterior a um psicólogo responsável segue regra explícita e é validada pelo modelo `PatientAccess` (clínica ativa, paciente não excluído, usuários ativos da mesma clínica, concedente autorizado).
- O modelo valida concessões feitas diretamente pelo ORM com `full_clean` em `save`, além da camada HTTP. Isto ainda não protege escritas com `QuerySet.update` ou SQL direto: revisar constraints e serviço transacional na F1.
- Testes de concessão entre clínicas, autoconcessão administrativa e ausência de concessão automática a administradores foram incluídos.
- **Evidência:** [CI #39036905565](https://github.com/erik-hp/aelo-psi/actions/runs/39036905565), commit `ecca5854032a51c5a7e451fe5fd4fd8ba4ecb162`, 3 jobs aprovados.
- **Pendente:** política completa de transferência de responsabilidade, revogação e auditoria de concessões; fluxo clínico de assinatura, criptografia e revisões LGPD; G0 permanece BLOQUEADO.

## F0-02 — Concessão e revogação explícitas, com histórico preservado

- **Mudança efetiva:** `accessible_patients` não concede mais acesso clínico por `created_by`; somente concessões explícitas ativas são usadas. Administradores mantêm acesso ao diretório administrativo, mas não ao conteúdo clínico.
- **Migração:** `patients.0003_backfill_creator_grants` preserva em `PatientAccess` o acesso de psicólogos criadores elegíveis antes de remover o privilégio implícito. Não remove notas nem histórico; auditar especialmente bases com grants legados inconsistentes.
- **APIs de paciente:** `GET /api/patients/{id}/access-grants/`, `POST /api/patients/{id}/grant-access/`, `POST /api/patients/{id}/revoke-access/`. Concessão inicial limitada a administrador que cadastrou o paciente designando psicólogo, ou delegação por psicólogo com concessão de edição; revogação somente por psicólogo com permissão de edição, sem deixar paciente sem psicólogo responsável.
- **Validações:** clínica e usuários ativos, papéis adequados para atribuição, limitação de estagiários a leitura e bloqueio de autoconcessão administrativa; transações e locks por paciente para alterações concorrentes.
- **Evidência de testes:** [run #39037986080](https://github.com/erik-hp/aelo-psi/actions/runs/39037986080), commit `6e0cd338401bf5ce1f7c199ed4d3884abe32fff9`, três jobs concluídos com sucesso. Mudanças posteriores a esse commit exigem nova validação.
- **Limites:** `full_clean` no modelo não protege SQL direto/`QuerySet.update`, e não há trilha de auditoria imutável ou governança de concessões histórica em tabelas próprias. Transferência formal de titularidade clínica, políticas de suspensão do paciente e segurança de scripts operacionais continuam pendentes de avaliação. G0 continua **BLOQUEADO** e PR #2 não está integrado.

## Revisão pré-merge do PR #2 — 17/10/2026

**Decisão:** integrar o PR como uma entrega incremental F0, **não** como liberação do gate G0. O escopo inclui autorização, auditoria, bootstrap de desenvolvimento, CI e documentação de criptografia; a aplicação permanece vedada a dados reais.

Ajustes finais de revisão: estagiários não podem escrever conteúdo clínico mesmo com concessões legadas `can_edit=True`; apenas administração e psicólogos cadastram pacientes; grants por ORM exigem beneficiário de papel autorizado e não superusuário; listagens de notas/análises passam a gerar eventos de auditoria de acesso. O cadastro por administrador deve atribuir o psicólogo inicial antes de qualquer acesso clínico.

**Pendências conhecidas após o merge:** completar governança de permissões (transferência, histórico de concessões, revogação sob concorrência e DB constraints/controle de privilégios SQL); prontuário assinado com retificações formalizadas; criptografia de campo e chaves conforme ADR-002; revisão de auditoria e incidentes; validação de produção, RIPD e parecer jurídico/profissional. Checks GitHub Actions são necessários, porém não equivalem a homologação clínica. O registro de gates permanece `G0 BLOQUEADO`.

**Verificação:** usar o último commit do PR no GitHub e confirmar os três jobs do workflow. Após o merge registrar commit de integração e manter estas pendências ativas.

## Ciclo F0-04 e F0-06 — configuração e dados (17/10/2026)

- **Partida:** `main` em `c2f2174c51e4ee408763cb4a4f3c33cf2bc9c0a4`, integração confirmada do [PR #2](https://github.com/erik-hp/aelo-psi/pull/2).
- **Correção posterior (06/11/2026):** os bloqueios de senha e de origem local descritos neste item foram perdidos na integração do PR #11 e restaurados na "Revisão transversal F0".
- **F0-04:** Django bloqueia credenciais padrão/fracas de PostgreSQL quando `DEBUG=False`; CORS e CSRF não têm origem HTTP local predefinida em produção; `SECURE_PROXY_SSL_HEADER` só é habilitado por configuração explícita de proxy confiável; cookies de sessão/CSRF são marcados Secure fora de DEBUG.
- **F0-04 navegador:** refresh token passa de `localStorage` para `sessionStorage` — **mitigação de persistência, não proteção contra XSS**. Sessões antigas podem exigir novo login. Migração futura para cookies HttpOnly dependerá de desenho de CSRF/CORS e testes.
- **F0-06:** [inventário inicial/RIPD rascunho](privacy/F0_DATA_MAP_RIPD_DRAFT.md), com fluxo de dados, riscos, responsáveis e decisões pendentes; não equivale a RIPD legalmente validado.
- **Validação:** CI e testes pendentes de verificação do último commit do PR associado. G0 permanece `BLOQUEADO`; não há prontuários cifrados, pentest, homologação clínica ou autorização para dados reais.

## F0 — Integridade de notas e sessões (PR em revisão, 17/10/2026)

- Restrições propostas: apenas autor altera/exclui a própria nota; apenas profissional responsável altera sessão; notas não podem ser movidas a outra sessão nem vinculadas a sessão excluída ou de outro profissional.
- Atualização de nota e histórico passa a ocorrer em transação com lock, evitando corrida de versionamento no fluxo da API. Não substitui assinatura formal nem constraints completas na camada SQL.
- Testes sintéticos em `apps/clinical_notes/tests_integrity.py`: negar edição por outro profissional, negar troca de sessão, preservar versão anterior. Executar CI e registrar resultados antes de aprovar.
- **G0 permanece BLOQUEADO** por governança de chaves, criptografia, revisão ampla de dados/segurança e demais requisitos do plano. Não usar dados reais.

## F0-04 — Ciclo de vida de conta e clínica (proposta em revisão)

- Autenticação JWT pela API passa a exigir conta ativa **e** vínculo a clínica ativa, não excluída, consultando estado atual do banco em cada request.
- Em login e refresh, a mesma condição é verificada. Suspensão da clínica ou desativação da conta passa a impedir a renovação do token; dados embutidos no JWT não substituem a autorização atual.
- Logout verifica que o token de atualização enviado pertence ao usuário autenticado antes de colocá-lo na lista de bloqueio.
- Testes sintéticos de login, suspensão, refresh, logout próprio e tentativa de bloquear token alheio foram adicionados. **A execução CI deve ser confirmada após o commit final.**
- Proteção de tokens contra XSS e encerramento de sessão em outros dispositivos permanecem pendentes. Não representa solução completa de gestão de identidade. Gate G0 bloqueado.

## F0 — Retenção de prontuários e minimização de auditoria (17/10/2026)

- A API de pacientes passa a negar DELETE, inclusive soft-delete, até existir uma política formal de retenção e eliminação aprovada. Arquivamento e alteração de status ficam limitados a administradores da clínica. Isso evita que simples ações operacionais ocultem sessões e notas.
- O registro de auditoria deixa de copiar o cabeçalho User-Agent controlado pelo cliente. O campo legado permanece vazio; a revisão de logs persistidos anteriormente é pendente.
- Testes sintéticos verificam restrições de status/retensão e ausência do cabeçalho nos logs. CI ainda precisa ser comprovado no último commit; G0 não está liberado.
- Pendências: governança de direitos dos titulares, revisão de backups, registros arquivados, assinatura, criptografia e auditoria de acesso abrangente.

## F0-05 — Inventário de dependências (em revisão)

- Criado o workflow `dependency-audit.yml` para inspeção de dependências Django, FastAPI e React, publicando resultados JSON e resumo de cada execução. **Primeira run #39049549738:** `pip-audit` encontrou 21 vulnerabilidades em quatro pacotes Django e 14 em um pacote de IA. O job permaneceu verde pelo modo de inventário não bloqueante; detalhes e limitações em `docs/validation/F0_DEPENDENCY_AUDIT.md`.
- As verificações são inicialmente não bloqueantes para permitir medir a dívida; uma falha deve gerar triagem, não ser interpretada como aprovação.
- Criado o procedimento [F0_DEPENDENCY_AUDIT.md](validation/F0_DEPENDENCY_AUDIT.md). Ainda faltam lock de dependências Python e varredura formal do histórico por segredos, além de políticas de thresholds e atualização segura das bibliotecas.
- **Não marcar F0-05 concluída** antes de analisar os resultados reais, classificar vulnerabilidades e revisar os riscos. Gate G0 BLOQUEADO.

## F0-05 — Atualização das dependências do front-end (PR em revisão)

- Pacotes de produção atualizados no lockfile: axios 1.20.0, form-data 4.0.6, react-router e react-router-dom 7.18.4.
- [GitHub Actions #39052124534](https://github.com/erik-hp/aelo-psi/actions/runs/39052124534): npm audit (produção/nível alto), npm ci, lint e build aprovados durante a atualização. Workflow temporário de escrita removido.
- Evidências e ressalvas: [F0_FRONTEND_REMEDIATION.md](validation/F0_FRONTEND_REMEDIATION.md). Confirmar checks no último commit e manter análise de segredos, dependências de desenvolvimento e bloqueios G0 como pendências.

## F0-05 — Varredura de segredos e política de dependências (PR #10)

- Árvores atuais passam por Gitleaks bloqueante, com saída redigida e sem materialização de segredos em artefatos. Histórico completo fica em inventário protegido e ainda requer triagem privada.
- `pip-audit` dos dois serviços Python e `npm audit` de produção tornaram-se checks bloqueantes. O inventário de bibliotecas de desenvolvimento ainda não bloqueia e exige classificação.
- Evidências do primeiro ciclo: [segredos #39056220574](https://github.com/erik-hp/aelo-psi/actions/runs/39056220574), [dependências #39056220430](https://github.com/erik-hp/aelo-psi/actions/runs/39056220430) e [CI #39056220385](https://github.com/erik-hp/aelo-psi/actions/runs/39056220385) aprovados. Detalhes e riscos em [F0_SECURITY_CHECKS.md](validation/F0_SECURITY_CHECKS.md).
- **G0 permanece BLOQUEADO** até documentação de riscos residuais, varredura histórica revisada, dependências de desenvolvimento tratadas, revisão de infraestrutura/privacidade e demais critérios do Plano Mestre.

## Integração e envio ao GitHub — 03/11/2026

- A implementação local do Vault, proteção de dados clínicos, sessão e ensaios de carga foi reunida no branch `feat/vault-security-validation-2026-11-03` com a série F0 recebida de `origin/main`.
- Conflitos foram resolvidos preservando o worker assíncrono, pgvector, cookie HttpOnly e os grants clínicos explícitos. A autenticação JWT foi ligada a `ClinicJWTAuthentication`, que reconsulta a conta e a clínica em cada request. O painel administrativo Django depende de ativação explícita em ambiente de desenvolvimento.
- Erros encontrados na integração: fixtures antigas concediam edição a estagiário e ignoravam o grant do autor; testes de sessão presumiam refresh token no corpo; o endpoint de auditoria tinha `get_queryset` duplicado e inválido; a classe JWT restritiva não estava configurada. Fixtures, contratos de teste, queryset e configuração foram corrigidos.
- Evidência local após integração: suíte combinada do backend SQLite 101 aprovados e 2 ignorados; PostgreSQL/pgvector em Docker 56 aprovados; frontend 89 aprovados; build de produção gerado; Ruff sem erros; `npm audit` na atualização do lockfile encontrou zero vulnerabilidades. Os avisos de paginação sem ordenação e tamanho de bundle ainda exigem acompanhamento.
- A validação do modelo Ollama com dados sintéticos e o resultado dos checks do GitHub Actions deste branch devem ser registrados após execução. Os gates de produção permanecem bloqueados conforme o Plano Mestre.

## Correção do login local — 03/11/2026

- O frontend local apontava para `localhost:18080`, porta da pilha sintética de segurança que estava desligada; a API principal também estava parada. `Frontend/.env` local foi ajustado para `localhost:8000`, as migrações foram concluídas e a API principal foi iniciada sem Ollama.
- O banco local não continha usuários. Uma conta profissional sintética foi criada em clínica ativa com senha aleatória forte, mantida fora do repositório. O frontend deixou de mostrar a senha fraca de demonstração quando conectado à API.
- O formulário agora envia o e-mail completo; o backend resolve e-mail único para a conta cadastrada sem alterar a resposta genérica de falha. O ciclo HTTP real retornou 200 para login, `/auth/me/` e refresh com cookie HttpOnly.
- Testes após a correção: suíte combinada do backend 102 aprovados e 2 ignorados, Ruff sem erros, frontend 89 aprovados e build concluído. A análise de IA segue indisponível até iniciar e configurar Ollama e o worker. O ambiente sintético local não equivale a liberação para uso clínico.

## Triagem da CI do PR #11 — 03/11/2026

- O job Django do baseline falhou na migração de criptografia por não definir `CLINICAL_DATA_KEYS`; o serviço PostgreSQL da CI também não incluía pgvector. O workflow recebeu chaves sintéticas de teste e a imagem `pgvector/pgvector:pg16`.
- A auditoria bloqueante apontou três CVEs em `djangorestframework==3.17.2`. A dependência foi elevada para `3.18.3`, que inclui as correções de segurança de `3.18.2` e um ajuste de regressão posterior. A auditoria local de `requirements/base.txt` terminou sem vulnerabilidades conhecidas.
- O comando Django equivalente ao job remoto passou em Docker com PostgreSQL/pgvector: 48 testes e zero falhas. A execução remota final foi confirmada no PR.
- O smoke HTTP falhou porque a seed sintética criava pacientes sem grants clínicos, de modo que o psicólogo não via seus próprios pacientes. A seed agora cria o grant inicial explícito de cada psicólogo. O smoke também usava cookie `Secure` sobre HTTP sintético; o cliente de teste passou a enviá-lo explicitamente para verificar o fluxo no servidor sem enfraquecer o cookie de produção. Reexecução local: `LIVE_SECURITY_SMOKE_OK`.
- No commit `cfc90ec`, a [CI baseline #41644942581](https://github.com/erik-hp/aelo-psi/actions/runs/41644942581), a [auditoria de dependências #41644942621](https://github.com/erik-hp/aelo-psi/actions/runs/41644942621), a [varredura de segredos #41644942870](https://github.com/erik-hp/aelo-psi/actions/runs/41644942870) e a [qualidade e segurança #41644942797](https://github.com/erik-hp/aelo-psi/actions/runs/41644942797) concluíram com sucesso. O commit documental final `aaadc12` também passou nos quatro workflows.

## Merge solicitado — 03/11/2026

- O [PR #11](https://github.com/erik-hp/aelo-psi/pull/11) foi mesclado em `main` no commit `1287db18e696ed8dd6e622f4105b5fce167894ca`. O checkout local de `main` foi atualizado por fast-forward e corresponde a `origin/main`.
- O Cérebro `tcc-cofre` integrou o branch documental em `main` por fast-forward até `10ca78624deeb8fb35ef712b242d59e1a9d1a9d1`, com push confirmado. Preferências locais do Obsidian e arquivos pessoais não integraram o commit.
- O merge de código não altera o gate `G0 BLOQUEADO`: Ollama integral, governança clínica/jurídica, operação de produção e demais critérios do Plano Mestre continuam pendentes.

## UI-01 — Componentes BoardUI — 06/11/2026 — EM REVISÃO

- Solicitação explícita de atualização visual; base `cf8fb9a`, branch `feat/boardui-interface`. RNF-06/RNF-08; regressão relacionada a F0-05, sem antecipar gates de funcionalidades clínicas.
- Instalados componentes gratuitos oficiais e adaptados os controles compartilhados, cartões, cabeçalhos, buscas e login. Tailwind 4/PostCSS e tailwind-merge 3, mantendo React 18/Vite/TypeScript. Referências dos campos adaptadas para React 18 e react-hook-form; sem alteração de back-end ou uso de dados reais.
- Executados: 92 testes em 18 arquivos aprovados; lint com 0 erros/13 avisos; build aprovado com avisos de Zod/chunks. Instalação npm reportou 0 vulnerabilidades em 451 pacotes. `git diff --check` sem erros.
- Limitação: nenhum navegador conectado; inspeção visual responsiva/leitor de tela e checks remotos não comprovados. Detalhes, comandos, decisão e revisão em [UI_BOARDUI.md](validation/UI_BOARDUI.md).
- Commit/PR: implementação `0a6830a`, [PR #15 em rascunho](https://github.com/erik-hp/aelo-psi/pull/15). Próximo item: revisão visual com dados sintéticos e conciliação com o PR #14 de identidade visual antes do merge. **G0 continua BLOQUEADO**.

## UI-01 — Revisão de layout de todas as páginas — 06/11/2026 — EM REVISÃO

- Continuação explicitamente solicitada no [PR #15](https://github.com/erik-hp/aelo-psi/pull/15), branch `feat/boardui-interface`, a partir de `32f523f`. RNF-06/RNF-08 e regressão F0-05.
- Revisadas as 14 páginas existentes, sem reativar rotas legadas. Tokens e tipografia uniformizados; shell, cabeçalhos, cartões, buscas, ações, tabelas, abas e diálogos alinhados ao BoardUI. Ajustados breakpoints, quebras de texto, largura de colunas, rolagem de calendário/evidências/Markdown e camadas dos toasts. Usuários sintéticos aparecem só na demonstração, explicitamente identificada; em modo API a tela declara a integração pendente.
- Evidência: commit `39792be`, 108 testes aprovados em 20 arquivos, incluindo renderização das 14 páginas e testes de teclado/associação de abas e foco/Escape dos diálogos; build de produção aprovado com avisos de Zod/chunks; lint com 0 erros e 13 avisos.
- A tentativa de navegador retornou `Browser is not available: iab`; não declarar inspeção visual responsiva, leitor de tela ou conformidade WCAG executados. Inventário, decisões e limitações em [UI_BOARDUI.md](validation/UI_BOARDUI.md).
- Próximo item: inspeção visual com dados sintéticos, conciliação do PR #14 e verificação dos checks remotos antes do merge. **G0 continua BLOQUEADO**.

## Restabelecimento do acesso local — 06/11/2026

- Diagnóstico F0-01/F0-04: o front-end em modo API apontava para `localhost:8000`, mas os containers existentes `backend-db-1` e `backend-api-1` estavam parados. Ambos foram iniciados; a API está publicada somente em `127.0.0.1:8000` e o banco não possui porta Docker publicada.
- Criada uma conta profissional sintética local, não administrativa, sem grants de prontuários. A conta anterior foi preservada. A senha aleatória foi entregue fora do repositório; nenhum segredo ou token foi versionado.
- Verificado no ambiente em execução: `manage.py check` sem problemas; login, `/auth/me/` e refresh por cookie retornaram HTTP 200, com origem autorizada do front-end (`http://localhost:5173`). A verificação não removeu a proteção de origem nem alterou permissões.
- Nenhum código da aplicação foi alterado. A disponibilidade de Ollama/IA não foi validada neste restabelecimento. **G0 continua BLOQUEADO**; acesso local sintético não libera uso clínico real.

## Correção da sincronização da agenda no modo API — 06/11/2026

- Base `45b9ac1`, branch `feat/boardui-interface`, [PR #15](https://github.com/erik-hp/aelo-psi/pull/15). Escopo F0-01/F0-05, RNF-06/RNF-08: corrigir o carregamento da agenda sem alterar autorização, contratos HTTP ou dados.
- Causa reproduzida: `clinicalService.getAgenda` era passada diretamente como `queryFn`; a chamada perdia o contexto e `this.getPatients()` lançava `TypeError` antes de consultar a API. A referência agora é explícita: `clinicalService.getPatients()`.
- Evidência anterior à correção: os nove novos testes falharam, reproduzindo o `TypeError`. Após a correção: 117 testes aprovados em 21 arquivos; build TypeScript/Vite aprovado; lint com 0 erros/13 avisos. Permanecem os avisos conhecidos de Zod/chunks.
- Casos cobertos: execução real pelo QueryClient, dados sintéticos paginados, resposta vazia válida, erros 401/403/500 em ambos os endpoints e dashboard com o serviço real sem alerta indevido quando a agenda está vazia. Falhas de API continuam explícitas, sem fallback demonstrativo.
- Verificação local HTTP com a conta sintética: `/patients/`, `/sessions/` e `/analysis/` retornaram 200 com contagem zero. O módulo servido pelo Vite em `localhost:5173` retornou 200 e contém a referência corrigida, sem `this.getPatients()`. Nenhum conteúdo clínico ou token foi registrado.
- Limitação: sem inspeção de navegador; a regressão do dashboard foi validada em DOM e a API foi consultada em execução. Próximo item: recarregar a página e revisar os checks do PR. **G0 continua BLOQUEADO**.

## Auditoria funcional de pacientes, agenda e editor — 06/11/2026 — EM REVISÃO

- Solicitação explícita de auditoria; branch `fix/auditoria-fluxos-operacionais`, base `e53ed94` do PR #15. Escopo F0-01/F0-02/F0-03/F0-05 e correções parciais F1-01/F1-02/F1-03/F1-06; RF-01–RF-04, RNF-02/RNF-03/RNF-06/RNF-08. Sem liberação de gate ou funcionalidade científica nova.
- Cadastro real de paciente e grant inicial atômico; agenda com paciente persistido e POST/PATCH; editor visível no modo API, com paciente/sessão/grant, texto original e salvamento independente de IA. Acrescentadas validação de código/horário e proteção opcional de versão da nota (409). Conclusão de atendimento não assina nota.
- Corrigidos paginação truncada, cache entre identidades, busca inerte, revisão de análises no perfil e estados de erro do cofre. Diretório de usuários passou a consultar a API; permissões e textos de métricas/configurações foram alinhados ao comportamento efetivo.
- Executados: frontend **132 testes/24 arquivos**, build aprovado, lint 0 erros/11 avisos; backend **59 aprovados/2 ignorados/1 aviso**, Ruff sem erros nos arquivos alterados. API Docker reconstruída; check e ausência de migrações verificados. Smoke HTTP real com PostgreSQL confirmou persistência, duplicados 400, conflito 409, negação 401/404 e ausência de assinatura ao concluir sessão. Dados exclusivamente sintéticos, preservados para inspeção; nenhum segredo registrado.
- Achados, causas, soluções, contratos, evidências e pendências em [AUDITORIA_FUNCIONAL_2026-11-06.md](validation/AUDITORIA_FUNCIONAL_2026-11-06.md). Sem navegador disponível: não houve inspeção visual, leitor de tela ou validação integral worker/Ollama. Financeiro, notificações, edição de preferências/contas, autosave, concorrência e workflow integral de assinatura continuam pendentes.
- Implementação `f0f7a5e`, [PR #16 em rascunho](https://github.com/erik-hp/aelo-psi/pull/16), dependente do PR #15; sem merge. Checks remotos ainda não confirmados nesta entrada. Próximo item: revisar CI e os achados residuais F0; validar visualmente os fluxos com dados sintéticos. **G0 continua BLOQUEADO**.

## UI-02 — Contraste dos seletores compartilhados — 06/11/2026 — EM REVISÃO

- Base `3333a78`, branch `fix/contraste-seletores`, dependente do PR #16 (aberto/em rascunho, confirmado via GitHub). Escopo: regressão visual F0-01/F0-05, RNF-06/RNF-08. Risco baixo, apenas estilos compartilhados; sem alteração de API, autorização ou dados.
- Causa: o Select aplicava texto temático, mas não definia superfície opaca para o popup nativo de opções. Definidos fundo/texto por tokens semânticos para `option`/`optgroup`, texto de opções desabilitadas e `color-scheme` claro/escuro. Removida declaração global redundante que fixava esquema escuro; a raiz continua controlada pelo tema BoardUI.
- Padrão obrigatório para novos campos desse tipo: importar `Select` de `@/components/ui/select`, associar `label`/`id` ou `aria-label`, passar as opções nativas e usar `disabled` quando indisponível. Ref, eventos, validação e teclado nativos preservados. A busca por `<select` em `Frontend/src` encontrou somente esse componente: Editor, Agenda, Pacientes, Auditoria e página longitudinal herdam a correção.
- Executados: `npm.cmd test -- --run` (**132 aprovados/24 arquivos**), `npm.cmd run build` (aprovado; avisos conhecidos Zod/chunks), `npm.cmd run lint` (**0 erros/11 avisos**), `git diff --check` sem erros. Testes DOM comprovam regressão funcional, não aparência do popup do sistema. Conferência visual em navegador claro/escuro/alto contraste continua pendente.
- Implementação `aabda1e`, [PR #17 em rascunho](https://github.com/erik-hp/aelo-psi/pull/17), dependente do #16, sem merge. Próximo item: revisar o menu aberto em navegador e os checks remotos, ainda não confirmados. **G0 continua BLOQUEADO**.

## Pesquisa e plano operacional digital — 06/11/2026 — EM REVISÃO

- Solicitação explícita: pesquisar/documentar a operação digital da clínica antes de voltar à análise por IA. Base `568868a`, branch `docs/plano-operacional-clinica`; PR #17 confirmado aberto/em rascunho. Escopo documental F0-01/F0-06 e refinamento proposto F1, RF-01–RF-04/RNF-01–RNF-06/RNF-08, sem implementação ou liberação de gate.
- Criado [PLANO_OPERACIONAL_CLINICA.md](PLANO_OPERACIONAL_CLINICA.md): premissas, fontes oficiais, jornada, capacidades, responsabilidades/permissões, inventário real do código, arquitetura candidata, OP-00–OP-11 com dependências/aceite, homologação, procedimentos e solicitação de mudança SC-OP-01. Plano Mestre/matriz/README apontam a proposta sem aprovar ampliações.
- Consultados CFP/CRPs, legislação federal, ANPD, Receita Federal, Ministério da Saúde e ANS. Destacadas diferenças de guarda por categoria (sem descarte automático em cinco anos), Receita Saúde PF versus emissão PJ, e-Psi sem exigência na orientação atual, acesso administrativo sem prontuário e representação legal separada do pagador. Regras locais e consolidação normativa/contratual exigem validação antes de implantação; sem alegação de conformidade.
- Cenário inicial assumido e marcado como não confirmado: clínica particular brasileira com equipe e atendimento híbrido; município, PF/PJ, convênios e recorte financeiro permanecem decisões pendentes. Ampliações propostas permanecem em backlog, sem criar tabelas, integrações, contas ou requisitos aprovados.
- Verificações desta rodada: leitura dos modelos/rotas/serviços pertinentes, conferência de fontes e `git diff --check` sem erros; script local validou cinco documentos, 46 referências locais e cercas de código balanceadas (`DOC_CHECK_OK`). Nenhum teste/build da aplicação foi repetido: não houve alteração de código executável. Documento no commit `82eafa4`, [PR #18 em rascunho](https://github.com/erik-hp/aelo-psi/pull/18), dependente do #17, sem merge/checks remotos confirmados. Próxima tarefa recomendada: OP-00, conciliar evidências F0 antes de avançar a implementação; **G0 continua BLOQUEADO**.

## Adendo de estabilização — navegação/UX e Strix — 06/11/2026 — EM REVISÃO

- Base `1bcb9e7`, branch `docs/estabilizacao-ux-seguranca`; PR #18 confirmado aberto/em rascunho. Solicitação explícita: formalizar deficiência de navegação/estrutura das telas, pesquisar referências para melhoria e planejar verificação Strix quando cerca de 80% das funcionalidades estiverem prontas/auditáveis.
- Criados [PLANO_REVISAO_UX_NAVEGACAO.md](validation/PLANO_REVISAO_UX_NAVEGACAO.md) e [PLANO_AVALIACAO_STRIX.md](security/PLANO_AVALIACAO_STRIX.md). Atualizados plano operacional, Plano Mestre e matriz. Vínculos F0-01/02/04/05, F1-06/F6-01/05, RF-01 e RNF-02/03/06/08; IDs locais UX/SEC não substituem fases.
- Realizados: inspeção estática de Sidebar/Header/rotas e estrutura de páginas; consulta documental GOV.UK, NHS, Carbon, USWDS, W3C, OWASP e repositório/documentação oficial `usestrix/strix`. Benchmark visual/prático, teste com usuários e redesign ainda não executados; o relato não foi convertido em medição fictícia.
- Marco de 80% definido como proporção de unidades de aceite funcionais do escopo aprovado, com denominador congelado e evidência; percentual atual não calculado. Controles críticos e ambiente sintético isolado antecedem ensaio. Strix envolve teste ativo e diretório local com escrita; prevê cópia descartável, restrição externa de rede, revisão de provedor/artefatos, triagem e reteste humanos. Não instalado/executado, sem envio de código ou dados a provedor.
- Validação: `git diff --check` sem erros; script `DOC_CHECK_OK` conferiu seis documentos, 35 referências locais e cercas de código balanceadas. Não repetidos testes/build: somente documentação foi alterada. Próximo item: UX-01 junto do diagnóstico OP-00/OP-01, depois benchmark/protótipos antes de alterações amplas. Segurança permanece contínua desde F0; versão estável depende dos aceites obrigatórios e gates, não da porcentagem ou de relatório vazio de ferramenta. Documento no commit `f5b3c52`, [PR #19 em rascunho](https://github.com/erik-hp/aelo-psi/pull/19), dependente do #18; sem merge/checks remotos confirmados. **G0 continua BLOQUEADO**.

## Piloto Jev — cancelado — 06/11/2026

- O usuário informou que não será possível utilizar Jev e solicitou a remoção de todas as preparações. O piloto local foi excluído, a referência na matriz removida e o PR #20 fechado sem merge. Nenhuma integração com a aplicação foi feita; G0 e demais gates não mudam.

## Revisão transversal F0 — 06/11/2026 — EM REVISÃO

- Solicitação explícita de análise e melhoria geral do projeto. Base `fe07b00`, branch `fix/f0-revisao-transversal`, commits `a66f890` e `48f0a4d`, [PR #21 em rascunho](https://github.com/erik-hp/aelo-psi/pull/21), dependente do #19, sem merge. Escopo F0-01/F0-02/F0-04/F0-05, RF-01/RNF-02/RNF-03/RNF-08. Sem funcionalidade nova, migração ou mudança de contrato de sucesso.
- **Regressão comprovada:** a integração do PR #11 removeu de `settings.py` o bloqueio de senha fraca do banco e a ausência de origem local em produção, embora o registro de F0-04 os descrevesse como vigentes. A comparação `062efbe`→`HEAD` não apontou outra perda de controle de autorização no `settings.py`; o token do serviço de IA segue exigido. Restaurados com `DEBUG=False`; desenvolvimento com `DEBUG=True` mantém o comportamento local.
- **Proxy TLS:** `settings.py` lia `DJANGO_TRUST_PROXY_SSL_HEADER`, enquanto overlay, `.env.example` e `OPERATIONS.md` usam `DJANGO_TRUST_PROXY_HEADERS`. Com `DJANGO_REQUIRE_HTTPS`, a API atrás do Caddy veria HTTP e redirecionaria indefinidamente. Nome alinhado; a pilha TLS real não foi executada.
- **Coleta de testes:** `pytest.ini` e `pytest.postgres.ini` só coletavam `test_*.py`, deixando fora 48 testes de autorização/auditoria em `apps/`. A contagem "59 aprovados" registrada na auditoria funcional não incluía esses testes. Agora a coleta é completa.
- **Erros reproduzidos antes da correção:** HTTP 500 em `grant-access`, `revoke-access`, `preview-ai` e `dashboard/longitudinal?patient=abc` com identificador malformado (agora 404/400); listagem de notas gerava dois eventos `LIST` (agora um, com `method` preservado em todos os módulos do mixin); pacientes e sessões paginavam sem ordem e auditoria sem desempate. Ordem total adotada, e `UnorderedObjectListWarning` agora é erro de teste.
- **Frontend:** páginas autenticadas por `React.lazy`, com `Suspense` e `RouteErrorBoundary` no layout. Chunk principal de 934,26 kB para 499,59 kB (gzip 286,86 para 161,43 kB). Removidos dois imports sem uso.
- **Executados:** antes das correções, 25 falhas pelo motivo esperado. Depois: backend SQLite **134 aprovados/2 ignorados**; PostgreSQL/pgvector via `docker-compose.test.yml` **136 aprovados/0 ignorados**; `manage.py test apps` 48 OK; Ruff sem erros; `manage.py check` e `makemigrations --check` sem alterações. Frontend **135 testes/25 arquivos**, build aprovado, lint 0 erros/9 avisos. `docker-compose.security.yml`: `LIVE_SECURITY_SMOKE_OK`; três chunks de páginas responderam 200 pelo Caddy com a CSP presente. Pilhas com projetos Compose próprios, removidas ao final.
- **Limitações:** sem navegador, a execução real dos chunks sob CSP não foi observada; sem pentest, Ollama real ou TLS real. `search_fields` de pacientes/usuários segue sem efeito por não haver `SearchFilter` configurado (a busca da interface filtra no cliente). Corrida de cadastro duplicado e concorrência de agenda continuam pendentes. Avisos restantes: 9 de Fast Refresh, Zod e o chunk sob demanda do Cytoscape.
- **CI remota:** no commit `7147574`, 8 de 9 jobs passaram e `Quality and security / frontend` falhou ([run #42232872182](https://github.com/erik-hp/aelo-psi/actions/runs/42232872182)). Causa: `clinicalService.agenda.test.tsx` fixava `10:30` e a CI roda em UTC; reproduzido com `TZ=UTC`. A mesma falha aparece na branch do PR #19 ([run #42170260935](https://github.com/erik-hp/aelo-psi/actions/runs/42170260935)), e o job também terminou em falha nas branches dos PRs #16 e #17, onde a causa não foi inspecionada; os registros desses PRs constavam como checks não confirmados. O teste foi corrigido em `48f0a4d`, sem alterar código de produção. Reexecução local aprovada em UTC e `America/Sao_Paulo`; `Asia/Tokyo` e `Pacific/Auckland` não contam como evidência, pois o Windows não aplicou esses fusos.
- **Resultado remoto em `48f0a4d`:** os 9 jobs passaram: [baseline #42233876659](https://github.com/erik-hp/aelo-psi/actions/runs/42233876659), [qualidade e segurança #42233876837](https://github.com/erik-hp/aelo-psi/actions/runs/42233876837), [dependências #42233876831](https://github.com/erik-hp/aelo-psi/actions/runs/42233876831) e [segredos #42233876766](https://github.com/erik-hp/aelo-psi/actions/runs/42233876766). Os PRs #16–#19 só ficam verdes com esta correção ou uma equivalente.
- **Atenção operacional:** implantações com `DEBUG=False` agora exigem `POSTGRES_PASSWORD` forte e `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` explícitos. **G0 continua BLOQUEADO**.

## Recuperação, contexto do Ollama e IA externa — 06/11/2026 — EM REVISÃO

- Solicitação explícita de pesquisar, avaliar e implementar as ideias de recuperação por nível de detalhe e de IA não local. Branch `feat/recuperacao-camadas-lod`, commit `94f1ed2`, [PR #22 em rascunho](https://github.com/erik-hp/aelo-psi/pull/22), dependente do #21, sem merge. Escopo F0-03 (contexto), RNF-03/RNF-07 e proposta F2-04. Tratado como mudança de escopo: [ADR-003](architecture/ADR-003-recuperacao-em-camadas.md) e [ADR-004](architecture/ADR-004-ia-externa.md), ambas **propostas**. Pesquisa em [relatório](research/recuperacao-lod-e-ia-em-nuvem.md), com [notas de fontes](research/notas/).
- **Pilha:** teste de fuso aplicado no PR #16 e propagado por merge, sem force-push. Checks confirmados: #16, #17, #18, #19 e #21 com 9 de 9 aprovados.
- **Janela de recência:** com 31 notas, a sessão 1 ficava fora do contexto mesmo com `context_limit=20`, e a nota analisada podia ficar de fora. Nota analisada agora sempre incluída. Seleção em camadas pronta e **desligada por padrão** (`AI_LOD_RETRIEVAL=False`), pois F2 depende de G0/G1. Sem tabela, migração ou indexação nova.
- **Truncamento do Ollama:** sem `num_ctx`, o padrão é 4.096 em CPU ou abaixo de cerca de 23 GiB de VRAM, e o excedente perde o início do prompt com HTTP 200. Em Ollama 0.40.15, com `smollm:135m`, container descartável e texto sintético, 18.025 tokens viraram 258 com HTTP 200, e `shift: false` retornou HTTP 400. Geração agora define `num_ctx` (padrão 8192), `shift: false` e bloqueio prévio. Prompt grande resulta em falha explícita (503). `llama3.1` não foi executado.
- **Executados:** backend SQLite 150 aprovados/2 ignorados, Ruff sem erros. Os 10 testes de camadas falharam antes da implementação; os testes de contexto foram escritos junto da correção.
- **Avaliações sintéticas:** `tests/evaluate_lod_retrieval.py` e `tests/evaluate_deidentification.py`. Janela 0/20 por construção; camadas de 17/20 a 5/20, acompanhando extração e vocabulário assumidos: comprova mecanismo, não taxa real. Filtro de identificadores: diretos 7 de 7 tratados, e 19 de 28 vazaram no total, em fixture que não estima taxa real.
- **Decisão proposta:** Ollama segue como único destino de conteúdo clínico. Nenhum código de envio externo foi criado. Nuvem somente com dados sintéticos, como braço científico, após ADR aprovada. Interpretações normativas exigem parecer; varredura de resoluções CFP de 2026 ficou incompleta.
- **CI remota em `ec0f06d`:** os 9 jobs passaram, incluindo PostgreSQL/pgvector e smoke HTTP: [baseline #42239357957](https://github.com/erik-hp/aelo-psi/actions/runs/42239357957), [qualidade e segurança #42239358067](https://github.com/erik-hp/aelo-psi/actions/runs/42239358067), [dependências #42239358199](https://github.com/erik-hp/aelo-psi/actions/runs/42239358199) e [segredos #42239358006](https://github.com/erik-hp/aelo-psi/actions/runs/42239358006).
- **Limitações:** seleção busca só em rótulos do grafo; paráfrase não é reconhecida; decifração de rótulos sem tempo medido; `embeddinggemma` aceita 2.048 tokens, então nota longa pode falhar explicitamente no embed; imagem `ollama/ollama:latest` segue sem versão fixa. **G0 continua BLOQUEADO**. Próximo item: decisão das ADRs com o orientador, depois medir extração real em conjunto sintético de referência.

## Recuperação em camadas, desenho do autor — 06/11/2026 — EM REVISÃO

- Decisão do autor: a IA lê cada nota inteira e a estrutura; relevância ordena sem descartar; busca por estrutura e texto original em notas de qualquer idade; nota escolhida vai inteira ao modelo. TCC1 fica somente como consulta. [ADR-003](architecture/ADR-003-recuperacao-em-camadas.md) atualizada; PR #22.
- Implementada a rota do texto original com BM25 em memória, sem persistência, com `AI_LOD_SOURCE_SEARCH` para comparar rotas. A seleção segue desligada por padrão (`AI_LOD_RETRIEVAL=False`).
- **Erro encontrado e corrigido:** a primeira versão somava as rotas por RRF e deu resultado idêntico a "só estrutura". O diagnóstico mostrou a nota certa em 1º lugar na busca textual, expulsa por notas presentes nas duas listas. Rotas agora têm vagas próprias. Termos de 3 letras, como "pai" e "avô", passaram a contar.
- **Executados:** backend SQLite 157 aprovados/2 ignorados, Ruff sem erros. Simulador: só estrutura de 17/20 a 5/20; estrutura + texto de 20/20 a 9/20. Compara rotas, não mede taxa real, e o desenho foi ajustado após ver o simulador.
- **Pendente:** extração automática por nota (hoje presa ao checkpoint manual, que trava a nota), classificação de relevância, paráfrase e tempo em histórico longo. **G0 continua BLOQUEADO**.

## Leitura automática de notas em ambiente sintético — 06/11/2026 — EM REVISÃO

- Autorização explícita do autor: seguir com a automação **somente em ambiente sintético**, mantendo o bloqueio para dados reais. G0 não foi alterado. Branch `feat/recuperacao-camadas-lod`, PR #22.
- Extração separada do checkpoint e da trava da nota. Fila `NoteExtractionJob` por versão (migração `ai_analysis.0013`), processada pelo worker, nunca na requisição HTTP. Gravação idempotente: reler não duplica, e editar substitui o que veio do texto antigo. Comando `queue_note_extractions` para notas existentes. Rota do Vault informa leituras pendentes e com falha. Retenção remove a fila.
- **Trava:** `AI_AUTO_EXTRACTION=True` exige `AELO_SYNTHETIC_DATA_ONLY=True`, e a aplicação recusa iniciar em modo HTTPS. Isso é declaração de ambiente: não verifica se os dados são de fato sintéticos.
- **Executados:** backend SQLite 181 aprovados/2 ignorados, Ruff sem erros, `makemigrations --check` sem alterações. Mutação manual: 10 de 10 proteções quebradas de propósito foram detectadas pelos testes. Os testes foram escritos depois do código, por falha de ferramenta, sem a etapa de falha prévia; a mutação compensa parcialmente isso.
- **CI:** `security-smoke` falhou uma vez em `d9ff41c`, no login pelo proxy após a carga ([run #42245540956](https://github.com/erik-hp/aelo-psi/actions/runs/42245540956)). A hipótese de limite de login não se confirmou: sem nenhum 429 em três rodadas seguidas, e a sequência exata da CI passou duas vezes localmente. O assert agora mostra o status. Em `5398b7d`, mesmo código com essa mensagem, os 9 jobs passaram e o workflow de qualidade passou novamente em segunda execução ([run #42246508413](https://github.com/erik-hp/aelo-psi/actions/runs/42246508413)). **Falha intermitente sem causa identificada; observar.**
- **Limitações:** extração real com `llama3.1` não medida; relevância ainda não classificada; peso acumulado não é recalculado após edição. **G0 continua BLOQUEADO**.

## Pendências de decisão

- Revisão de normas CFP e estado efetivo da Resolução 001/2009; CFP 009/2024 se refere a TDIC, não proibição específica de IA.
- Validação da base jurídica, RIPD e governança de dados por profissionais competentes.
- Política de assinatura/guarda documental apropriada.
- Modelo de embeddings/LLM, hardware e política de chaves.
- Versão/perfil FHIR e procedimento de validação.
- Cronograma formal de pesquisa e status real do CEP; não inferir aprovação de calendário acadêmico passado.

## Regras

O registro não é histórico de conversa: é histórico auditável de artefatos e testes. Não converter “escrito”, “planejado” ou “inspecionado” em “desenvolvido/testado”. Não iniciar F2/F3 sem G0/G1.
