# F0-02 — matriz incremental de autorização clínica

Data: 09/11/2026. Código `0dbb833`, [PR #24](https://github.com/erik-hp/aelo-psi/pull/24), branch `fix/f0-03-sem-classificacao-risco`. Requisitos RF-01/RNF-02/RNF-08. **EM REVISÃO; não libera G0.**

Implementado `Backend/tests/test_authorization_matrix.py`: 72 combinações de leitura (8 endpoints × 9 identidades) e 7 tentativas de processamento sem autorização de escrita. Dados sintéticos persistidos, views/serializers DRF reais e nenhuma chamada a modelo externo. Os controles existentes passaram: não foi necessário alterar autorização de produção nesta entrega.

## Matriz executada

| Ação / endpoint | Psicólogo responsável ou editor | Psicólogo com leitura | Estagiário com leitura | Admin operacional | Sem grant, grant revogado ou outra clínica | Anônimo |
|---|---|---|---|---|---|---|
| GET nota clínica individual | 200 | 200 | 200 | 404 | 404 | 401 |
| GET sessão individual | 200 | 200 | 200 | 404 | 404 | 401 |
| GET análise individual | 200 | 200 | 200 | 404 | 404 | 401 |
| GET job de análise | 200 | 200 | 200 | 404 | 404 | 401 |
| GET grafo do paciente | 200 | 200 | 200 | 404 | 404 | 401 |
| GET job de checkpoint | 200 | 200 | 200 | 404 | 404 | 401 |
| GET checkpoint individual | 200 | 200 | 200 | 404 | 404 | 401 |
| GET exportação FHIR | 200 | 200 | 200 | 403 | 404 | 401 |
| POST solicitar análise | Sucesso já coberto em `test_vault_jobs.py` | 403 | 403 | 404 | 404 | 401 |

Responsável e editor são duas identidades distintas nos testes; sem concessão, concessão revogada e outra clínica são três. Isso totaliza nove identidades, contando anônimo, administrador, leitor e estagiário. A exportação FHIR reproduz a política existente de concessão clínica de leitura; não homologa a política documental nem o perfil FHIR. Admin pode resolver o cadastro, mas recebe 403 na exportação por não ter acesso clínico.

Nos acessos negados, os testes verificam ausência do texto sintético de nota/checkpoint na resposta. No POST negado, verificam também que nenhuma tarefa de análise foi criada. Não imprimem conteúdo clínico ou tokens.

## Resultados executados

- `Backend/.venv/Scripts/python.exe -m pytest tests/test_authorization_matrix.py -q -p no:cacheprovider`, dentro de Backend: **79 aprovados**.
- Suíte combinada `Backend/.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider`, dentro de Backend: **291 aprovados, 2 ignorados**, 1 aviso de depreciação Starlette/httpx.
- `Backend/.venv/Scripts/python.exe -m ruff check tests/test_authorization_matrix.py`: sem erros.
- Frontend não alterado após a entrega F0-03: **220 testes/build/lint aprovados**, conforme [relatório](F0_2026-11-09.md).

São testes de autorização por objeto com `force_authenticate`, isolados em SQLite: não exercitam JWT/rede/TLS, concorrência PostgreSQL ou modelo real. Esses assuntos têm suítes/evidências próprias. A matriz não mede cobertura percentual de toda a API e não substitui revisão independente.

## Evidência remota anterior e próximos passos

No SHA `ab65768`, anterior aos 79 casos novos, os quatro workflows passaram: [baseline](https://github.com/erik-hp/aelo-psi/actions/runs/42665185762), [qualidade e segurança](https://github.com/erik-hp/aelo-psi/actions/runs/42665185615), [dependências](https://github.com/erik-hp/aelo-psi/actions/runs/42665185726), [segredos](https://github.com/erik-hp/aelo-psi/actions/runs/42665185581). Qualidade incluiu PostgreSQL/pgvector, smoke HTTP, carga curta e verificação posterior à carga. A passagem desta rodada não esclarece a causa da falha intermitente histórica. Verificar CI do SHA final do PR antes de merge.

Próximo incremento F0-02: completar matriz de listagens/filtros, mutações, grants, revisão/assinatura e download de checkpoint, correlacionando os testes já existentes e tratando somente falhas reproduzidas. Depois consolidar configuração/CI F0-04/F0-05 e validação responsável F0-06. G0 permanece bloqueado.
