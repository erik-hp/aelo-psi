# Registro de execução e decisões — AELO-PSI (TCC2)

**Atualizado em:** 17/10/2026. **Padrão:** somente fatos verificados; este documento é o ponto de retomada de novas sessões/assistentes.

## Estado geral

- **Fase corrente:** F0 — diagnóstico e contenção de riscos.
- **Gate liberado:** nenhum gate de implementação verificado.
- **Próxima tarefa:** triar alertas do inventário de dependências F0-05, após validar o workflow no GitHub Actions; a `main` consultada nesta rodada é `2fd3084a259aa887eaa5d2adb5f4801062eae273` (PR #6 integrado). G0 permanece bloqueado.
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

## Pendências de decisão

- Revisão de normas CFP e estado efetivo da Resolução 001/2009; CFP 009/2024 se refere a TDIC, não proibição específica de IA.
- Validação da base jurídica, RIPD e governança de dados por profissionais competentes.
- Política de assinatura/guarda documental apropriada.
- Modelo de embeddings/LLM, hardware e política de chaves.
- Versão/perfil FHIR e procedimento de validação.
- Cronograma formal de pesquisa e status real do CEP; não inferir aprovação de calendário acadêmico passado.

## Regras

O registro não é histórico de conversa: é histórico auditável de artefatos e testes. Não converter “escrito”, “planejado” ou “inspecionado” em “desenvolvido/testado”. Não iniciar F2/F3 sem G0/G1.
