# Matriz de rastreabilidade de requisitos — AELO-PSI (TCC2)

**Versão:** 1.0 — 17/10/2026. **Estado:** baseline proposta, não evidencia implementação ou conformidade.  
Ver [Plano Mestre](PLANO_MESTRE_IMPLEMENTACAO.md) e [registro](REGISTRO_EXECUCAO.md). As hipóteses H1–H3 e objetivos abaixo derivam do projeto de TCC fornecido pelo autor. O desenho MTLI deriva da ADR-001.

## Hipóteses e objetivos de pesquisa

- **H1:** redução potencial do esforço administrativo, com documentação profissional rigorosa e revisão humana.
- **H2:** aceitabilidade associada a tratamento cuidadoso, privacidade e execução local.
- **H3:** exploração de padrões textuais longitudinais como apoio interpretativo, **sem** equivalência automática com estado emocional ou diagnóstico.
- **OE1:** levantar gargalos com psicólogos/estagiários.
- **OE2:** projetar arquitetura do prontuário, RAG, memória temporal e indicadores.
- **OE3:** implementar ciclos DSR e infraestrutura local.
- **OE4:** verificar mecanismos técnicos e lacunas de proteção de dados/ética.
- **OE5:** avaliar usabilidade/aceitação e esforço com SUS, UMUX-Lite e tarefas.

## Requisitos rastreáveis

| Req. | Requisito verificável | Fase/item | Hipótese/objetivo | Evidência mínima | Estado |
| --- | --- | --- | --- | --- | --- |
| RF-01 | Usuários autenticados acessam só clínica/pacientes/ações autorizados | F0-02, F1-01 | OE3/OE4, H2 | Testes de negação BOLA/IDOR em CRUD/listas | NÃO INICIADO |
| RF-02 | Cadastro e controle de acesso paciente/profissional/estágio | F1-01 | OE2/OE3 | API + testes de duas clínicas | NÃO INICIADO |
| RF-03 | Agendamento, remarcação, cancelamento e estados de sessão | F1-02 | H1, OE3 | Teste e tarefa de usabilidade | NÃO INICIADO |
| RF-04 | Nota clínica rascunho/revisão/assinatura/retificação imutável | F1-03 | H1, OE4 | API, teste de bloqueio e histórico | NÃO INICIADO |
| RF-05 | Busca semântica/textual sobre todo histórico autorizado | F2-03/F2-04 | H1/H3, OE2/OE3 | Dataset sintético antigo + recall@k | NÃO INICIADO |
| RF-06 | Síntese RAG com citações nota/versão/trecho e abstenção | F2-05/F2-06 | H1/H2, OE3/OE4 | Precision de citações, erros e links | NÃO INICIADO |
| RF-07 | Extração de temas/eventos/relações temporais derivadas | F3-01 a F3-03 | H3, OE2/OE3 | Teste de casos contraditórios | NÃO INICIADO |
| RF-08 | Revisão humana para aceitar, rejeitar e corrigir memória derivada | F3-04 | H2/H3, OE4 | Auditoria + estado e reindexação | NÃO INICIADO |
| RF-09 | Linha do tempo e grafo restrito ao paciente | F3-05/F3-06 | H3, OE3/OE5 | E2E, acessibilidade, fonte | NÃO INICIADO |
| RF-10 | Indicadores exploratórios temporais com incerteza e origem | F4-01 a F4-04 | H3/OE3/OE4 | Protocolo anotação e erros | NÃO INICIADO |
| RF-11 | Interoperabilidade/exportação FHIR documentada e restrita | F5-01/F5-02 | OE2/OE4 | Validador FHIR + permissão | NÃO INICIADO |
| RF-12 | Painel de pesquisa e auditoria sem conteúdo clínico indevido | F1-05/F2-06 | H2/OE4 | Testes log/prompt/rastro | NÃO INICIADO |
| RNF-01 | Criptografia de campos/derivados, gestão de chaves, backup | F1-04, F5-03 | H2/OE4 | Testes criptografia/restore/rotação | NÃO INICIADO |
| RNF-02 | Segregação e negação de acesso indevido em todas as camadas | F0-02, F2-04, F3-01 | H2/OE4 | 0 vazamentos nos cenários testados | NÃO INICIADO |
| RNF-03 | Inferência local, segredo não exposto e falhas explícitas | F0-03/F0-04 | H2/OE4 | Falhas testadas + revisão rede/config | NÃO INICIADO |
| RNF-04 | Proveniência/versionamento/reprodutibilidade de IA e índice | F2-01, F3-05 | H1/H3, OE3/OE4 | IDs de modelo/prompt/chunk e rebuild | NÃO INICIADO |
| RNF-05 | Conformidade documentada por controle e evidência, sem certificação presumida | F0-06, F5-04 | OE4 | Mapa dados, RIPD, lacunas | NÃO INICIADO |
| RNF-06 | Usabilidade/acessibilidade: WCAG 2.2 AA como alvo | F1-06, F6-05 | OE5 | Avaliação manual e automatizada | NÃO INICIADO |
| RNF-07 | Qualidade do RAG, citações e benchmark de memória | F2-04/F2-05, F6-04 | H1/H3/OE5 | Recall@k, evidência, p95 | NÃO INICIADO |
| RNF-08 | Processo auditável (CI, testes, documentação por alteração) | F0-01/F0-05, F7-03 | OE3/OE4 | Checks e registro de PR | NÃO INICIADO |
| VAL-01 | Avaliação DSR com participantes e ética aplicável | F6-01/F6-02 | OE1/OE5 | Protocolo + comprovação ética | NÃO INICIADO |
| VAL-02 | SUS e UMUX-Lite aplicados e analisados adequadamente | F6-03 | OE5 | Questionários, planilha, cálculo | NÃO INICIADO |
| VAL-03 | Medir tempo, sucesso e confiança em tarefas comparáveis | F6-04 | H1/H2/OE5 | Dados e metodologia comparativa | NÃO INICIADO |
| VAL-04 | Conclusões científicas rastreadas a evidências, limitações | F6-06/F7-01 | OE1–OE5 | Relatório e seção TCC | NÃO INICIADO |

**Importante:** “NÃO INICIADO” significa que o novo critério de aceite *não está validado*, mesmo quando há implementação parcial no repositório.

## Regras de atualização

Conectores operacionais de interface em modo API (17/11/2026): RF-01, RF-02, RF-03, RF-11, RNF-06 e RNF-08 recebem integração completa de frontend/backend para concessão e revogação de vínculos clínicos (`PatientAccessPanel` + `GET /patients/{id}/eligible-assignees/`), arquivamento cadastral e restrição visual de conteúdo clínico para `ADMIN` (`F1-01`), cadastro e ativação/desativação de equipe em `UsersPage` (`F1-01`), remarcação de sessão com tratamento de conflito de intervalo em `AgendaPage` (`F1-02`) e download do bundle FHIR R4 oficial em `PatientProfilePage` (`F5-02`). Verificados **513 aprovados em PostgreSQL/pgvector (zero ignorados)**, **509 em SQLite**, **225 no Frontend** e inventário íntegro em **28 modelos/243 campos**. Expansões comerciais não aprovadas (`SC-OP-01`: financeiro, notificações externas, convênios e portal do paciente) permanecem fora do escopo. Requisitos seguem **EM REVISÃO**; **G0 não promovido**.

Entrega multimodelo, ciclo de nota assinada/retificada, FHIR e protocolo DSR (17/11/2026): RF-03, RF-04, RF-10, RF-11, RNF-01, RNF-03, RNF-05, RNF-06, RNF-08, VAL-01 e VAL-02 recebem implementação e validação em ambiente sintético: bloqueio de sobreposição de intervalo na agenda (`F1-02`); assinatura explícita ECDSA P-256 e retificação formal `AMENDED` com histórico/motivo cifrados no backend e editor (`F1-03`/`F1-06`, migração `clinical_notes.0005`); rotação de chaves cobrindo rascunhos, motivos e Vault (`F1-04`); adaptadores `gemini` e `anthropic` sob trava estrita `AELO_SYNTHETIC_DATA_ONLY=True` ([ADR-004](architecture/ADR-004-ia-externa.md) `SC-IA-01`); exportação FHIR R4 com `Provenance` e `?official_only=1` ([FHIR_MAPPING.md](interoperability/FHIR_MAPPING.md), `F5-01`/`F5-02`); limpeza de citações normativas na UI (`F0-03`); protocolo de entrevistas/TCLE ([F6_PROTOCOLO_ENTREVISTAS_E_AVALIACAO_DSR.md](validation/F6_PROTOCOLO_ENTREVISTAS_E_AVALIACAO_DSR.md)), protocolo de indicadores ([F4_INDICADORES_LONGITUDINAIS.md](validation/F4_INDICADORES_LONGITUDINAIS.md)) e calculadores SUS/UMUX-Lite (`services/metrics/usability_scales.py`, `F6-03`). Verificados **512 aprovados em PostgreSQL/pgvector (zero ignorados)**, **508 em SQLite**, **221 no Frontend** e inventário em **28 modelos/243 campos**. Requisitos permanecem **EM REVISÃO** até alinhamento com orientador, aprovação ética/coleta real aplicável e revisão independente; **G0 não promovido**.

F0-06/RNF-05/RNF-08 (17/11/2026): catálogo declarado de 28 modelos/235 campos, guard sem acesso a banco, nove fluxos, dez decisões GOV e nove RET; roteiros de titulares/incidente e fontes oficiais com limites explícitos. Código `4156153`; **43 etapas locais aprovadas**, backend 478 (5 novos), frontend 220, executor 11. [Relatório](validation/F0_PRIVACY_2026-11-17.md), [evidência estruturada](validation/evidence/f0-06-2026-11-17.json), [pacote de governança](privacy/F0_GOVERNANCE_DECISIONS.md). Entrega técnica concluída; requisito integral **EM REVISÃO**. Não nomeia agentes nem aprova bases/prazos/uso real; não promove G0. Próxima revisão: F0-02 independente e critérios G0.

F0-05/RNF-08 — contorno autorizado da cota (17/11/2026): executor local por commit e locks/hashes implementados em `393a93c`/`759f9dd`. **42 etapas aprovadas** no SHA `759f9dd83e8b86e29c8e93eeb41dd90abbe1857b`: backend 473, frontend 220, executor 11; builds, auditorias, segredos, HTTP/carga/HTTPS e limpeza aprovados. [Relatório](validation/F0_LOCAL_CI_2026-11-17.md), [evidência estruturada](validation/evidence/local-ci-2026-11-17.json) e [protocolo](validation/LOCAL_CI.md). Esse caminho satisfaz a execução dos checks técnicos cobertos durante a restrição, conforme decisão do autor; não exige aguardar a cota, não declara GitHub Actions aprovado nem promove requisitos integrais/G0. Incremento de executor/locks **CONCLUÍDO**; próximas pendências: F0-06 e revisão independente F0-02.

Esclarecimento do autor (16/11/2026): a cota da CI GitHub está esgotada. Para RNF-08/F0-05, registrar execução remota indisponível por essa restrição operacional, sem novas tentativas até restabelecimento. Evidências locais já executadas permanecem válidas em seu escopo; não equivalem a CI remota concluída. Próximo trabalho executável: lock/hashes Python e consolidação local das evidências. Não altera gates nem requisitos integrais.

Validação da área 1 (16/11/2026), código local `0f37c98`: RF-01/RNF-02/RNF-03/RNF-05/RNF-08 recebem evidência F0-04 de HTTPS real com CA local descartável, proxy/cookies/rotação/logout; F0-02 de duas disputas PostgreSQL de revogação/delegação; correções de origens/segredos na inicialização, cabeçalhos/HSTS e exclusão de backup Git dos builds. Suíte PostgreSQL/pgvector 473 aprovados, frontend 220 aprovados/build/lint; auditorias locais aprovadas, CI remota ainda incompleta. Inventário técnico F0-06 reconciliado com o código. [Relatório e limitações](validation/F0_AREA1_2026-11-16.md). **EM REVISÃO**, sem promoção dos requisitos integrais/G0; revisão independente, servidor alvo, diagnóstico CI e decisões responsáveis continuam pendentes.

Continuação F0-02 (09/11/2026): RF-01/RNF-02/RNF-08 recebem correção de vazamento nos seletores HTML e de enumeração por relações/filtros, código `18c13ea`, [PR #24](https://github.com/erik-hp/aelo-psi/pull/24). Dez falhas reproduzidas antes da correção; 164 casos novos aprovados; suíte completa SQLite 455 aprovados/2 ignorados e PostgreSQL/pgvector local 457 aprovados; Ruff/Bandit/check/migrations aprovados. CI de `b3ca6ef` incompleta por falhas de inicialização, com smoke/carga remotos aprovados. [Cobertura e limites](validation/F0_AUTHORIZATION_BOUNDARIES_2026-11-09.md). **EM REVISÃO**, sem promoção dos critérios integrais ou de G0.

Evidência incremental F0-02 (09/11/2026): RF-01/RNF-02/RNF-08 recebem 79 cenários de autorização em `Backend/tests/test_authorization_matrix.py`, código `0dbb833`, [PR #24](https://github.com/erik-hp/aelo-psi/pull/24). Suíte combinada: 291 aprovados/2 ignorados. [Matriz executada e limites](validation/F0_AUTHORIZATION_MATRIX_2026-11-09.md). **EM REVISÃO**; listagens/mutações e demais critérios integrais ainda exigem consolidação. Não promove requisitos completos nem G0.

Evidência incremental F0-01/F0-03 (09/11/2026): RNF-03/RNF-06/RNF-08 recebem remoção de risco automático e escore de atenção da demonstração, revisão por estado documental e correção do nome interno de inconsistências. Código `d8ff5f6`; frontend 220 testes aprovados, build/lint aprovados; baseline backend 212 aprovados/2 ignorados. [Relatório e limitações](validation/F0_2026-11-09.md). **EM REVISÃO**, sem promoção dos critérios integrais ou gates. Mapa das 42 tarefas registrado no Cérebro; os estados da tabela representam aceite completo, não ausência de código parcial.

Adendo de estabilização (06/11/2026): RNF-06/RNF-08 recebem o [plano de investigação de UX/navegação](validation/PLANO_REVISAO_UX_NAVEGACAO.md), e RF-01/RNF-02/RNF-03/RNF-08 o [plano de avaliação do Strix](security/PLANO_AVALIACAO_STRIX.md). Somente pesquisa inicial e planejamento; testes ativos, benchmark prático e redesign pendentes. O marco funcional de 80% não indica cobertura de segurança nem muda o estado de nenhum requisito/gate.

Proposta operacional SC-OP-01 (06/11/2026): [PLANO_OPERACIONAL_CLINICA.md](PLANO_OPERACIONAL_CLINICA.md) relaciona OP-00–OP-11 aos requisitos existentes e distingue refinamentos F0/F1 de ampliações ainda não aprovadas. Pesquisa documental, sem nova implementação, resultado quantitativo ou mudança dos estados de aceite. Requisitos de financeiro/comunicação/portal não foram adicionados como aprovados.

Evidência incremental da auditoria funcional (06/11/2026): RF-01–RF-04 e RNF-02/RNF-03/RNF-06/RNF-08 recebem correções e testes parciais em [AUDITORIA_FUNCIONAL_2026-11-06.md](validation/AUDITORIA_FUNCIONAL_2026-11-06.md). **EM REVISÃO**: cadastro/agendamento/nota persistidos e negações verificadas nos cenários descritos; assinatura/retificação completas, acessibilidade manual, concorrência e IA integral continuam pendentes. Não altera os estados completos dos requisitos ou os gates.

Evidência incremental UI-01 (06/11/2026): RNF-06/RNF-08 recebem a integração visual BoardUI e testes de regressão em [UI_BOARDUI.md](validation/UI_BOARDUI.md). **EM REVISÃO**; os critérios completos desses requisitos continuam não validados e os gates não são alterados.

Evidência incremental da revisão transversal F0 (06/11/2026): RF-01/RNF-02/RNF-03/RNF-08 recebem correções e testes em `Backend/tests/test_api_robustness.py` e `Backend/tests/test_runtime_settings.py`, detalhados no [registro](REGISTRO_EXECUCAO.md). **EM REVISÃO**; estados dos requisitos e gates não mudam.

Proposta de mudança (06/11/2026): [ADR-003](architecture/ADR-003-recuperacao-em-camadas.md) e [ADR-004](architecture/ADR-004-ia-externa.md) relacionam RF-05/RF-06/RNF-03/RNF-07 à recuperação em camadas e à manutenção da inferência local. Correção de contexto do Ollama é evidência incremental de RNF-03. **EM REVISÃO**; estados e gates não mudam.

1. Cada PR cita ID(s) F0–F7 + requisito(s) RF/RNF/VAL.
2. Mudar estado somente com commit/PR e teste/evidência no `REGISTRO_EXECUCAO.md`.
3. Não usar “compliant LGPD”/“FHIR-certified” como estado; registrar controles e riscos residuais.
4. Quando um requisito mudar, avaliar hipóteses, arquitetura, plano, testes e TCC antes do merge.
