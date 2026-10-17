# F0-05 — Inventário de vulnerabilidades em dependências

**Status:** em revisão. **Não é certificação de segurança nem liberação do G0.**

## Objetivo

Avaliar dependências de três superfícies existentes no AELO-PSI: Django REST, FastAPI/Ollama e bibliotecas de execução do React. A nova rotina GitHub Actions `.github/workflows/dependency-audit.yml` produz relatórios JSON de `pip-audit` e `npm audit`.

A verificação é **não bloqueante por enquanto**, pois esta primeira rodada estabelece o inventário, inclusive se houver dependências vulneráveis. Falha de auditoria **não** significa ausência de vulnerabilidade; implica necessidade de triagem. Não confundir CI aprovado de build/testes com dependências livres de vulnerabilidades.

## Procedimento de revisão dos resultados

1. Abrir a execução **AELO-PSI Dependency Audit** na aba Actions do GitHub.
2. Ler o resumo por componente e baixar artefato `dependency-inventory`.
3. Para cada alerta, registrar: biblioteca e versão resolvida, ID da vulnerabilidade, impacto na aplicação, caminho de exploração plausível e correção mínima compatível.
4. Atualizar bibliotecas em PR separado; executar testes completos e repetir auditoria.
5. Se um alerta não puder ser resolvido, registrar a justificativa, medidas compensatórias e decisão de risco. Não suprimir silenciosamente problemas.
6. Após estabilizar os resultados, transformar verificações relevantes de alta gravidade em checks obrigatórios, com critérios discutidos e registrados.

## Limitações

- Dependências Python ainda são especificadas como intervalos, não com lock/hashes de versões exatas; resultados podem mudar a cada execução. Considerar lock reproduzível em tarefa posterior.
- A auditoria do front-end usa o lockfile npm e escopo de dependências de produção; ferramentas de build também precisam de verificação própria.
- Não varre código de aplicação, segredos de Git, controles de runtime, Docker images, prompt injection ou comportamento clínico.
- Guardar somente relatórios técnicos; nunca colocar dados de pacientes nos artefatos.
- O repositório não deve ser usado com prontuários reais enquanto os gates exigidos estiverem bloqueados.

## Evidências

**Primeira execução real:** [GitHub Actions #39049549738](https://github.com/erik-hp/aelo-psi/actions/runs/39049549738), commit `c1b9c7b3de45a7676b90f7d684bc9346a512cd7e`.

- O log de `pip-audit` informou **21 vulnerabilidades conhecidas em 4 pacotes** nas dependências Django, e **14 vulnerabilidades conhecidas em 1 pacote** no serviço de IA. São contagens do scanner, não avaliação de explorabilidade ou de severidade.
- O comando `npm audit --omit=dev --audit-level=high` teve saída de status zero na execução consultada. Isso não garante ausência de vulnerabilidades em dependências de desenvolvimento, nem contempla todas as ameaças.
- **Atenção:** o job geral terminou com sucesso porque os comandos foram configurados com `continue-on-error`; os comandos `pip-audit` retornaram erro. **F0-05 não passou em uma avaliação de segurança.**
- O arquivo de relatórios `dependency-inventory` foi publicado como artefato da run. É necessário baixar os JSONs, identificar bibliotecas e advisories, classificar impactos e abrir PRs de correção.
- Os três jobs existentes de build/teste (Django, Frontend e IA) da [run #39049549707](https://github.com/erik-hp/aelo-psi/actions/runs/39049549707) foram aprovados, mas isso não resolve esses alertas.

**Situação:** `BLOQUEADO PARA FECHAMENTO G0` até triagem e correção/aceite fundamentado das vulnerabilidades. Nunca confundir relatório verde de inventário com ausência de falhas.


### Pacotes identificados no artefato JSON da execução

| Ecossistema | Pacote | Versão examinada | Quantidade de avisos reportados | Encaminhamento |
| --- | --- | --- | --- | --- |
| Django | `django` | 5.0.14 | 13 | Atualizar para ramo atualmente mantido após verificar compatibilidade |
| Django | `djangorestframework` | 3.15.2 | 2 | Avaliar atualização para versão com correções (scanner cita 3.17.2) |
| Django | `djangorestframework-simplejwt` | 5.3.1 | 2 | Avaliar atualização para versão corrigida (scanner cita 5.5.1) |
| Django | `gunicorn` | 21.2.0 | 4 | Avaliar versão corrigida e smoke test de servidor |
| FastAPI | `starlette` | 0.37.2 | 14 | Exige atualização compatível de FastAPI/Starlette e testes de integração |
| Front-end | `axios`, `form-data`, `react-router`, `react-router-dom` | Ver `frontend-production.json` | 4 avisos no total (3 altos e 1 moderado) | Atualizar lockfile e testar rotas/autenticação |

Essas contagens refletem entradas retornadas pelos scanners; alguns identificadores aparecem duplicados no JSON, portanto **não** representam necessariamente CVEs únicas. Não atribuir severidade aos alertas Python sem analisar cada advisory.

**Próxima PR:** atualizações compatíveis em lotes pequenos, com testes de integração, validação de API, migrações e rerun dos mesmos três auditores. O projeto não deve ser implantado com dados reais.

## Referências internas

- [Plano Mestre](../PLANO_MESTRE_IMPLEMENTACAO.md), item F0-05.
- [Registro de execução](../REGISTRO_EXECUCAO.md).
