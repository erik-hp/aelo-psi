# Exemplos da API AELO

## Autenticação

`POST /api/auth/login/` recebe `{"username":"psicologo","password":"<senha>"}`. A resposta contém `access` e `user`; o refresh token é enviado somente como cookie `aelo_refresh` com `HttpOnly`, `SameSite=Strict` e caminho `/api/auth/`.

`POST /api/auth/refresh/` usa o cookie e o cabeçalho `X-AELO-Session: 1`, sem token no corpo. A resposta contém apenas um novo `access` e pode renovar o cookie. `POST /api/auth/logout/` usa o mesmo cabeçalho, exige o access token e invalida o cookie.

## Prontuário

`POST /api/patients/`:

```json
{"internal_code":"P-0001","display_name":"Paciente Exemplo","status":"ACTIVE"}
```

`POST /api/sessions/`:

```json
{"patient":"patient-uuid","scheduled_at":"2026-11-02T14:00:00-03:00","status":"SCHEDULED","summary":""}
```

`POST /api/clinical-notes/`:

```json
{"patient":"patient-uuid","session":"session-uuid","raw_text":"Nota narrativa sintética."}
```

`GET /api/patients/{id}/fhir/` retorna um Bundle FHIR R4 com o paciente, sessões e notas atuais. O conteúdo das notas é incluído na exportação; somente usuários com acesso ao paciente podem solicitá-la e o evento é auditado.

## IA e revisão assinada

`POST /api/analysis/request/` recebe `{"patient":"patient-uuid","note":"note-uuid","context_limit":10}` e retorna HTTP 202 com `job_id`. Consulte `GET /api/analysis/jobs/{job_id}/` até `COMPLETED`; então leia `GET /api/analysis/{analysis_id}/`. É necessária ao menos uma nota pseudonimizada com texto. O serviço local seleciona trechos por embeddings e filtra citações sem evidência nas notas recuperadas.

O psicólogo registra uma chave pública ECDSA P-256 em `POST /api/users/me/signing-key/` com `{"public_key_spki":"<DER-em-base64>"}`. `GET` no mesmo caminho informa se há chave registrada e seu fingerprint.

Para validar ou rejeitar, solicite `POST /api/analysis/{id}/signing-payload/` com `{"decision":"VALIDATED","comment":"Revisei as fontes."}`. Assine os bytes do campo `payload` decodificado de base64 com ECDSA P-256/SHA-256; a assinatura enviada é `r||s` com 32 bytes por componente, em base64. Envie-a para `POST /api/analysis/{id}/validate/` ou `/reject/` junto do mesmo `comment`:

```json
{"comment":"Revisei as fontes.","signature":"<r||s-em-base64>"}
```

O servidor recusa assinaturas inválidas, mudanças do comentário ou uma segunda revisão. A interface web executa esse fluxo com uma chave privada não exportável guardada no IndexedDB do navegador.
