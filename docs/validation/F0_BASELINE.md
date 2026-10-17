# F0-01 — Linha de base técnica e limites de verificação

**Data:** 17/10/2026 · **Branch:** `fix/f0-baseline-tenant-ai-integrity`  
**Status:** EM REVISÃO — aguardando GitHub Actions, testes e inspeção de regressões.

## O que foi inspecionado

- `Frontend/package.json`: Vite, TypeScript, ESLint; scripts `npm run lint`, `npm run build`.
- `Backend/requirements/base.txt`: Django 5.0.x, DRF, PostgreSQL, SimpleJWT.
- `Backend/requirements/ai.txt`: FastAPI, Pydantic e HTTPX.
- `Backend/docker-compose.yml`: serviços `db`, `api`, `ai-service`, `ollama`; seed de demonstração automático e portas expostas (F0-04 pendente).
- `Backend/config/urls.py`: endpoints de usuários, pacientes, sessões, notas, análises, auditoria, dashboard.
- `.github/workflows/ci.yml` (proposta desta branch): três jobs para front-end, Django e serviço de IA.

## Execução local nesta sessão

- **Git clone privado:** tentado, não executável neste container (sem acesso DNS à `github.com`); acesso à árvore e arquivos foi feito pelo conector GitHub.
- **Docker:** indisponível no ambiente desta sessão. `docker compose up/config` **não executados**.
- **Node:** 22.16.0 disponível no container, mas código privado não está clonado no filesystem; `npm ci`/`build`/`lint` **não executados**.
- **Python:** disponível, sem dependências do app instaladas; checks Django/FastAPI completos **não executados**.
- **GitHub Actions:** workflow foi adicionado à branch; aguarda o resultado do PR. Falha de qualquer job impede marcar G0 concluído.

## Correções propostas paralelamente ao baseline

- F0-02 (parcial): política comum de paciente/clínica e escopo clínico, incluindo endpoints existentes.
- F0-03 (parcial): falha de Ollama/JSON inválido vira erro explícito, sem fallback de análise fabricada; representação longitudinal simulada retirada do modo conectado à API.
- Testes: isolamento por clínica/permissão em Django; indisponibilidade e validação de schema do serviço de IA.
- **Ainda pendente:** auditoria completa de leitura, gestão segura de chaves, criptografia do prontuário, assinatura, substituição de credenciais padrão, modelo de métricas e avaliação independente de respostas. Estes pontos não foram declarados concluídos.

## Critérios de liberação

- [ ] CI Django verde (checagem, migrations e testes).
- [ ] CI React verde (lint e build).
- [ ] CI serviço IA verde (compile e testes).
- [ ] Inspeção manual de privacidade do diff (admin, usuário e filtro por objeto).
- [ ] Validação explícita por responsáveis de qualquer exposição temporária de ambiente.
- [ ] Atualizar `docs/REGISTRO_EXECUCAO.md` com resultados do PR antes de merge.

**Não usar com dados clínicos reais.** Nenhum teste de conformidade LGPD/CFP foi concluído apenas pela criação deste documento.
