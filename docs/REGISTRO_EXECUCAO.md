# Registro de execução e decisões — AELO-PSI (TCC2)

**Atualizado em:** 17/10/2026. **Padrão:** somente fatos verificados; este documento é o ponto de retomada de novas sessões/assistentes.

## Estado geral

- **Fase corrente:** F0 — diagnóstico e contenção de riscos.
- **Gate liberado:** nenhum gate de implementação verificado.
- **Próxima tarefa:** validar a execução dos jobs CI de F0-01 e revisar as correções F0-02/F0-03 no Pull Request da branch `fix/f0-baseline-tenant-ai-integrity`. G0 ainda bloqueado.
- **Referência da documentação:** [PR #1](https://github.com/erik-hp/aelo-psi/pull/1), originado da branch `feat/tcc2-foundation-security-docs`. **Confirmar o estado do PR e o commit atual da `main` no GitHub** ao retomar o trabalho; não inferir estado de merge a partir deste registro.
- **Ambiente de produção:** não avaliado; **não autorizado como pronto para dados clínicos reais**.

## Evidências já obtidas

| Referência | Observação | Tipo e limite |
| --- | --- | --- |
| Leitura de `Backend/config/settings.py` | Django/DRF/JWT/PostgreSQL; chaves e defaults de desenvolvimento exigem endurecimento | Inspeção estática, sem teste de runtime |
| `Backend/apps/patients/views.py`, `Backend/apps/clinical_notes/views.py`, `Backend/apps/therapy_sessions/views.py` | Fluxos precisam de isolamento por tenant/objeto; administradores com escopo amplo | Inspeção estática, não prova de exploração |
| `Backend/apps/clinical_notes/models.py` | Texto clínico em campo de texto, `locked_at` sem enforcement no viewset | Inspeção estática |
| `Backend/ai_service/main.py` | Fallback gerando `relevance_score` fictício; sem RAG vetorial | Inspeção estática |
| `Frontend/src/services/clinicalService.ts` | Métricas longitudinais derivadas de dados mock ou transformação artificial | Inspeção estática |
| `Backend/docker-compose.yml`, `Backend/apps/clinics/management/commands/seed_initial_data.py` | Seed iniciada pelo API container e senha fixa de exemplo; portas expostas | Inspeção estática |
| `docs/architecture/ADR-001-memoria-terapeutica-longitudinal.md` | Proposta de MTLI, eventos, fontes e revisão humana | Arquitetura *proposta*, não implementada |
| `docs/PLANO_MESTRE_IMPLEMENTACAO.md` | Sequência F0–F7, gates e testes | Plano documentado, ainda não executado |

## Execuções verificadas

| Data | ID | Ação | Evidência | Situação |
| --- | --- | --- | --- | --- |
| 2026-10-17 | DOC-01 | Inventário estático do repositório e base do TCC | Leitura de código e documentos vinculados | CONCLUÍDO (somente documentação) |
| 2026-10-17 | DOC-02 | Redação ADR-001 MTLI | Arquivo em branch `feat/tcc2-foundation-security-docs` | EM REVISÃO |
| 2026-10-17 | DOC-03 | Plano mestre, matriz, README e instruções permanentes | [PR #1](https://github.com/erik-hp/aelo-psi/pull/1); resultado do merge verificável no GitHub | EM REVISÃO na data de abertura |
| 2026-10-17 | F0-01 | Inventariar comandos e adicionar workflow CI | `docs/validation/F0_BASELINE.md` e `.github/workflows/ci.yml`; execução pendente | EM REVISÃO |
| 2026-10-17 | F0-02 | Corrigir consultas com privilégios amplos | Política `apps/patients/access.py` e testes em branch; revisão e execução pendentes | EM REVISÃO |
| 2026-10-17 | F0-03 | Bloquear fallback inventado de IA e gráficos fictícios em modo real | Código em branch; testes CI pendentes | EM REVISÃO |

## Modelos de entrada para trabalhos futuros

### Entrada de tarefa
- Data/branch/commit:
- ID plano e requisito(s):
- Escopo e risco (incluindo LGPD):
- Arquivos afetados:
- Testes planejados:
- Dependências e gate:

### Saída da tarefa
- PR/commit/link:
- Código e documentação alterados:
- Comandos **realmente executados**:
- Resultados e evidências (passou/falhou/não executado):
- Riscos residuais:
- Estado: NÃO INICIADO / EM ANDAMENTO / BLOQUEADO / EM REVISÃO / CONCLUÍDO:
- Gate status e próximo ID:


## Evidência de CI da primeira rodada F0

- **Commit verificado:** `cdcd2dfd997488d64d358b567f77498c0eac5d9f`.
- **GitHub Actions:** [execução #39031546521](https://github.com/erik-hp/aelo-psi/actions/runs/39031546521).
- **Resultado:** `frontend` (lint e build) **SUCESSO**; `django` (check, migrações e testes dos apps) **SUCESSO**; `ai-service` (compile e testes) **SUCESSO**.
- **Correção durante a verificação:** o primeiro job Django falhou porque a descoberta global tentou importar testes do FastAPI sem suas dependências; isolamos as suítes Django (`apps`) e FastAPI, ambas aprovadas depois.
- **Ressalva:** testes automatizados disponíveis são limitados; ainda não houve verificação de implantação Docker nem revisão independente de autorização e LGPD. O **gate G0 permanece BLOQUEADO**, principalmente por F0-04 (credenciais de seed e endurecimento de ambiente), F0-05/F0-06.
- **Após registrar esta evidência:** nova execução de CI poderá ser disparada pelo commit documental e deverá ser conferida no PR antes do merge.

## Segunda evidência de CI — F0-04 parcial e novos testes

- **Commit validado:** `757596e893a5bdc78618486f2f256c28b50486ee`.
- **GitHub Actions:** [execução #39031839343](https://github.com/erik-hp/aelo-psi/actions/runs/39031839343).
- **Resultado:** `frontend` (lint/build) **SUCESSO**; `django` (Compose config, check, migrations, testes) **SUCESSO**; `ai-service` (compilação/testes) **SUCESSO**.
- **F0-04 parcialmente atendida:** Compose não executa automaticamente seed nem expõe serviço IA/Ollama no host; arquivos de exemplo exigem alteração de credenciais locais; comando sintético não cria senhas nem usuários. Não foi feito pentest nem testes de uso com dados reais.
- **Atenção:** este registro foi atualizado após o commit indicado e dispara novo workflow; confirme os jobs no PR #2 antes de merge. **G0 continua BLOQUEADO** até revisar requisitos F0-02 a F0-06 e validar o ambiente em cenário real de deployment.

## Continuação de revisão F0 — integração interna e admin

- Rota `/admin/` desabilitada por padrão; só habilitada explicitamente com `DEBUG` e `AELO_ENABLE_DJANGO_ADMIN` no desenvolvimento.
- `AI_SERVICE_TOKEN` exigido em chamadas Django → FastAPI, verificado com comparação resistente a diferenças de tempo; uso de token separado do segredo Django.
- Proteção de segredo `DJANGO_SECRET_KEY` para execução fora de DEBUG.
- Testes unitários de ausência, configuração e correção de token adicionados ao serviço de IA.
- **Estas alterações são propostas no PR #2, não se declara liberação G0 nem conformidade jurídica.** Verificar checks do último commit do PR antes de merge.

## Pendências de decisão

- Revisão de normas CFP e estado efetivo da Resolução 001/2009; CFP 009/2024 se refere a TDIC, não proibição específica de IA.
- Validação da base jurídica, RIPD e governança de dados por profissionais competentes.
- Política de assinatura/guarda documental apropriada.
- Modelo de embeddings/LLM, hardware e política de chaves.
- Versão/perfil FHIR e procedimento de validação.
- Cronograma formal de pesquisa e status real do CEP; não inferir aprovação de calendário acadêmico passado.

## Regras

O registro não é histórico de conversa: é histórico auditável de artefatos e testes. Não converter “escrito”, “planejado” ou “inspecionado” em “desenvolvido/testado”. Não iniciar F2/F3 sem G0/G1.
