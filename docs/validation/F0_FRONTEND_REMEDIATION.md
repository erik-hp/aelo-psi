# F0-05 — Remediação das dependências de produção do front-end

**Estado:** em revisão; a integração está condicionada aos checks no último commit. **G0 permanece bloqueado.**

## Escopo

A atualização preserva React + TypeScript + Vite e altera somente os manifestos de dependências do front-end. Foi executado `npm install --package-lock-only --save-exact axios@latest react-router-dom@latest` e `npm update form-data --package-lock-only` em um GitHub Actions temporário e restrito à branch, que foi **removido após produzir o lockfile**.

| Pacote | Versão anterior no lockfile | Versão nova |
| --- | --- | --- |
| axios | 1.16.1 | 1.20.0 |
| form-data (transitiva) | 4.0.5 | 4.0.6 |
| react-router | 7.16.0 | 7.18.4 |
| react-router-dom | 7.16.0 | 7.18.4 |

## Evidências e limitações

- [GitHub Actions — atualização do lockfile](https://github.com/erik-hp/aelo-psi/actions/runs/39052124534): `npm audit --omit=dev --audit-level=high`, `npm ci`, `npm run lint` e `npm run build` **aprovados**.
- Novos manifests foram commitados pelo GitHub Actions na branch `fix/f0-frontend-dependency-remediation`. O workflow temporário com `contents: write` foi removido antes da integração.
- Reexecutar a rotina padrão do GitHub Actions com o último SHA do PR e verificar o artefato de auditoria. Evitar confundir o status `success` de um workflow com auditorias de segurança realmente aprovadas quando os comandos usam `continue-on-error`.
- A auditoria avalia advisories públicos e não substitui testes de integração com navegador, análise de segurança das rotas, revisão de XSS, nem auditoria das dependências de desenvolvimento.
- Não há liberação para prontuários reais nem conclusão de F0-05/G0. Permanecem pendentes secret scanning, política de bloqueio por vulnerabilidades, lock Python e as demais verificações do plano.

**Próximo passo:** confirmar relatórios da CI após o PR, documentar riscos residuais e realizar varredura de segredos de forma a não expor valores sensíveis em logs ou issues.
