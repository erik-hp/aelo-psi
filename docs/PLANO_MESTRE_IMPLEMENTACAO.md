# AELO-PSI — Plano Mestre de Implementação e Validação (TCC2)

> **Fonte de verdade do trabalho de engenharia. Versão 1.0 — 17/10/2026.**  
> **Estado:** plano aprovado como proposta de execução; nenhuma fase deve ser marcada concluída apenas por constar neste documento.  
> **Documentos complementares:** [ADR-001: Memória Terapêutica Longitudinal](architecture/ADR-001-memoria-terapeutica-longitudinal.md), [matriz de requisitos](MATRIZ_REQUISITOS.md), [registro de execução](REGISTRO_EXECUCAO.md), [instruções para agentes](../AGENTS.md) e [README](../README.md).

## 0. Contrato do projeto

**Adendo de estabilização de 06/11/2026:** [revisão de navegação/UX](validation/PLANO_REVISAO_UX_NAVEGACAO.md) documenta o problema relatado de estrutura e clareza das telas, com análise e pesquisa de frontends a executar (F1-06/F6-01/F6-05). [Avaliação futura do Strix](security/PLANO_AVALIACAO_STRIX.md) detalha o ensaio no marco aproximado de 80% do escopo funcional aprovado pronto/auditável, sem adiar controles F0 ou equivaler a gate de release. Pesquisa/documentação inicial, sem redesign, instalação ou pentest executados nesta rodada.

**Complemento documental de 06/11/2026:** [Plano operacional digital da clínica](PLANO_OPERACIONAL_CLINICA.md), pesquisa e proposta SC-OP-01 solicitadas pelo autor para priorizar a operação antes da análise por IA. Refina capacidades relacionadas a F0/F1 e registra ampliações em backlog; não altera IDs, critérios de aceite ou gates F0–F7. Financeiro, novos papéis, comunicação e portal dependem de decisão de escopo antes de implementação.

**Título acadêmico:** Plataforma Web Inteligente para Gestão Operacional e Auxílio ao Monitoramento Terapêutico em Clínicas de Psicologia.

**Problema:** carga de documentação e dificuldade de recuperar contexto de narrativas clínicas acumuladas ao longo de múltiplas sessões.

**Objetivo do artefato:** preservar o prontuário e ajudar profissionais habilitados a gerir pacientes/sessões, recuperar evidências do histórico e produzir *rascunhos assistivos* e visualizações longitudinais rastreáveis, **sem decisões clínicas autônomas**.

**Diferencial delimitado:** Memória Terapêutica Longitudinal Inteligente (MTLI): notas interligadas por temas/eventos, temporalidade, evidências e revisão humana, implementada *dentro do AELO-PSI*; **não requer Obsidian**, Neo4j ou treinamento contínuo de LLM com prontuários.

**Fundamento científico:** Design Science Research (DSR), com artefato, ciclos de revisão, demonstração e avaliação; SUS e UMUX-Lite para usabilidade percebida, medições de tempo/tarefas e avaliação técnica de RAG/memória.

**Ambiente-alvo do TCC:** execução local/autogerida; testes acadêmicos com dados sintéticos; infraestrutura real de clínicas somente depois de revisão técnica, profissional, jurídica e de segurança. Não alegar certificação, adequação integral à LGPD, aprovação CEP ou validação clínica enquanto não demonstradas.

**Restrições inegociáveis:**

1. Nenhum conteúdo clínico, vetor, prompt, log ou análise pode ser consultado por outro paciente ou clínica. Autorizar sempre no servidor, inclusive serviços internos, e testar negação.
2. A versão assinada de cada nota clínica é preservada; correções geram retificação/versionamento, não sobrescrita invisível.
3. **Fonte de verdade:** nota original com autor, sessão, versão e carimbo temporal. Resumo/índice/grafo são derivados, revogáveis e reconstruíveis.
4. Toda afirmação apresentada como histórica precisa de fonte verificável (nota, versão, trecho). Falta de evidência => abstenção ou aviso.
5. IA é assistiva: não diagnostica, não estima automaticamente risco de suicídio/recidiva, não prescreve condutas, não altera o prontuário sem ação explícita de profissional habilitado.
6. Indicação de sentimento/valência é um sinal **linguístico exploratório**, não um escore diagnóstico, risco, humor real ou evolução clínica comprovada.
7. Falha do Ollama/índice/serviço => erro explícito e rastreável; **nunca respostas de demonstração ou números fabricados rotulados como análise**.
8. NER e pseudonimização são mitigação, não anonimização garantida; embeddings e trechos podem continuar sendo dados pessoais.
9. Sem uso de dados de pacientes reais nos testes/demonstrações ou repositório; somente sintéticos, salvo autorização e governança efetiva formalizadas em etapa posterior.
10. Não reescrever o monorepo sem prova de necessidade e ADR: preservar Django REST Framework, React/Vite/TypeScript, FastAPI, PostgreSQL e Ollama.

## 1. Inventário do estado inicial — verificado no código, não validado em execução

Base de avaliação: `main` do repositório `erik-hp/aelo-psi`, código consultado em 17/10/2026. A inspeção estática **não equivale** a build verde, testes executados ou conformidade jurídica.

| Camada | Já existe | Dívida comprovada/pendência |
| --- | --- | --- |
| Interface | React 18, TypeScript, React Query, roteamento; dashboards, pacientes, agenda, auditoria, visualizações | Mock de finanças e alguns dados/métricas clínicas; valores derivados artificialmente; sem testes de UX/integração observados |
| API | Django + DRF, JWT, modelos `Clinic`, `Patient`, `PatientAccess`, `TherapySession`, `ClinicalNote`, `AIAnalysis`, `AuditLog` | Autorização insuficiente em consultas/ações; superusuário/admin vê registros entre clínicas; criação de sessão exige endurecimento; gestão de usuários global |
| Prontuário | Texto bruto, versão, `ClinicalNoteHistory` e `locked_at` | Campos de notas em texto claro; `locked_at` não bloqueia de fato atualização/destruição; assinatura clínica não concluída |
| IA | FastAPI separado e chamada ao Ollama; guarda textual `Do not diagnose` | Sem RAG vetorial; apenas notas recentes; fallback gera resultado/scores arbitrários quando IA falha |
| Privacidade | Substituição regex de CPF/telefone/e-mail/nome principal; log básico | Não há comprovação de NER robusto/isolamento de chaves/cristalização de logs; token de atualização em localStorage; segredos de desenvolvimento conhecidos |
| Infra | `Backend/docker-compose.yml` para PostgreSQL/Django/FastAPI/Ollama | PostgreSQL sem pgvector no compose; seed executada automaticamente com credencial fixa; portas internas expostas; sem CI e benchmark demonstrados |

**Regra:** qualquer divergência posterior neste inventário deve ser atualizada por revisão do código e evidência registrada; nunca apagar dívida conhecida por mera intenção.

## 2. Arquitetura de referência (alvo)

```text
Navegador React/TypeScript
  ├── Gestão operacional: pacientes, sessões, agenda, usuários
  ├── Prontuário: rascunho → revisão → assinatura → retificação
  ├── Memória clínica: linha do tempo, ligações, evidências e revisões
  └── Análises: síntese pré-sessão com fontes e métricas exploratórias
          │ HTTPS / autorização por objeto
          ▼
Django REST Framework (domínio, permissões, trilha, versão, APIs)
          │
          ├── PostgreSQL + pgvector
          │     ├── pacientes/sessões/notas/versionamento
          │     ├── chunks/embeddings/índice textual
          │     └── memória: eventos, relações, evidências, revisões
          │
          └── Serviço IA (FastAPI) — somente por chamada autenticada
                ├── desidentificação e checagem
                ├── embeddings e extração estruturada
                ├── recuperação híbrida e síntese citada
                └── Ollama (modelos locais versionados)
```

**Regras de contexto:** Django determina o paciente autorizado e prepara consultas escopadas; o serviço IA recebe somente o mínimo necessário, não decide autorização; não disponibilizar Ollama/serviço de IA publicamente. Retenção, backup e gestão de chaves têm estratégia própria antes de qualquer uso real.

**Evolução por alterações pequenas:** novas entidades em `Backend/apps/patient_memory/`; APIs REST bem tipadas; front-end organizado progressivamente por domínio em `Frontend/src/features/`. Não migrar Django para FastAPI nem mover tudo de uma vez. Adotar schema/API estável e migrações reversíveis quando viável.

## 3. Ordem de execução, etapas e critérios de aceite

**IDs imutáveis:** usar `F0-01` etc. em issues, commits/PRs e [matriz de requisitos](MATRIZ_REQUISITOS.md). Cada fase depende da anterior; paralelizar só trabalhos que não contornem gates de segurança.

### F0 — Diagnóstico reproduzível e contenção de riscos (bloqueia todas as outras)

| ID | Implementação concreta | Entregáveis e evidência de aceite |
| --- | --- | --- |
| F0-01 | Inventariar comandos de build, dependências, testes e endpoints, executar ambiente com dados sintéticos | Relatório versionado, `docker compose config`, `manage.py check`, `npm run build` e falhas documentadas (não supor sucesso) |
| F0-02 | Centralizar política de acesso `clinic + patient + role + patient grant + operation` para **todos** os endpoints, inclusive sessões, notas, IA, dashboard, usuários, auditoria e filtros | Testes positivos e negativos de BOLA/IDOR, acesso cruzado clínica/paciente e escalonamento; nenhum cenário de vazamento passa |
| F0-03 | Remover fallback clínico fictício da IA e valores simulados dos dados reais do front-end, mantendo mocks **apenas** em modo demo claramente sinalizado | Ausência de `fallback_analysis` devolvendo números; erro `FAILED` exibido; análises reais sem números arbitrários |
| F0-04 | Remover seed automática do comando de inicialização e credenciais fixas, endurecer `DEBUG`, chaves, cookies/tokens, throttling e exposição de portas | Bootstrap manual de desenvolvimento sem senha padrão, configurações de produção que falham fechadas, testes de login/refresh |
| F0-05 | Instalar scaffolding de teste/CI e revisão: lint, typecheck, pytest, migrations check, dependências e varredura de segredos | Pipeline reproduzível em PR; critérios de falha bem definidos |
| F0-06 | Definir inventário/fluxo de dados e rascunho do RIPD, papéis controlador/operador, bases legais, retenção e incidentes a validar | Mapa de dados e riscos em `docs/privacy/`; pendências de validação jurídica explícitas |

**Gate G0:** risco de acesso cruzado corrigido e testado; ausência de análises falsificadas; aplicação inicial reproduzível ou bloqueadores documentados; testes mínimos executados. **Sem G0, não iniciar indexação de conteúdo clínico.**

### F1 — Núcleo clínico confiável e gestão operacional

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F1-01 | Entidades e regras de pacientes, vínculos profissionais/estagiários, regras de acesso por equipe e consistência clínica/tenant | API e fixtures com 2 clínicas, 2 profissionais e 2 pacientes por clínica; casos positivos/negativos |
| F1-02 | Fluxo de agendamento, conflito de horários, estados de sessão, cancelamento e remarcação | Testes de conflitos/estado, tarefas operacionais executáveis |
| F1-03 | Nota clínica como `DRAFT → IN_REVIEW → SIGNED`, com assinatura de profissional habilitado, trava e retificação `AMENDED` | Assinatura por usuário autorizado, impossibilidade de PATCH/DELETE após assinatura, histórico verificável e exportação de notas assinadas |
| F1-04 | Criptografar campos clínicos e cópias derivadas com estratégia de envelope/KMS ou equivalente local; gerenciar rotação e migração de registros | Projeto de chaves, testes ida/volta/rotação e impossibilidade de ler conteúdo por acesso somente ao DB |
| F1-05 | Auditoria de leitura, alteração, assinatura, acesso negado, exportação, análise e revisão; endurecer integridade e proteção do log | Eventos correlacionados, sem texto clínico em logs, teste contra alteração e política de retenção |
| F1-06 | UX de registros: salvar rascunho, diferenciação de papéis, assinatura/retificação explícitas, feedback de erro | Testes de fluxo completo e teclado; sem ações clínicas implícitas |

**Gate G1:** prontuário íntegro e testado; autorização/clínica e criptografia operacionais; histórico/assinatura auditáveis; sem regressão de G0.

### F2 — Indexação e RAG rastreável (memória base)

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F2-01 | Habilitar PostgreSQL + pgvector com migrações Django; schema de chunks/embeddings com referência a `note_id`, versão, offsets e paciente | Índice versionado e constraints verificadas, migração + rollback testados em base sintética |
| F2-02 | Pipeline de desidentificação antes do processamento, incluindo NER em português e regex, medição de falso negativo e contexto que ainda identifica pessoas | Conjunto de teste sintético com nomes, parentesco, números, locais e casos ambíguos; limitações documentadas |
| F2-03 | Chunking e embeddings em português (modelo fixado/versionado, processamento local), reindexação idempotente, invalidação por retificação | Busca reproduzível sobre sessões antigas; zero duplicação após reprocessar |
| F2-04 | Recuperação híbrida: texto integral + vetor + tempo, escopo por paciente no banco **antes** da consulta e filtros de estado documental | Benchmark `Recall@k`, `MRR` e testes de isolamento, inclusive consultas adversariais |
| F2-05 | Geração com saída validada por schema e evidências imutavelmente referenciadas; abstenção para falta de fontes e isolamento contra prompt injection documental | Afirmações com links exatos para nota/versão/trecho; respostas sem evidência não promovidas a clínicas; erros explícitos |
| F2-06 | Tela de pesquisa e síntese pré-sessão: evidência clicável, status de revisão e transparência do método | Tarefa de recuperar evento remoto no histórico; métricas de acerto/latência |

**Gate G2:** pesquisa em histórico completo; citações verificáveis; nenhuma fonte de paciente errado; teste de falha de IA e injeção; baseline de métricas registrado.

### F3 — MTLI: ligações semânticas, temporalidade e revisão humana

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F3-01 | Modelos `ClinicalMemoryItem`, `MemoryEvidence`, `MemoryRelation`, `MemoryReview`, `MemorySnapshot` e `AIProcessingRun` conforme ADR-001 | Migrações, constraints por paciente/tenant e testes de integridade referencial |
| F3-02 | Extração estruturada com origem da informação (`PATIENT_REPORT`, `CLINICIAN_OBSERVATION`, `AI_INFERENCE`), data relatada/documentada e confiança operacional | Casos sintéticos de negação, contradição, temporalidade e diferença entre relato e inferência |
| F3-03 | Propor relações `RELATES_TO`, `RECURS_ON`, `PRECEDES`, `CONTRASTS_WITH`, `REPORTED_CHANGE`; impedir causalidade automática | Relações `PENDING_REVIEW` nunca entram na memória validada sem revisão |
| F3-04 | Psicólogo aceita, ajusta ou rejeita item/relação; revisionamento de memória derivada e invalidadores | Auditoria de revisão, correção rastreável e rollback de índices derivados |
| F3-05 | Snapshot cumulativo com referências, atualização incremental e reindexação após retificação | Sessão 1 permanece recuperável depois da sessão 50; índices não substituem notas |
| F3-06 | Visualizar linha do tempo, mapa de temas/links e comparador de sessões; versão alternativa em lista acessível | Testes de navegação, filtros e leitores de tela; nenhum grafo público |

**Gate G3:** relações justificadas e revisadas; proveniência temporal validada; linha do tempo consistente com notas; métricas de recuperação comparadas ao G2.

### F4 — Indicadores longitudinais exploratórios e explicabilidade

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F4-01 | Estabelecer definições operacionais e riscos de valência textual em português, classes e casos negados/irônicos, sem equivaler a estado mental | Protocolo de anotação e limitações revisadas com psicólogo |
| F4-02 | Criar pipeline e snapshots temporais com versão do modelo, tipo/quantidade de texto, incerteza e ausência de dado | Série temporal reproduzível e testes com frases ambíguas |
| F4-03 | Mostrar gráficos com pontos vinculados à sessão, fonte e aviso interpretativo; indisponibilidade distinta de zero | Sem `moodScore = 0` como fallback; usuários reconhecem incerteza |
| F4-04 | Comparar coerência com avaliação humana de temas, e avaliar vieses linguísticos e variações por extensão de nota | Métricas de erro e matriz de casos de falha, conclusão científica cautelosa |

**Gate G4:** índices com definição metodológica, origem e limites visíveis; não classificar gravidade/risco do paciente; aprovação de revisão clínica.

### F5 — Interoperabilidade e governança do dado

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F5-01 | Definir versão/perfil FHIR explícito (inicialmente R4 para escopo acadêmico), mapeamento `Patient`, `Encounter`, `DocumentReference`, `Provenance` e `Observation` quando legítima | `docs/interoperability/FHIR_MAPPING.md` + schemas e decisões de terminologia |
| F5-02 | Exportação portável autenticada e restrita, validação de schema e recusa de exportar rascunhos como oficiais | Testes com validador FHIR; revisões de privacidade; erros de referência tratados |
| F5-03 | Políticas operacionais de retenção, resposta a incidentes, cópias cifradas, restauração e integridade de auditoria | Simulações de restauração e incidentes, sem expor conteúdo |
| F5-04 | Finalizar RIPD e checklist LGPD/CFP com fundamentação e revisão responsável | Artefatos avaliados; lacunas registradas sem afirmações de conformidade plena |

**Gate G5:** exportação correta/limitada, documentação da governança, riscos não resolvidos explicitados.

### F6 — Usabilidade, acessibilidade e avaliação DSR

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F6-01 | Criar roteiro de tarefas (agendar, recuperar tema antigo, revisar nota/IA, consultar histórico), piloto e critérios de observação | Protocolo replicável e instruções do facilitador |
| F6-02 | Definir participantes do estudo, critérios de inclusão/exclusão, consentimento, estratégia CEP e gravação com base nas aprovações efetivas | Protocolo aprovado **quando exigível** antes da coleta real; status documental sem simulação |
| F6-03 | Aplicar SUS (10 itens) e UMUX-Lite (2 itens) com instruções/escores conforme literatura; evitar tratar os instrumentos como idênticos | Planilha/script com dados sintéticos de teste, validação de cálculo |
| F6-04 | Comparar manual x RAG simples x MTLI: tarefa, tempo, sucesso, confiança, `Recall@k`, precisão de citações, abstenção, taxa de erro, p95 | Dataset sintético versionado e método explícito de amostragem/análise |
| F6-05 | Corrigir barreiras de usabilidade, navegação por teclado, foco, estados de erro e contraste visando WCAG 2.2 AA | Testes automatizados complementados por avaliação manual de acessibilidade |
| F6-06 | Redigir resultados DSR, limitações, ameaças à validade e lições aprendidas, sem inventar resultados | Evidências e referências vinculadas a tabelas/resultados efetivos |

**Gate G6:** evidências de avaliação reproduzíveis; conclusões limitadas aos dados observados; exigências éticas de pesquisa cumpridas.

### F7 — Fechamento acadêmico e empacotamento

| ID | Implementação concreta | Entregáveis e evidência |
| --- | --- | --- |
| F7-01 | Revisar capítulos do TCC para refletir exatamente o que foi implementado, versão de código e metodologia real | Matriz objetivo → requisito → teste → evidência → seção do TCC |
| F7-02 | Entregar setup local, diagramas finais, manual não técnico/técnico, API, riscos e runbooks | Nova pessoa consegue reproduzir com dados sintéticos |
| F7-03 | Executar suíte final, dependências, backup/restore, segredo e isolamento; versionar release e capturar artefatos | Checklist final assinável, relatório de testes e release reproduzível |
| F7-04 | Preparar demonstração com cenário fictício, respostas fundamentadas e plano de contingência sem métricas inventadas | Roteiro de banca, repositório e evidências em versão fixa |

**Gate G7:** artefato demonstrável e documentação consistente com o código, não “produto clínico homologado”.

## 4. Precedência obrigatória

```text
F0 (segurança e baseline) → F1 (prontuário confiável)
                               ↓
                     F2 (RAG com fontes)
                               ↓
                     F3 (memória temporal)
                               ↓
                     F4 (indicadores)
                               ↓
                     F5 (FHIR e governança)
                               ↓
                     F6 (avaliação científica)
                               ↓
                     F7 (entrega do TCC)
```

Acessibilidade e privacidade são transversais e começam no F0. Preparação dos protocolos DSR deve começar cedo, mas coleta efetiva requer a situação ética aplicável definida. A escolha de modelo LLM/embedding é experimental e versionável; manter adapters para troca sem mudar o domínio.

## 5. Definição de pronto (DoD) para qualquer tarefa

Uma tarefa só passa a **CONCLUÍDA** quando:

- [ ] Está vinculada a um ID F`n`-XX e requisito(s) da matriz, com escopo e cenários de erro.
- [ ] Código e documentação relevantes foram atualizados; sem mudanças de arquitetura implícitas.
- [ ] Autorização por clínica/paciente/papel/ação foi aplicada onde cabível, inclusive erro/filtro/listagem.
- [ ] Dados sensíveis não surgem em logs, resposta indevida, arquivo de exemplo ou teste de captura.
- [ ] Migrações são seguras, versionadas e testadas quando há alteração de schema.
- [ ] Testes automatizados cobrem sucesso, recusa e regressões; comandos/resultado ficam no PR.
- [ ] Interface contempla carregamento, ausência de dados, falha e acessibilidade básica.
- [ ] Funcionalidades de IA exigem fontes, abstenção e revisão; modelo/prompts/dataset versionados.
- [ ] Evidências verificáveis de execução anexadas (ou limitações claramente descritas).
- [ ] Gate da fase revisado; `REGISTRO_EXECUCAO.md` atualizado **somente com fatos verificados**.

Se um item não se aplica, documentar *por quê*; não marcar “testado” sem rodar.

## 6. Política de gestão de mudanças (anti-desvio)

1. **Abrir trabalho:** ler `AGENTS.md`, este plano, matriz, registro e ADR-001; confirmar branch/commit e código real.
2. **Escolher:** o menor item pendente **da fase não bloqueada**; criar issue/checklist com ID, dependências, arquivos, critério de aceite e evidências.
3. **Projetar:** descrever contratos, esquema, impacto LGPD e estratégia de teste; decisões incompatíveis com ADR precisam de nova ADR antes de mudar código.
4. **Executar:** PR pequeno na branch de tarefa; sem edições diretas em `main`; nunca migrar stack sem decisão registrada.
5. **Verificar:** rodar testes e auditoria de permissões, checar diferenças da API/UI, registrar comandos e saídas verdadeiras.
6. **Fechar:** PR revisado, atualizar matriz/registro e registrar gate; se bloqueado, marcar `BLOQUEADO` com motivo.
7. **Mudança de escopo:** registrar solicitação, motivação, impacto em hipótese/risco/prazo, opções e decisão de responsável/orientador; somente então modificar este plano e a ADR.
8. **Regra de prioridade:** segurança/validade clínica > fidelidade ao prontuário > rastreabilidade > requisitos do TCC > conveniência de implementação > estética.

**Estados permitidos:** `NÃO INICIADO`, `EM ANDAMENTO`, `BLOQUEADO`, `EM REVISÃO`, `CONCLUÍDO`. Não usar porcentagens subjetivas como evidência.

**Ponto de sincronização entre conversas:** ler `docs/REGISTRO_EXECUCAO.md`, último PR/commit e testes antes de continuar. Nenhuma IA tem “memória” de execução superior ao Git e ao registro.

## 7. Plano de testes e evidências da banca

| Camada | Ferramenta/estratégia alvo | Evidência |
| --- | --- | --- |
| Django/API | pytest/pytest-django ou unittest Django, factories sintéticas | Autorização, idempotência, versão, assinatura, migração, erro de IA |
| Serviço IA | pytest + fake Ollama, contratos Pydantic | Fallback recusado, saída inválida, prompts maliciosos, referências |
| React | Vitest + Testing Library, Playwright para fluxos críticos | Tipagem, login, editor, revisão, estados de erro e bloqueio |
| Segurança | OWASP ASVS v5.0 para checklist e testes BOLA/IDOR, dependências, segredos | Matriz de controles e relatório com riscos residuais |
| Qualidade RAG | Dataset sintético gold com evidências de nota/versão e testes de regressão | `Recall@k`, cobertura remota, precisão de citação, taxa não fundamentada, p95 |
| DSR/UX | SUS, UMUX-Lite, tarefas cronometradas, observação e entrevistas | Dados de pesquisa protegidos, protocolo, estatística descritiva, limitações |
| Interoperabilidade | Validação FHIR R4 e casos de exportação | Bundles válidos, fontes/provenance e limites de exportação |

**Metas de integridade (go/no-go):** 0 vazamentos em cenários testados de tenant/paciente; 0 respostas que substituam silenciosamente indisponibilidade de IA por “análise” fabricada; 100% das **afirmações históricas exibidas como fundamentadas** com referência verificável; 0 alterações in-place de registros assinados. São critérios de aceite, **não resultados atuais**. Para eficácia do algoritmo, registrar baseline e fixar metas quantitativas após piloto sintético para não fabricar valores sem evidência.

## 8. Compliance e correções acadêmicas obrigatórias

**Não afirmar equivalências incorretas:**
- Resolução CFP **09/2024**: exercício profissional mediado por TDICs; **não** é norma que “proíbe IA emitir diagnósticos” nos termos previamente descritos. Complementar com posicionamento CFP sobre IA (2025) e avaliar normas aplicáveis.
- Resolução CFP **001/2009**: fonte histórica sobre registro documental; **confirmar situação normativa vigente e demais resoluções pertinentes** antes de declarar aderência ou vigência.
- Art. 20 da LGPD: revisão de decisão **unicamente automatizada**, não fundamento direto para exigir log imutável ou assinatura de cada sumário. Logs/explicações também se relacionam a princípios de segurança, prevenção e prestação de contas.
- RAG não elimina alucinações; processamento local não basta para cumprir LGPD; desidentificação não significa anonimização irreversível.
- Norma aplicável, evidência de teste e conclusão de conformidade devem constar separadamente.

**Referências verificáveis e escopo:**
- [LGPD — Lei 13.709/2018 (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — orientações para RIPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd)
- [CFP — posicionamento de IA, 2025](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/)
- [OWASP ASVS v5.0](https://github.com/OWASP/ASVS)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [HL7 FHIR R4](https://hl7.org/fhir/R4/)

A revisão ética/CEP, papel dos participantes, consentimento e bases jurídicas são trabalhos especializados com decisões documentadas; a existência do plano não lhes atribui aprovação.

## 9. Riscos, respostas e decisões pendentes

| Risco | Prevenção/verificação | Bloqueia |
| --- | --- | --- |
| Vazamento clínico cruzado | Testes de autorização por objeto em todo endpoint, escopo no query e inspeção de logs | G0/G1/G2 |
| Texto desidentificado mas reidentificável | Avaliação de contexto, minimização, criptografia, controle de embeddings e retenção | G2 |
| Alucinação ou citação incorreta | Exigir ancoragem, checagem de citações, abstenção e revisão humana | G2/G3 |
| Deriva da memória / falso nexo causal | Separar fatos vs hipóteses, estados de revisão, proveniência e versionamento | G3 |
| Indicador de valência parecer diagnóstico | Definição lingüística explícita, fontes, método, incerteza e revisão profissional | G4 |
| Custo computacional local/limites GPU | Benchmark de latência e memória; modelos leves/versionados | G2–G4 |
| Prazo acadêmico e acesso a voluntários | Priorizar MVP G0–G3, protocolos sintéticos, confirmar cronograma e CEP | G6 |
| Mudança da stack ou escopo sem justificativa | ADR obrigatória + matriz de impacto, decisão registrada | Todos |
| Documentação divergente do código | DoD exigindo README/registro/evidências por PR | Todos |

**Pontos que precisam de decisão antes da execução correspondente:** seleção final de modelos e dimensões de embeddings; implantação de chaves de criptografia; política de assinatura adequada ao contexto institucional; versionamento FHIR; capacidade de hardware; cronograma oficial e status CEP. Registrar em ADR ou `REGISTRO_EXECUCAO.md`, nunca assumir.

## 10. Próxima tarefa autorizada

**F0-01** é a primeira etapa: tornar o build reproduzível, auditar endpoints e criar uma linha de base técnica com testes. Em paralelo estritamente documental, levantar F0-06. Em seguida F0-02/F0-03 tratam autorização e análises fictícias. A arquitetura MTLI de F3 **não** deve ser implementada antes dos gates G0–G2.

> **Critério de rumo:** quando surgir nova ideia, avaliar se fortalece o problema científico ou se desvia do escopo. Se desvia, registrar no backlog futuro sem introduzir no MVP.
