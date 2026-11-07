# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AELO-PSI é o artefato de um TCC: plataforma para clínicas de psicologia com apoio de IA local, sempre sob revisão humana.

## Leia antes de alterar

- `AGENTS.md`: invariantes técnicos e éticos permanentes. Seguem válidos, inclusive dados só sintéticos, autorização no back-end e falha explícita da IA.
- `Frontend/AGENTS.md`: regras obrigatórias do BoardUI para qualquer código de interface (componentes, tokens semânticos, tipografia).
- `docs/REGISTRO_EXECUCAO.md`: situação comprovada e próxima tarefa. Registre nele fatos verificados.
- `docs/PLANO_MESTRE_IMPLEMENTACAO.md` e `docs/MATRIZ_REQUISITOS.md`: fases F0–F7, gates e requisitos. **G0 segue bloqueado.**
- `docs/architecture/`: ADRs. ADR-003 define a recuperação em camadas; ADR-004 mantém o Ollama como único destino de conteúdo clínico.

Decisões do autor que ajustam esses documentos:

- `1 - TCC/` é um repositório Git separado (`erik-hp/tcc-cofre`), o "Cérebro". Os textos em `wiki/tcc/` são do TCC1, já avaliado: servem só para consulta e não devem ser editados. `raw/` nunca é alterado. Regras do cofre em `1 - TCC/Gemini.md`.
- O projeto atual prevalece sobre o que o TCC1 previu. Isso não relaxa invariantes de segurança nem gates sem confirmação do autor.

## Comandos

Windows: o ambiente Python fica em `Backend/.venv/Scripts/python.exe`, mostrado abaixo como `python`.

### Backend (a partir de `Backend/`)

```bash
python -m pytest -q -p no:cacheprovider                    # SQLite; 2 testes pgvector são ignorados
python -m pytest -q -p no:cacheprovider tests/test_lod_retrieval.py
python -m pytest -q -p no:cacheprovider tests/test_lod_retrieval.py -k nome_do_teste
python manage.py test apps --noinput --settings=config.settings_test   # só os testes de apps/
python -m ruff check .
python manage.py makemigrations --check --dry-run --settings=config.settings_test
```

`config.settings` recusa iniciar sem segredos no ambiente. Para comandos locais de `manage.py`, use `--settings=config.settings_test`. Ele define segredos de teste e SQLite em memória.

Pilhas isoladas, com `-p` próprio para não tocar nos containers de desenvolvimento:

```bash
docker compose -p aelo-teste -f docker-compose.test.yml run --build --rm backend_test        # PostgreSQL/pgvector, banco alvo
docker compose -p aelo-teste -f docker-compose.test.yml down -v
docker compose -p aelo-smoke -f docker-compose.security.yml run --build --rm security_smoke  # HTTP real, Caddy e CSP
docker compose -p aelo-smoke -f docker-compose.security.yml down -v
```

Avaliações sintéticas não são coletadas pela suíte e devem ser chamadas explicitamente:

```bash
python -m pytest -q -s -p no:cacheprovider tests/evaluate_lod_retrieval.py
python -m pytest -q -s -p no:cacheprovider tests/evaluate_deidentification.py
python tests/evaluate_extraction.py     # exige Ollama, ou AELO_EVAL_ENGINE=claude; usa só as notas fixas do script
```

Desenvolvimento: `docker compose up --build -d` em `Backend/`, com `.env` criado a partir de `.env.example`. O seed não roda automaticamente, e o modelo do Ollama precisa de `ollama pull`.

### Frontend (a partir de `Frontend/`)

```bash
npm run dev
npm run lint
npm test                                        # vitest run
npx vitest run src/services/clinicalMappers.test.ts
npx vitest run src/pages/AgendaPage.test.tsx -t "nome do teste"
npm run build                                   # tsc -b && vite build
```

A CI roda em UTC. Testes de data devem funcionar em qualquer fuso: confira com `TZ=UTC`.

## Arquitetura

```text
React/Vite → Django REST (domínio, autorização, auditoria) → PostgreSQL/pgvector
                     │ fila no banco
              worker process_vault_jobs → FastAPI (ai_service) → Ollama
```

Django decide o que pode ser lido e prepara o contexto. `ai_service` é um processo separado, sem acesso ao banco, autenticado por `AI_SERVICE_TOKEN`, que não decide autorização. Inferência nunca roda dentro de uma requisição HTTP: as rotas enfileiram e retornam 202.

### Autorização

`apps/patients/access.py::accessible_patients` é o ponto central, e todo acesso clínico deve partir dele com `clinical=True` e, para escrita, `write=True`. Acesso clínico exige `PatientAccess` explícito. Admin vê o diretório, mas nunca conteúdo clínico. Estagiário só lê. Editar nota ou sessão exige ser o autor ou o profissional responsável, além do grant.

### Dados clínicos

- `EncryptedTextField`/`EncryptedJSONField` (`services/security/encrypted_fields.py`) cifram na aplicação com AES-256-GCM. Por isso, PostgreSQL não consegue buscar nesses campos: filtros sobre texto clínico precisam ocorrer em memória, depois da autorização.
- `ClinicalNote` usa exclusão lógica, `version` e `ClinicalNoteHistory`. `locked_at` bloqueia edição e exclusão. Salvar nota não assina nem aciona análise.
- `audit()` (`apps/audit_logs/services.py`) aceita só metadados de uma lista permitida e grava em cadeia HMAC. Em PostgreSQL, triggers impedem alterar eventos. `AuditReadMixin` já audita `list` e `retrieve`; não audite de novo.

### Pipeline de IA (`apps/ai_analysis`)

- `services.build_context` monta o contexto. `prepare_ai_text` (`services/security/anonymization.py`) mascara por regras e **bloqueia** o envio se restar identificador direto; não é anonimização completa.
- `retrieval.py`: seleção em camadas por grafo e texto original, com vagas por rota, sem penalizar idade. Desligada por `AI_LOD_RETRIEVAL`.
- `vault_core/services.py` separa `extract_note_graph` (lê a nota e valida), `persist_note_graph` (grava de forma idempotente por nota) e `create_checkpoint` (único que trava a nota). O checkpoint exportado exige revisão assinada com ECDSA.
- `AI_AUTO_EXTRACTION` enfileira `NoteExtractionJob` ao salvar nota. `settings.py` só aceita a opção com `AELO_SYNTHETIC_DATA_ONLY=True` e sem HTTPS.
- `ai_service/main.py`: `generate_json` define `num_ctx` e `shift: false`, porque o Ollama descarta o início de prompts longos com HTTP 200. `literal_graph` mantém só conceitos com rótulo e evidência copiados da nota, e citações são conferidas contra o contexto. Rótulos interpretativos são recusados de propósito.

### Frontend

- `services/runtime.ts::isApiMode` separa API real de demonstração. Dados de `mockData.ts` só existem na demonstração, em desenvolvimento, e nunca como fallback de falha da API.
- Access token fica só em memória (`authStorage`). Refresh token fica em cookie HttpOnly, renovado por `api/client.ts` com o cabeçalho `X-AELO-Session`. Logout e troca de sessão limpam o cache do React Query.
- `api/collections.ts` percorre as páginas sem enviar credenciais à URL de `next`. Listagens paginadas no backend precisam de ordem total: `UnorderedObjectListWarning` reprova os testes.
- Páginas autenticadas usam `React.lazy` em `routes/AppRoutes.tsx`, com `Suspense` e `RouteErrorBoundary` em `AppLayout`.
- `components/base` e `foundations` são BoardUI; `components/ui` adapta esses componentes às telas.

## Testes

Pytest coleta `test_*.py`, `tests.py` e `tests_*.py`, tanto em `Backend/tests/` quanto em `apps/`. A fixture `records` (`tests/conftest.py`) cria clínicas, usuários e grants sintéticos. Comportamento dependente de banco, como `select_for_update`, pgvector e triggers, só é validado de fato em PostgreSQL. Os scripts `tests/live_*_smoke.py` não são testes unitários e rodam nas pilhas Docker.
