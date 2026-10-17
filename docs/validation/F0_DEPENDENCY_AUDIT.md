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

A preencher após a execução real: URL da run, SHA do commit, resultado de cada auditoria, contagem de alertas classificados, PRs de correção e responsáveis. Não registrar números presumidos.

## Referências internas

- [Plano Mestre](../PLANO_MESTRE_IMPLEMENTACAO.md), item F0-05.
- [Registro de execução](../REGISTRO_EXECUCAO.md).
