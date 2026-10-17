# F0-05 — Atualização corretiva de dependências Python

**Estado:** PR #8, em revisão. Uso de dados clínicos reais proibido; G0 não liberado.

## Escopo de atualização

- Django 5.2.18 (ramo LTS), DRF 3.17.2, SimpleJWT 5.5.1, Gunicorn 26.2.0.
- django-cors-headers e django-filter atualizados em faixas compatíveis.
- FastAPI, Uvicorn e HTTPX com faixas mais recentes; o artefato de IA ainda precisa de maior atualização/triagem do Starlette transitivo.

## Evidência do primeiro ciclo

Commit `35f81657964ed363e29180a11ea27c8575462e1b`:

- [CI funcional #39050565642](https://github.com/erik-hp/aelo-psi/actions/runs/39050565642): Django, React e FastAPI **SUCESSO**.
- [Inventário #39050565637](https://github.com/erik-hp/aelo-psi/actions/runs/39050565637): `pip-audit` do Django informou **nenhuma vulnerabilidade conhecida** na resolução examinada; `pip-audit` da IA relatou **10 avisos em 1 pacote** e código de falha; o `npm audit` do front-end também retornou código de falha.
- O workflow de inventário é **não bloqueante**, então sua conclusão visual como sucesso não significa remediação total.
- Os números são alertas do scanner, não CVEs únicas ou riscos clinicamente avaliados. A classificação específica está pendente de leitura do JSON e revisão das versões realmente instaladas.

## Decisões e próximas ações

1. Identificar a versão transitiva `starlette` resolvida pelo FastAPI e cada advisory restante. Não forçar uma versão incompatível: atualizar FastAPI/Starlette conjuntamente em PR testada, ou registrar riscos residuais.
2. Atualizar dependências npm/lockfile do front-end em PR própria com testes de rotas, autenticação e build.
3. Fixar resolução Python via lock/hashes para resultados reproduzíveis, avaliando políticas de atualização.
4. Introduzir secret scanning e transformar auditoria de vulnerabilidades em gate bloqueante após triagem.
5. Manter `G0 BLOQUEADO` até estes critérios, revisão operacional, governança de segurança e demais pendências do Plano Mestre.

Não afirmar que as dependências estão integralmente seguras apenas pelo CI passar.
