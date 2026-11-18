# F5-01 / F5-02 — Mapeamento e Limites de Interoperabilidade HL7 FHIR R4

**Versão:** 1.0 — 17/11/2026  
**Estado:** Implementado e testado em ambiente sintético (`Backend/apps/patients/fhir.py`); **EM REVISÃO** quanto à homologação clínica/institucional.  
**Relaciona-se a:** `F5-01`, `F5-02`, `RF-11`, `RNF-01`, `RNF-02`, `RET-07`.

> Este documento descreve o perfil mínimo HL7 FHIR R4 implementado no AELO-PSI para portabilidade controlada de um único paciente autorizado. Não constitui certificação HL7, homologação RNDS nem dispensa política institucional de custódia de arquivos exportados (`GOV-05` / `RET-07`).

## 1. Escopo e Controle de Acesso

- **Endpoint:** `GET /api/patients/{id}/fhir/` e `GET /api/patients/{id}/fhir/?official_only=1`
- **Autorização obrigatória:** exige usuário autenticado, clínica ativa e vínculo clínico explícito (`can_access_patient(request.user, patient, clinical=True)`). Contas `ADMIN` sem vínculo clínico e usuários de outras clínicas recebem negação (`403`/`404`).
- **Cabeçalhos de segurança:** `Content-Type: application/fhir+json` e `Cache-Control: no-store`.
- **Auditoria:** toda exportação gera evento `FHIR_EXPORT` na cadeia HMAC (`AuditLog`), registrando módulo e contagem de recursos, **sem** gravar texto clínico no log.
- **Modo estrito de documentos oficiais (`?official_only=1` — `F5-02`):** exporta exclusivamente notas clínicas formalmente assinadas ou retificadas (`SIGNED`, `AMENDED` ou `locked_at != null`), recusando incluir rascunhos preliminares (`DRAFT` / `IN_REVIEW`) como registros oficiais.

## 2. Recursos Mapeados (HL7 FHIR R4 — `Bundle` tipo `collection`)

| Entidade AELO-PSI | Recurso FHIR R4 | Campos e Terminologias Mapeados | Regras de Inclusão |
| :--- | :--- | :--- | :--- |
| `patients.Patient` | `Patient` | `id`, `identifier[0].value` (`internal_code`), `name[0].text` (`display_name`), `active` (`status == "ACTIVE"`) | Sempre incluído (1 por bundle, escopado ao paciente autorizado). |
| `therapy_sessions.TherapySession` | `Encounter` | `status` (`SCHEDULED→planned`, `COMPLETED→finished`, `CANCELLED/MISSED→cancelled`), `class` (`v3-ActCode#AMB`), `subject` (`urn:uuid:{patient.id}`), `period.start` / `period.end` | Sessões não excluídas logicamente (`deleted_at is null`), ordenadas por `scheduled_at`. |
| `clinical_notes.ClinicalNote` | `DocumentReference` | `status="current"`, `docStatus` (`DRAFT/IN_REVIEW→preliminary`, `SIGNED→final`, `AMENDED→amended`), `subject`, `context.encounter`, `content[0].attachment` (`text/plain; charset=utf-8` em Base64) | Notas ativas (`deleted_at is null`). Com `official_only=1`, somente notas assinadas/travadas. |
| Assinatura/Retificação (`ClinicalNote.signed_*`) | `Provenance` | `target` (`urn:uuid:{note.id}`), `recorded` (`signed_at`), `activity` (`v3-DataOperation#CREATE` para `SIGNED`, `UPDATE` para `AMENDED`), `agent`, `signature` (`E1762-95:2013#1.2.840.10065.1.12.1.1`, ECDSA P-256) | Emitido automaticamente para toda nota que possua assinatura clínica verificável (`signed_by` e `signed_at`). |
| Indicadores / IA (`AIAnalysis`, `SentimentMetric`, `VaultNode`) | *Não exportados como `Observation`* | — | **Decisão deliberada (`ADR-001` §8):** artefatos assistivos e sinais textuais exploratórios não são observações clínicas homologadas e não entram no prontuário portável FHIR. |

## 3. Limites Técnicos e Riscos Residuais

1. **Base64 não é criptografia (`RET-07`):** em repouso no banco, `ClinicalNote.raw_text` permanece cifrado com `AES-256-GCM`; ao exportar o bundle FHIR para o profissional autorizado, o anexo `DocumentReference` é codificado em Base64 conforme a especificação FHIR R4, tornando o arquivo resultante legível fora do servidor.
2. **Assinatura criptográfica de conta vs. ICP-Brasil:** o recurso `Provenance.signature` transporta a assinatura ECDSA P-256 da chave vinculada à conta do profissional no AELO-PSI, permitindo verificar autoria e integridade do payload, mas não equivale a certificado qualificado ICP-Brasil sem integração específica.
3. **Validação estrutural:** a conformidade estrutural dos campos gerados é verificada em `Backend/tests/test_fhir_export.py` e `Backend/tests/test_note_lifecycle_signature.py`; validação contra perfis nacionais (ex.: BR Core / RNDS) permanece fora do escopo acadêmico atual.
