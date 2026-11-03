# F0-05 — Atualização corretiva de dependências Python

**Estado:** PR #8, em revisão. Uso de dados clínicos reais proibido; G0 não liberado.

## Escopo de atualização

- Django 5.2.18 (ramo LTS), DRF 3.17.2, SimpleJWT 5.5.1, Gunicorn 26.2.0.
- django-cors-headers e django-filter atualizados em faixas compatíveis.
- FastAPI 0.143.3, Uvicorn e HTTPX em faixas mais recentes, permitindo resolução transitiva de Starlette sem os avisos registrados neste ciclo.

## Evidência do primeiro ciclo

Commit `35f81657964ed363e29180a11ea27c8575462e1b`:

- [CI funcional #39050565642](https://github.com/erik-hp/aelo-psi/actions/runs/39050565642): Django, React e FastAPI **SUCESSO**.
- [Inventário #39050565637](https://github.com/erik-hp/aelo-psi/actions/runs/39050565637): `pip-audit` do Django informou **nenhuma vulnerabilidade conhecida** na resolução examinada; `pip-audit` da IA relatou **10 avisos em 1 pacote** e código de falha; o `npm audit` do front-end também retornou código de falha.
- O workflow de inventário é **não bloqueante**, então sua conclusão visual como sucesso não significa remediação total.
- Os números são alertas do scanner, não CVEs únicas ou riscos clinicamente avaliados. A classificação específica está pendente de leitura do JSON e revisão das versões realmente instaladas.

## Segundo ciclo — atualização FastAPI

- **Commit:** `3425fd6ac6b52330fb2856b5ee47ecf7910180bb`.
- [CI #39050714933](https://github.com/erik-hp/aelo-psi/actions/runs/39050714933): Django, Frontend e FastAPI **SUCESSO**.
- [Auditoria #39050714961](https://github.com/erik-hp/aelo-psi/actions/runs/39050714961): `pip-audit` Django e FastAPI reportaram **No known vulnerabilities found** nos pacotes resolvidos nesta execução. `npm audit` ainda retornou falha e deve ser tratado separadamente.
- **Critério atendido nesta PR:** remover os avisos conhecidos do inventário inicial da camada Python sem falha dos testes automatizados. A resolução Python ainda não está completamente fixada por lockfile/hashes, portanto novas resoluções podem alterar esses resultados.
- **Não atendido:** vulnerabilidades no frontend, varredura de segredos, testes de implantação e demais critérios G0.

## Decisões e próximas ações

1. Documentar/fixar a resolução transitiva FastAPI/Starlette para reprodutibilidade e revalidar periodicamente o inventário, mesmo após os alertas atuais terem desaparecido.
2. Atualizar dependências npm/lockfile do front-end em PR própria com testes de rotas, autenticação e build.
3. Fixar resolução Python via lock/hashes para resultados reproduzíveis, avaliando políticas de atualização.
4. Introduzir secret scanning e transformar auditoria de vulnerabilidades em gate bloqueante após triagem.
5. Manter `G0 BLOQUEADO` até estes critérios, revisão operacional, governança de segurança e demais pendências do Plano Mestre.

Não afirmar que as dependências estão integralmente seguras apenas pelo CI passar.
