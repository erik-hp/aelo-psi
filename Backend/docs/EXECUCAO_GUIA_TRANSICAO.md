# Execução do guia de transição

Data: 2026-11-02. Referências: `GUIA_TRANSICAO_PROXIMA_IA.md`, `CONTRATOS_INTERFACES_VAULT.md` e `MAPA_REFATORACAO_DEBITOS_VAULT.md`.

O inventário consolidado de entregas, erros, correções e pendências está em `RELATORIO_IMPLEMENTACAO_E_VALIDACAO_2026-11-02.md`.

## Implementado sem Docker

- **Fila no banco:** `AnalysisJob` e `VaultJob` registram estado, tentativa, início e erro categórico. `POST /api/analysis/request/` e `POST /api/vault/analyses/{id}/checkpoint/` retornam HTTP 202 com `job_id`. As rotas de status são restritas ao paciente autorizado e auditadas. O frontend acompanha os jobs. `process_vault_jobs` executa a inferência em processo separado e recupera jobs abandonados após dez minutos. A análise persistida é vinculada ao job para evitar duplicação após queda do worker; o checkpoint já tinha unicidade por análise. A purga de retenção inclui os jobs.
- **FastAPI:** cliente `httpx.AsyncClient` no lifespan, retentativa limitada para erros transitórios, circuit breaker que abre por 20 segundos após três falhas de transporte, `/health/live`, `/health/ready` e logs sem payload clínico. Erros de evidência não são repetidos. Há testes diretos do circuit breaker e da falha de readiness quando um modelo exigido está ausente.
- **Django:** timeout padrão de 90 segundos para cada chamada do worker e serializers DRF para respostas do Vault. O código do Vault foi separado em `vault_core/algorithms.py`, `constants.py`, `renderers.py` e `services.py`, com `vault.py` como facade estável.
- **React:** contratos TypeScript, validação Zod, dados sintéticos offline, modal de justificativa, hook `usePatientVault`, componentes de inspeção e linha do tempo, leitor Markdown seguro e Cytoscape com comunidades, zoom e pan. O grafo é carregado sob demanda em um chunk separado. Não há mais corte de 40 nós na renderização; a API ainda limita a resposta a 200 nós e 400 arestas.
- **Integração:** `docker-compose.yml` contém serviço único de migração e worker. `docker-compose.test.yml` e `Dockerfile.test` preparam PostgreSQL com pgvector e instalam as dependências do FastAPI necessárias aos testes de contrato. Foram adicionados testes de contrato Django–FastAPI, de busca vetorial real e Vitest.

## Operação local

1. Configure `Backend/.env` e execute as migrações com `python manage.py migrate` no ambiente do backend.
2. Execute a API Django, o FastAPI e o Ollama conforme `OPERATIONS.md`.
3. Em outro terminal do backend, execute `python manage.py process_vault_jobs`. Para processar apenas um job, use `--once`.
4. O frontend recebe `job_id`, consulta `/api/analysis/jobs/{id}/` ou `/api/vault/jobs/{id}/` até `COMPLETED`/`FAILED` e atualiza o perfil. O worker não registra texto clínico em `error_code`.

## Verificação e limites

No ambiente atual, **36 testes do backend em SQLite**, **37 testes em PostgreSQL/pgvector**, Ruff, checagem de migrações, **2 testes Vitest**, lint e build do frontend passaram. Todas as migrações foram aplicadas em PostgreSQL 16 com pgvector e o teste vetorial confirmou ordenação por distância de cosseno e isolamento por paciente. O bundle principal de produção tem cerca de **1,02 MB antes de gzip** e o grafo Cytoscape está em um chunk sob demanda de **571 kB**; ambos ainda geram aviso de tamanho no Vite. Os testes de IA usam modelos Ollama simulados; o fluxo com Ollama real e carga concorrente ainda precisa de validação. O modo mock usa dados sintéticos e não simula persistência de aprovação. A geração de checkpoints continua dependente de revisão clínica, e a pseudonimização não garante remoção completa de identificadores livres.

### Comandos executados nesta verificação

| Diretório | Comando | Resultado |
|---|---|---|
| `Backend` | `.venv\Scripts\python.exe -m pytest -q` | 36 testes aprovados e um teste pgvector ignorado em SQLite; dois avisos não bloqueantes de dependência/cache |
| `Backend` | `docker compose -f docker-compose.test.yml run --build --rm backend_test` | Migrações aplicadas em PostgreSQL; 37 testes aprovados, incluindo a consulta pgvector |
| `Backend` | `.venv\Scripts\python.exe -m ruff check .` | Sem erros |
| `Backend` | `.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=config.settings_test` | Nenhuma migração faltante |
| `Frontend` | `npm.cmd test` | Dois testes aprovados |
| `Frontend` | `npm.cmd run lint` | Sem erros |
| `Frontend` | `npm.cmd run build` | Build de produção concluído; aviso de tamanho de chunk |
| `Backend` | `docker version` | Docker Desktop 4.97.0 e Engine 29.9.2 disponíveis |

O build e os testes Vitest foram executados fora da sandbox local porque o esbuild recebeu erro de leitura do caminho do projeto dentro dela. O Docker também exigiu execução fora da sandbox para acessar o daemon. A primeira execução do Compose revelou uma chave de teste curta; a segunda aplicou as migrações, mas mostrou que faltavam dependências do FastAPI na imagem e que o teste de auditoria assumia mutação permitida no banco. Corrigidos esses pontos, a terceira execução aprovou 36 testes; a quarta aprovou 37 após inclusão da consulta vetorial. Ao final, `docker compose -f docker-compose.test.yml down` removeu o banco temporário e a rede de teste. A suíte não acessou dados reais de pacientes. A integração com Ollama real ainda não foi exercitada. Não há confirmação de desempenho para grafos com mais de 100 nós; a interface permite tal volume, mas não foi submetida a um teste de carga visual neste ambiente.
