# Registro de execução e decisões — AELO-PSI (TCC2)

**Atualizado em:** 17/10/2026. **Padrão:** somente fatos verificados; este documento é o ponto de retomada de novas sessões/assistentes.

## Estado geral

- **Fase corrente:** F0 — diagnóstico e contenção de riscos.
- **Gate liberado:** nenhum gate de implementação verificado.
- **Próxima tarefa:** **F0-01** — estabelecer baseline de build, testes, ambientes e endpoints; F0-02/F0-03 após inventário.
- **Branch de documentação:** `feat/tcc2-foundation-security-docs`; alterações documentais em review até merge. `main` não deve ser considerada atualizada.
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
| 2026-10-17 | DOC-03 | Plano mestre, matriz, README e instruções permanentes | Arquivos na mesma branch | EM REVISÃO |
| 2026-10-17 | F0-01 | Rodar ambiente/build/testes e relatar baseline | **Sem execuções de runtime neste registro** | NÃO INICIADO |

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

## Pendências de decisão

- Revisão de normas CFP e estado efetivo da Resolução 001/2009; CFP 009/2024 se refere a TDIC, não proibição específica de IA.
- Validação da base jurídica, RIPD e governança de dados por profissionais competentes.
- Política de assinatura/guarda documental apropriada.
- Modelo de embeddings/LLM, hardware e política de chaves.
- Versão/perfil FHIR e procedimento de validação.
- Cronograma formal de pesquisa e status real do CEP; não inferir aprovação de calendário acadêmico passado.

## Regras

O registro não é histórico de conversa: é histórico auditável de artefatos e testes. Não converter “escrito”, “planejado” ou “inspecionado” em “desenvolvido/testado”. Não iniciar F2/F3 sem G0/G1.
