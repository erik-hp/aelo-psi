# F0-05 — Executor local de qualidade

**Decisão de processo autorizada pelo autor em 16/11/2026:** durante o esgotamento da cota do GitHub Actions, executar a validação automatizada localmente. Essa execução pode cumprir os checks técnicos F0-05 quando completa e vinculada ao commit; não é necessário esperar a cota para continuar o desenvolvimento. Não registra uma execução fictícia do GitHub, altera proteções ou libera G0 por si só. RF-01/RNF-02/RNF-03/RNF-08 continuam sujeitos aos seus critérios integrais.

## Executar

Pré-requisitos: Git, Python 3.12 ou superior, Docker Desktop com motor Linux e Compose 2.24.4 ou superior. Internet para imagens, instalação e consultas de vulnerabilidades; não exige GitHub Actions, conta em outro provedor ou servidor público. O primeiro build pode demorar; builds seguintes reutilizam o cache Docker.

Na raiz do repositório:

```powershell
python tools/local_ci.py
```

No computador de desenvolvimento também pode ser usado `Backend/.venv/Scripts/python.exe tools/local_ci.py`. Para uma versão específica, acrescente `--ref <commit>`. O código a testar precisa estar commitado: o executor usa `git archive`, não copia `.env`, alterações não commitadas, pastas pessoais, `node_modules` ou backups ignorados. O manifesto informa quando alterações locais foram excluídas. O script em execução precisa ser idêntico ao do commit escolhido.

Resultado: `reports/local-ci/<execucao>-<sha>/manifest.json`, logs por etapa, JUnit backend, JSON frontend, arquivo do código e `SHA256SUMS`. O processo retorna **0 somente se todas as etapas e limpezas terminarem com sucesso**; falha, timeout ou serviço ausente retorna código diferente de zero. Não há opção de omitir etapas e ainda aprovar o relatório.

Para conferir integridade e resultado:

```powershell
python tools/local_ci.py --verify reports/local-ci/<execucao>-<sha>
```

Hashes detectam alterações nos artefatos em relação ao manifesto local; não são assinatura digital nem atestado independente. O resultado é evidência local identificada como `local-docker`, com `github_actions_used: false`. Não publique logs ou artefatos sem revisar sua classificação; a pilha de teste usa somente dados sintéticos.

## Cobertura dos workflows

| Origem | Checks locais obrigatórios |
| --- | --- |
| Baseline | Compose de desenvolvimento/TLS; Django check, migrate/migrations drift e testes dos apps; compilação/testes unitários IA; lint e build TypeScript/Vite |
| Qualidade | Suíte completa PostgreSQL/pgvector, Ruff, Bandit, pip check, frontend completo, imagens API/IA sem root, Caddy validate |
| Segurança dinâmica | Smoke HTTP; carga k6 de 10 usuários/30 segundos; smoke após carga; HTTPS/proxy/cookies com CA descartável e deploy check |
| Dependências | Locks Python com versões e hashes; recusa de inputs/locks alterados sem regenerar; pip-audit incluindo ferramentas CI; npm audit completo no nível moderate |
| Segredos | Gitleaks da árvore do commit e de todo o histórico disponível, ambos bloqueantes, sem rede no scanner, saída de achados suprimida |
| Próprio executor | Testes de sucesso, recusa, falha/timeout, usuário root, proteção de saída do scanner, adulteração de relatório e alteração de dependências |
| Inventário F0-06 | Comparação de 28 modelos/235 campos declarados com o catálogo revisado, sem consultar dados do banco; schema novo/desatualizado bloqueia a execução |

Os workflows remotos são preservados. A indisponibilidade deles é registrada separadamente; o executor local passa a ser o caminho de execução autorizado enquanto durar a restrição. Não replica o ambiente gerenciado do GitHub nem o isolamento de uma máquina independente: são containers Linux no computador de desenvolvimento. O protocolo é automatizado e reexecutável por outro revisor.

## Isolamento e limpeza

Cada rodada cria projetos Compose e imagens com nomes exclusivos. Bancos são temporários; não publica portas de teste nem usa o Compose da instalação local. Um arquivo vazio de interpolação evita carregar o ambiente da aplicação. Testes, builds e migrações usam o código arquivado; chamadas reais de IA não são necessárias para os testes de contrato/falha.

Ao terminar, inclusive com falha, o executor encerra apenas seus próprios projetos, bancos e CA descartável. Imagens de build e relatórios ficam disponíveis para auditoria/cache. Não apaga volumes de outros projetos. Nenhum token de GitHub, credencial clínica ou chave de produção é passado aos containers.

As imagens-base ainda usam tags versionadas por família (`python:3.12-slim`, `node:22-alpine`, Caddy e pgvector); os IDs efetivamente construídos são registrados na rodada. Isso e os hashes de dependências tornam os inputs auditáveis, sem alegar build binariamente idêntico entre épocas ou hosts.

## Atualizar dependências Python

Declarações editáveis: `Backend/requirements/base.txt`, `ai.txt`, `dev.txt` e `ci.in`. Locks gerados para Linux/Python 3.12: `base.linux-py312.lock`, `ai.linux-py312.lock`, `ci.linux-py312.lock`; manifesto `locks.json`. Dockerfiles instalam com `--require-hashes`. Os locks Linux não substituem as declarações para um ambiente Windows nativo.

Dentro de um container Linux/Python 3.12 com a pasta `Backend` montada em `/work`, execute:

```sh
python -m pip install pip-tools==7.6.2
python scripts/compile_requirements.py
python scripts/verify_requirements.py
```

O compilador fixa também dependências de ferramentas, incluindo pip, e não emite URLs de índice/credenciais. O executor falha se as declarações mudarem sem regenerar os locks. Commitar declarações, locks e manifesto juntos, executar o pipeline completo e revisar auditorias antes de integrar.

## Limites e estado

Este mecanismo contorna a indisponibilidade de computação hospedada; não omite controles, altera planos de cobrança, publica o repositório privado ou registra checks falsos. Não configura serviço permanente nem runner externo no computador. Revisão independente, governança, implantação no servidor alvo e demais critérios G0 continuam separados.

**Executor local implementado e verificado em 17/11/2026:** commit `759f9dd83e8b86e29c8e93eeb41dd90abbe1857b`, 42 etapas aprovadas em 450,45 s; 473 testes PostgreSQL/pgvector, 220 frontend e 11 do executor, sem falhas. Subsuítes Django/IA também passaram e têm sobreposição com a suíte principal. [Relatório da execução](F0_LOCAL_CI_2026-11-17.md) e [resumo estruturado com hashes](evidence/local-ci-2026-11-17.json). A falta de cota remota deixa de ser bloqueador operacional dos checks cobertos por essa execução local autorizada; os demais requisitos/gates continuam sujeitos às próprias evidências. Referências de implementação: [pip-tools e hashes](https://pip-tools.pypa.io/en/stable/reference/pip-compile/), [merge/reset do Docker Compose](https://docs.docker.com/reference/compose-file/merge/).

**Ampliação F0-06 verificada:** `4156153`, **43 etapas aprovadas**, com catálogo de schema, 478 testes backend, 220 frontend e 11 do executor. [Relatório do inventário/governança](F0_PRIVACY_2026-11-17.md). O resultado anterior permanece evidência histórica da implantação do executor.
