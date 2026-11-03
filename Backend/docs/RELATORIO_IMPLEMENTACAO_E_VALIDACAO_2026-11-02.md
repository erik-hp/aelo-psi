# Relatório de implementação e validação do Vault Cognitivo

Data: 2026-11-02. Escopo: execução do `GUIA_TRANSICAO_PROXIMA_IA.md` e validação posterior com Docker Desktop, PostgreSQL 16 e pgvector. Este relatório registra o estado observado no ambiente de desenvolvimento; não equivale à homologação clínica ou de produção.

## 1. O que foi feito

| Área | Entrega | Arquivos principais |
|---|---|---|
| Processamento assíncrono | `AnalysisJob` e `VaultJob` persistidos no banco; endpoints retornam HTTP 202 e permitem acompanhar o estado; worker separado processa e recupera jobs abandonados; vínculo da análise ao job evita duplicação após retomada. | `apps/ai_analysis/models.py`, `jobs.py`, `views.py`, `management/commands/process_vault_jobs.py`, migrações `0010` a `0012` |
| Resiliência da IA | Cliente HTTP no lifespan do FastAPI, retentativa limitada para falhas de transporte, circuit breaker, endpoints de liveness/readiness e erros operacionais sem texto clínico. Timeout do Django alinhado em 90 segundos. | `ai_service/main.py`, `requirements/ai.txt`, `config/settings.py` |
| Contratos e segurança do Vault | Serializers DRF, tipos TypeScript, validação Zod, checagem de evidência literal, checkpoints com SHA-256, revisão assinada e autorização por paciente. | `apps/ai_analysis/serializers.py`, `vault_core/`, `Frontend/src/types/vault.ts`, `Frontend/src/schemas/vault.ts` |
| Interface | Grafo Cytoscape com comunidades, inspeção de nós, linha do tempo, leitor Markdown, modal de justificativa e dados sintéticos em modo offline. O código do grafo é carregado sob demanda. | `Frontend/src/components/patients/`, `Frontend/src/hooks/usePatientVault.ts`, `Frontend/src/services/clinicalService.ts` |
| Testes e execução | Compose de testes com PostgreSQL 16/pgvector, dependências Django e FastAPI, teste real de distância de cosseno e proteção de auditoria adaptada ao banco. | `docker-compose.test.yml`, `Dockerfile.test`, `tests/test_vault_vector_postgres.py`, `tests/test_audit_integrity.py` |

Os detalhes do fluxo e dos endpoints estão em `VAULT_GRAPHRAG.md`, `API_EXAMPLES.md` e `OPERATIONS.md`. O histórico da fase sem Docker está em `EXECUCAO_GUIA_TRANSICAO.md`.

## 2. Erros observados e soluções

| Momento | Erro ou sintoma | Causa confirmada | Solução e verificação |
|---|---|---|---|
| Antes da instalação do Docker | `docker` não era reconhecido no terminal. | Docker Desktop ainda não estava disponível. | O usuário instalou e iniciou Docker Desktop 4.97.0; `docker version`, `docker compose version` e `docker run --rm hello-world` passaram no PowerShell do usuário. |
| Acesso ao Docker nesta sessão | `Access is denied` em `.docker/config.json` e `permission denied` no pipe do daemon. | Restrição da sandbox da ferramenta, não falha do Docker Desktop. | Com execução autorizada fora da sandbox, `docker version` confirmou cliente e servidor 29.9.2 no contexto `desktop-linux`. |
| Primeira execução do Compose de teste | `ImproperlyConfigured: DJANGO_SECRET_KEY must be a unique random secret with at least 50 characters`. | Valor de demonstração em `docker-compose.test.yml` era curto para a validação de `config/settings.py`. | A chave **somente de teste** foi alongada; na execução seguinte todas as migrações aplicaram no PostgreSQL. A chave continua inadequada para produção. |
| Coleta dos testes no contêiner | `ModuleNotFoundError: No module named 'fastapi'` e `No module named 'httpx'`. | `Dockerfile.test` instalava `requirements/dev.txt`, mas os testes de contrato importam o microsserviço e exigem `requirements/ai.txt`. | O Dockerfile passou a instalar ambos; a coleta seguiu até a execução dos testes. |
| Teste de integridade em PostgreSQL | `Audit entries cannot be modified` ao tentar adulterar um registro. | A migração `audit_logs/0004_postgres_append_only.py` instala um trigger que bloqueia `UPDATE`/`DELETE`; o teste havia sido escrito para SQLite, onde a mutação é permitida. | O teste agora verifica a rejeição pelo banco no PostgreSQL e preserva a detecção por hash em SQLite. A suíte PostgreSQL passou. |
| Build e Vitest locais | O esbuild não conseguia ler o caminho do projeto dentro da sandbox. | Restrição de acesso da sandbox local. | Build e testes executados fora dela; ambos passaram. Não houve mudança de código para contornar a restrição. |

Avisos não bloqueantes: `StarletteDeprecationWarning` no TestClient; no Windows, o pytest não conseguiu gravar `.pytest_cache`; no build do Vite, os chunks principais ainda excedem 500 kB. Nenhum desses avisos causou falha nos testes ou no build.

## 3. Evidência de validação

| Execução | Resultado |
|---|---|
| `docker compose -f docker-compose.test.yml run --build --rm backend_test` em `Backend` | Migrações aplicadas em PostgreSQL 16 com pgvector; **37 testes passaram**, um aviso não bloqueante. |
| Teste `test_patient_scoped_cosine_search_on_pgvector` | Consulta `CosineDistance` real ordenou dois vetores e excluiu o nó de outro paciente. |
| `.venv\Scripts\python.exe -m pytest -q` em `Backend` | **36 passaram, 1 ignorado** (o teste pgvector exige PostgreSQL). |
| `.venv\Scripts\python.exe -m ruff check .` | Sem erros. |
| `manage.py makemigrations --check --dry-run --settings=config.settings_test` | Nenhuma migração faltante. |
| `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` em `Frontend` | **2 testes passaram**; lint e build concluídos. |

O teste com Docker foi executado quatro vezes durante a correção: a primeira identificou a chave curta; a segunda aplicou migrações e identificou dependências ausentes; a terceira aprovou 36 testes; a quarta aprovou 37 após incluir a busca vetorial. `docker compose -f docker-compose.test.yml down` encerrou e removeu o banco e a rede temporários. Os dados de teste eram sintéticos.

## 4. O que falta

| Prioridade | Pendente | Critério para concluir |
|---|---|---|
| Alta | Testar o ciclo completo com **Ollama real**: nota pseudonimizada → análise → extração → checkpoint → revisão → exportação. | Executar com modelos instalados, registrar versões, latência, falhas, citações aceitas/rejeitadas e confirmar que não há dados clínicos em logs. Usar apenas dados sintéticos ou autorizados. |
| Alta | Validar concorrência e recuperação de worker em PostgreSQL. | Executar múltiplos workers e solicitações simultâneas; confirmar uma única análise/checkpoint por job, transições de estado corretas e recuperação após interrupção. |
| Alta | Revisão de privacidade da pseudonimização e do fluxo para Obsidian. | Avaliar texto livre e embeddings com responsáveis pelos dados; definir política de exportação, acesso, retenção e revisão humana antes de usar prontuários reais. |
| Média | Medir desempenho do grafo e do frontend em históricos maiores. | Testar mais de 100 nós, aproximação dos limites de 200 nós/400 arestas da API e tempos de carregamento; decidir paginação, agregação ou ajuste de limites. |
| Média | Avaliar fidelidade e utilidade clínica com conjunto de referência autorizado. | Definir casos anotados, critérios de evidência, revisão de especialistas e métricas RAGAS; publicar resultados e limites. As métricas **não** são calculadas pelo checkpoint atual. |
| Média | Validar implantação de produção. | Testar Compose de produção, TLS, segredos independentes, backup/restauração, monitoramento e health checks no ambiente alvo. O Compose de teste não substitui essa validação. |

O grafo atual associa relações ao horário da **nota**. Uma linha do tempo de eventos extraídos de dentro da narrativa clínica, consultas Cypher/Apache AGE e inferência diagnóstica automatizada não fazem parte da implementação validada. Essas propostas do plano de pesquisa exigem decisão de escopo, dados de referência e revisão clínica antes de serem apresentadas como entregues.
