# F0-02 — listagens, seletores, mutações e revisão assinada

**Data:** 09/11/2026. **Base:** `32d57e6`. **Código:** `18c13ea`, continuação no [PR #24](https://github.com/erik-hp/aelo-psi/pull/24). **Requisitos:** RF-01/RNF-02/RNF-08. **Estado:** EM REVISÃO; G0 permanece bloqueado.

## Falhas reproduzidas antes da correção

| Caminho | Comportamento anterior | Evidência |
|---|---|---|
| API navegável, `Accept: text/html`, em notas/sessões | Os seletores gerados pelo DRF exibiam nomes/códigos de pacientes de outra clínica, embora a lista JSON estivesse escopada | 2 testes falharam por presença do marcador sintético estrangeiro no HTML |
| POST de nota/sessão com paciente sem autorização | A relação era resolvida globalmente: ID existente retornava erro de permissão e ID inexistente retornava erro de chave inválida | 4 testes falharam pela diferença nos detalhes das respostas |
| Filtros relacionais de notas/sessões/análises | ID existente sem autorização retornava 200/vazio; inexistente retornava 400, revelando existência | 4 testes falharam pela diferença de status |

São dez cenários efetivamente executados antes de alterar a implementação, com dados sintéticos. Nenhum acesso a pacientes reais, exploração em produção ou envio a modelo externo foi realizado.

## Correção e contrato

- `ClinicalNoteSerializer` e `TherapySessionSerializer` limitam os querysets das relações **antes** de resolver IDs ou renderizar opções. Pacientes exigem escrita clínica; sessões de notas exigem também profissional autor e ausência de exclusão. Sem contexto de usuário, as opções ficam vazias.
- `ScopedRelationFilterBackend` substitui o backend genérico de filtros. Validação e formulários de filtros usam pacientes/sessões autorizados e usuários/clínica do tenant. A restrição intersecta o queryset original. Modelos relacionais novos ficam indisponíveis até receber política explícita.
- As rotas, campos e respostas de sucesso autorizadas foram preservados. A resposta de filtros com ID **não autorizado** muda deliberadamente de 200/vazio para 400, igual à de um ID inexistente. No POST, as duas situações usam o mesmo erro de relação, descontando apenas o ID informado pelo próprio solicitante.
- Nenhuma migração, dependência, modelo de IA ou funcionalidade fora do escopo F0-02 foi adicionada. Não se removeu a API navegável: suas opções agora respeitam autorização.

## Cobertura executada nesta continuação

As fixtures da matriz anterior foram centralizadas em `tests/conftest.py`, preservando os seus 79 casos. Dois arquivos novos acrescentam **164 cenários**:

| Conjunto | Verificação |
|---|---|
| `test_authorization_boundaries.py` — 20 casos | HTML de três endpoints; POST de relações paciente/sessão; filtros entre clínicas e entre pacientes sem grant; filtros operacionais de clínica/usuário |
| `test_authorization_actions.py` — 144 casos | Listagens/contagens e filtros positivos; PATCH/DELETE por grant e autoria; delegação/revogação e efeito imediato; diretórios de usuários/auditoria; revisão assinada; download e adulteração |

As nove identidades são: responsável, editor, leitor, estagiário leitor, administrador, sem concessão, concessão revogada, outra clínica e anônimo. Os dados incluem dois pacientes na mesma clínica e um em outra clínica; a autorização de um paciente não libera o outro.

Resultados relevantes:

- Editor de paciente não pode alterar ou excluir a nota/sessão de outro autor. Responsável pode alterar/excluir o próprio registro não travado, conforme política existente.
- Leitor e estagiário não ganham escrita, delegação ou revisão assinada. Admin mantém cadastro/equipe/auditoria operacionais, sem acesso clínico implícito.
- Concessão/revogação são verificadas por resposta e estado persistido; leitura deixa de funcionar após revogação.
- Revisão usa chave P-256 gerada para o ensaio e assinatura real do payload. Repetir a revisão ou usar a assinatura em outra análise é recusado. Aceitação e rejeição válidas são testadas.
- Download de checkpoint exige escopo de paciente, revisão verificável e conteúdo/hash íntegros. Alterações em Markdown, hash, análise ou assinatura são recusadas sem devolver texto. A política de leitura/exportação existente é exercitada, sem homologação documental.
- Assinatura aqui significa **revisão de análise IA**. O fluxo completo de assinatura/retificação de nota clínica F1-03 continua pendente.

## Comandos realmente executados

Dentro de `Backend`:

| Comando | Resultado |
|---|---|
| `.venv/Scripts/python.exe -m pytest tests/test_authorization_boundaries.py -q -p no:cacheprovider --tb=short`, antes da correção | 10 falhas reproduzidas |
| `.venv/Scripts/python.exe -m pytest tests/test_authorization_boundaries.py tests/test_patient_access.py tests/test_operational_flows.py -q -p no:cacheprovider --tb=short`, após a correção inicial | 20 aprovados |
| `.venv/Scripts/python.exe -m pytest tests/test_authorization_actions.py tests/test_authorization_boundaries.py -q -p no:cacheprovider --tb=short`, após ampliar/corrigir os testes | 164 aprovados |
| `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider --tb=short` | **455 aprovados, 2 ignorados**, 1 aviso Starlette/httpx |
| `.venv/Scripts/python.exe -m ruff check .` | Sem erros |
| `.venv/Scripts/python.exe manage.py check --settings=config.settings_test` | Sem problemas |
| `.venv/Scripts/python.exe manage.py makemigrations --check --dry-run --settings=config.settings_test` | Nenhuma alteração |

Na raiz, `git diff --check` passou após retirar uma linha vazia excedente da fixture compartilhada. A primeira versão dos testes ampliados comparava UUID Python com string; as expectativas foram corrigidas para verificar o JSON HTTP. Essas falhas de teste não são contabilizadas como defeitos do produto.

## Limites e próxima tarefa

Resultados locais usam SQLite e autenticação forçada para isolar autorização. HTML foi renderizado pela própria API, sem inspeção visual em navegador. Não repetir alegações de PostgreSQL, JWT/TLS, concorrência ou modelo real com base nesses resultados; conferir a CI do SHA final antes de merge. Frontend não foi alterado nem retestado localmente nesta continuação.

O incremento destacado de listagens/filtros, mutações, concessões e revisão/download está implementado e verificado nos cenários acima. Isso não prova cobertura exaustiva de toda a API nem encerra RF-01/RNF-02. Permanecem revisão independente, concorrência/revogação em execução e consolidação dos controles de implantação.

**Próximo item F0:** F0-04, validar o ambiente de implantação, TLS/proxy e falhas fechadas, sem reduzir os controles de autorização. Em seguida, pendências F0-05 e validação responsável F0-06. Nenhum gate foi promovido.
