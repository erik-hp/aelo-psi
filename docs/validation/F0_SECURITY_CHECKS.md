# F0-05 — Verificações automáticas de segredos e dependências

**Data:** 17/10/2026 · **Estado:** entrega incremental; não é aprovação G0.

**Atualização de 17/11/2026:** locks/hashes e [executor local integral por commit](LOCAL_CI.md) implementados e verificados, com [42 etapas aprovadas](F0_LOCAL_CI_2026-11-17.md). Essa decisão autorizada contorna a cota GitHub e resolve a pendência de execução automatizada coberta; não exige aguardá-la nem promove G0. As pendências originais abaixo são históricas e devem ser confrontadas com essa evidência.

## Implementação

- `.github/workflows/secret-scanning.yml`: Gitleaks v8.30.1 em container Docker, executado com `--network none`, volume de checkout somente leitura, `--redact` e sem imprimir saída de detecção. A árvore atual é **bloqueante**; o histórico Git completo é **informativo** e exige análise privada caso exista alerta ou erro.
- `.github/workflows/dependency-audit.yml`: `pip-audit` Django, `pip-audit` IA e `npm audit --omit=dev --audit-level=high` de produção agora **bloqueiam o workflow** se falharem. `npm audit --audit-level=high` incluindo ferramentas de desenvolvimento foi acrescentado como inventário inicialmente não bloqueante.
- Os relatórios de auditoria de dependências são artefatos com retenção curta. Segredos encontrados **nunca devem ser reproduzidos em issues, relatórios públicos ou texto acadêmico**.

## Evidências da primeira execução

- [Secret scanning #39056220574](https://github.com/erik-hp/aelo-psi/actions/runs/39056220574): job `secrets` concluído com **success**. A ausência de falha bloqueante é evidência da passagem da árvore atual; o histórico exige consultar o resumo protegido do workflow e não constitui, por si só, garantia de inexistência de segredos antigos.
- [Dependency Audit #39056220430](https://github.com/erik-hp/aelo-psi/actions/runs/39056220430): job de inventário concluído com **success** sob verificações de produção bloqueantes. A auditoria de dependências de desenvolvimento é informativa e deve ser classificada no resultado JSON.
- [CI F0 baseline #39056220385](https://github.com/erik-hp/aelo-psi/actions/runs/39056220385): Django, Frontend e FastAPI concluídos com **success**.
- Após este documento, confirmar que os três workflows continuam aprovados no último SHA da PR antes de integrar.

## Pendências que impedem encerrar F0-05/G0

1. Conferir em ambiente restrito a análise histórica de segredos, confirmar inexistência de credenciais reais expostas ou rotacionar e revogar as afetadas.
2. Identificar, classificar e corrigir os avisos relevantes nas dependências de desenvolvimento; documentar exceções justificadas.
3. Fixar dependências Python com mecanismo reproduzível (lock/hashes), rastrear origem de pacotes e atualizar periodicamente as ferramentas de auditoria.
4. Avaliar e restringir permissões de automações CI e revisar versões/SHAs de actions e imagens externas.
5. Finalizar critérios independentes G0 de isolamento, privacidade, implantação e aprovação de riscos residuais.

**Não usar com pacientes reais.** As verificações cobrem apenas riscos específicos; não demonstram conformidade integral LGPD ou segurança clínica.
