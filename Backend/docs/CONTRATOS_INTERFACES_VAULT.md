# Especificação Formal de Contratos de Dados e Interfaces: Vault Cognitivo e GraphRAG

**Projeto:** AELO — Sistema de Apoio à Decisão Clínica em Saúde Mental  
**Data da Especificação:** 2026-11-02  
**Autor:** Equipe de Engenharia / Agente `worker_docs_1`  
**Escopo:** Definição formal, rigorosa e exaustiva dos contratos de dados, esquemas Pydantic, serializers Django REST Framework, interfaces TypeScript e validações de integridade entre o Frontend React, o Backend Django e o Microsserviço de IA (FastAPI).

---

## 1. Princípios Arquiteturais e Diretrizes de Design de Contratos

Os contratos de dados do Vault Cognitivo e GraphRAG no AELO obedecem a quatro princípios de engenharia essenciais para a segurança do paciente e conformidade ética:

1. **Princípio da Fidelidade de Evidência Literal Restrita:**
   - Nenhum conceito clínico (`label`) ou aresta relacional (`evidence`) é aceito pelo sistema a menos que seja uma **substring literal exata** do prontuário ou nota clínica anonimizada fornecida na entrada.
   - O sistema prioriza a fidelidade estrita sobre a riqueza interpretativa probabilística do LLM para mitigar riscos de alucinação clínica.
2. **Princípio dos Vocabulários Fechados:**
   - Categorias de nós (`kind`) e tipos de relacionamento (`relation`) pertencem a conjuntos estritos e imutáveis. Qualquer valor fora dos conjuntos definidos resulta em rejeição imediata da requisição (HTTP 422 ou 503).
3. **Princípio da Triangulação de Tipos Fortes:**
   - Cada entidade possui representações perfeitamente espelhadas e tipadas nas três camadas da stack:
     - **FastAPI:** Modelos Pydantic v2 com validações por regex, bounds de comprimento e tipos numéricos com limites.
     - **Django:** Modelos relacionais ORM associados a Serializers DRF formais para entrada e saída.
     - **Frontend:** Interfaces TypeScript 5 com tipos literais em união e esquemas de validação em tempo de execução via **Zod**.
4. **Princípio da Imutabilidade e Não-Repúdio:**
   - Checkpoints clínicos possuem integridade verificada via hash SHA-256.
   - Qualquer exportação ou download de relatório clínico exige validação humana prévia acompanhada de assinatura digital assimétrica (ECDSA P-256) auditável.

---

## 2. Contratos do Microsserviço de IA (FastAPI)

O microsserviço de IA opera na porta interna `8001` (ou rede interna Docker `http://ai_service:8001`) e atende requisições autenticadas originadas exclusivamente do backend Django.

### 2.1 Autenticação e Cabeçalhos Globais

Todas as rotas do microsserviço (com exceção do health check) exigem o cabeçalho de autenticação:

| Cabeçalho | Tipo | Obrigatório | Descrição / Restrição |
|---|---|:---:|---|
| `X-AI-Service-Token` | `string` | **Sim** | Token secreto compartilhado validado em tempo constante via `secrets.compare_digest`. Se ausente ou inválido, retorna HTTP 401. |
| `Content-Type` | `string` | **Sim** | Deve ser estritamente `application/json; charset=utf-8`. |
| `X-Correlation-ID` | `string` | Não | Identificador unívoco UUIDv4 para rastreabilidade de logs distribuídos. |

---

### 2.2 Schemas Pydantic do Microsserviço

Abaixo encontram-se as definições formais em Pydantic v2 que regem os contratos do serviço de IA:

```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from datetime import datetime

# ==========================================
# CONSTANTES DE VOCABULÁRIO FECHADO
# ==========================================
VAULT_KINDS = {"symptom", "event", "context", "intervention"}
VAULT_RELATIONS = {"co_occurs", "precedes", "reports", "associated"}
SYNTHESIS_KINDS = {"local", "global", "question"}

# ==========================================
# MODELOS DE EXTRAÇÃO (/vault/extract)
# ==========================================
class ContextItem(BaseModel):
    """Representa a nota clínica anonimizada enviada para extração."""
    note_id: str = Field(..., description="UUID da nota clínica", min_length=36, max_length=36)
    session_id: Optional[str] = Field(None, description="UUID da sessão de terapia correspondente", max_length=36)
    created_at: str = Field(..., description="Timestamp ISO-8601 da sessão/criação")
    text: str = Field(..., min_length=1, max_length=10000, description="Texto clínico anonimizado")

class VaultRequest(BaseModel):
    """Payload de entrada para extração de triplas."""
    note: ContextItem

class VaultNodeItem(BaseModel):
    """Nó conceitual extraído da nota clínica."""
    kind: str = Field(..., max_length=32, description="Categoria do conceito clínico")
    label: str = Field(..., min_length=1, max_length=120, description="Rótulo conceitual extraído textualmente")
    evidence: str = Field(..., min_length=1, max_length=240, description="Trecho literal comprobatório")
    embedding: Optional[list[float]] = Field(default=None, description="Vetor denso de embedding (dimensão do EmbeddingGemma)")

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        if value not in VAULT_KINDS:
            raise ValueError(f"kind inválido: '{value}'. Deve ser um dos: {sorted(VAULT_KINDS)}")
        return value

class VaultEdgeItem(BaseModel):
    """Aresta relacional entre dois nós extraídos."""
    source: int = Field(..., ge=0, description="Índice numérico do nó de origem no array 'nodes'")
    target: int = Field(..., ge=0, description="Índice numérico do nó de destino no array 'nodes'")
    relation: str = Field(..., max_length=32, description="Tipo de relação semântica")
    evidence: str = Field(..., min_length=1, max_length=240, description="Trecho literal comprobatório da relação")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Grau de confiança estimado pelo modelo (0.0 a 1.0)")

    @field_validator("relation")
    @classmethod
    def validate_relation(cls, value: str) -> str:
        if value not in VAULT_RELATIONS:
            raise ValueError(f"relation inválida: '{value}'. Deve ser uma de: {sorted(VAULT_RELATIONS)}")
        return value

class VaultExtraction(BaseModel):
    """Resposta com o grafo extraído da nota."""
    nodes: list[VaultNodeItem] = Field(..., max_length=30, description="Lista de nós identificados (máx 30)")
    edges: list[VaultEdgeItem] = Field(..., max_length=50, description="Lista de arestas relacionais (máx 50)")

# ==========================================
# MODELOS DE SÍNTESE DUAL (/vault/synthesize)
# ==========================================
class VaultEvidence(BaseModel):
    """Trecho atômico de evidência literal com identificador de origem."""
    note_id: str = Field(..., min_length=36, max_length=36, description="UUID da nota fonte")
    excerpt: str = Field(..., min_length=1, max_length=240, description="Texto literal do trecho")

class VaultSynthesisRequest(BaseModel):
    """Payload de entrada para síntese do Ponto vs. Todo."""
    current: list[VaultEvidence] = Field(..., max_length=30, description="Evidências da sessão atual (Ponto)")
    history: list[VaultEvidence] = Field(..., max_length=30, description="Evidências de sessões históricas (Todo)")

class VaultClaim(BaseModel):
    """Afirmação clínica gerada ou questão reflexiva formulada."""
    kind: Literal["local", "global", "question"] = Field(..., description="Tipo de claim sintetizado")
    text: str = Field(..., min_length=1, max_length=300, description="Texto da observação ou questão clínica")
    note_id: str = Field(..., min_length=36, max_length=36, description="UUID da nota fonte citada")
    excerpt: str = Field(..., min_length=1, max_length=240, description="Trecho literal exato de suporte")

class VaultSynthesis(BaseModel):
    """Resposta com afirmações e perguntas estruturadas."""
    claims: list[VaultClaim] = Field(..., max_length=12, description="Conjunto de claims (máx 12)")

# ==========================================
# MODELOS DE ANÁLISE GERAL E RAG (/analysis)
# ==========================================
class GraphFact(BaseModel):
    """Fato estruturado recuperado do grafo de conhecimento."""
    source: str = Field(..., max_length=120)
    relation: str = Field(..., max_length=32)
    target: str = Field(..., max_length=120)
    evidence: str = Field(..., max_length=240)
    note_id: str = Field(..., max_length=36)
    observed_at: str = Field(...)

class AnalysisRequest(BaseModel):
    patient_id: str = Field(..., max_length=36)
    note_id: str = Field(..., max_length=36)
    guardrails: list[str] = Field(default_factory=list, max_length=10)
    context: list[ContextItem] = Field(..., min_length=1, max_length=20)
    graph_context: list[GraphFact] = Field(default_factory=list, max_length=40)
```

---

### 2.3 Especificação dos Endpoints do Microsserviço de IA

#### 2.3.1 `POST /vault/extract`
Dispara a extração estruturada de conceitos e relações clínicas da nota fornecida, gerando embeddings vetoriais para os rótulos aceitos.

- **Request Body:** `VaultRequest`
  ```json
  {
    "note": {
      "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
      "session_id": "8f3077e6-c567-4f40-8b67-a2f26dcb1999",
      "created_at": "2026-11-02T14:30:00Z",
      "text": "Paciente relata queixa intensa de insônia terminal nas últimas semanas. Associa o quadro à sobrecarga crônica de trabalho e cobranças da gerência. Refere ter iniciado caminhadas matinais como tentativa de manejo da ansiedade."
    }
  }
  ```

- **Response Body (`200 OK`):** `VaultExtraction`
  ```json
  {
    "nodes": [
      {
        "kind": "symptom",
        "label": "insônia terminal",
        "evidence": "insônia terminal nas últimas semanas",
        "embedding": [0.0124, -0.0381, 0.0892, 0.0015, -0.0451]
      },
      {
        "kind": "context",
        "label": "sobrecarga crônica de trabalho",
        "evidence": "sobrecarga crônica de trabalho e cobranças",
        "embedding": [-0.0211, 0.0763, -0.0104, 0.0345, 0.0089]
      },
      {
        "kind": "intervention",
        "label": "caminhadas matinais",
        "evidence": "iniciado caminhadas matinais",
        "embedding": [0.0543, -0.0129, 0.0441, -0.0287, 0.0612]
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "relation": "associated",
        "evidence": "Associa o quadro à sobrecarga crônica de trabalho",
        "confidence": 0.88
      }
    ]
  }
  ```

- **Regras Estritas de Validação de Negócio:**
  1. `item.label in note.text`: Rejeitado se o rótulo não constar exatamente no texto.
  2. `item.evidence in note.text`: Rejeitado se a evidência não constar literalmente no texto.
  3. `0 <= edge.source < len(nodes)` e `0 <= edge.target < len(nodes)`.
  4. `edge.source != edge.target`: Bloqueia laços reflexivos (self-loops).
  5. `len(nodes) <= 30` e `len(edges) <= 50`.

- **Códigos de Status HTTP:**
  - `200 OK`: Extração validada e embeddings calculados.
  - `401 Unauthorized`: Token de serviço ausente ou inválido (`{"detail": "Invalid or missing service token"}`).
  - `422 Unprocessable Entity`: Violação de tipagem, comprimento ou validação Pydantic.
  - `503 Service Unavailable`: Falha no Ollama ou detecção de alucinação (termo ausente no texto da nota).
    ```json
    {
      "detail": "Ollama extraction failed: Evidence 'depressão' not found literally in source text."
    }
    ```

---

#### 2.3.2 `POST /vault/synthesize`
Contrasta as evidências da sessão atual (Ponto) com a série longitudinal de evidências prévias (Todo), formulando observações e perguntas reflexivas com citações explícitas.

- **Request Body:** `VaultSynthesisRequest`
  ```json
  {
    "current": [
      {
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "excerpt": "insônia terminal nas últimas semanas"
      },
      {
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "excerpt": "sobrecarga crônica de trabalho"
      }
    ],
    "history": [
      {
        "note_id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
        "excerpt": "relato anterior de melhora do sono com higiene do sono"
      }
    ]
  }
  ```

- **Response Body (`200 OK`):** `VaultSynthesis`
  ```json
  {
    "claims": [
      {
        "kind": "local",
        "text": "O paciente manifesta retorno de queixa de sono associado a fatores laborais.",
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "excerpt": "insônia terminal nas últimas semanas"
      },
      {
        "kind": "global",
        "text": "A reincidência da queixa de sono contrasta com a estabilidade referida após intervenções comportamentais passadas.",
        "note_id": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
        "excerpt": "relato anterior de melhora do sono com higiene do sono"
      },
      {
        "kind": "question",
        "text": "As técnicas de manejo previamente eficazes foram interrompidas em decorrência do aumento de demanda de trabalho?",
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "excerpt": "sobrecarga crônica de trabalho"
      }
    ]
  }
  ```

- **Regras Estritas de Validação de Negócio:**
  1. Todo par `(claim.note_id, claim.excerpt)` deve pertencer estritamente à união de `current` e `history`.
  2. Claims do tipo `local` DEVEM pertencer unicamente ao conjunto `current`.
  3. `len(claims) <= 12`.

---

#### 2.3.3 `POST /analysis`
Processa a requisição completa de análise de IA para auxílio ao psicólogo, integrando busca semântica no histórico de notas e busca híbrida no grafo de evidências.

- **Request Body:** `AnalysisRequest`
- **Response Body (`200 OK`):**
  ```json
  {
    "summary": "Paciente apresenta recorrência de queixas de sono correlacionadas ao ambiente corporativo...",
    "attention_points": [
      "Retorno de insônia terminal",
      "Impacto do estresse ocupacional no bem-estar fisiológico"
    ],
    "suggested_actions": [
      "Avaliar retomada de técnicas de higiene do sono",
      "Mapear limites e fronteiras na rotina de trabalho"
    ],
    "sources": [
      {
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "excerpt": "insônia terminal nas últimas semanas"
      }
    ]
  }
  ```

---

#### 2.3.4 Endpoints de Diagnóstico de Saúde

##### `GET /health/live`
- **Resposta (`200 OK`):** `{"status": "alive"}`
- Utilizado por orquestradores (Kubernetes/Docker) para aferir a vitalidade do processo.

##### `GET /health/ready`
- **Resposta (`200 OK`):**
  ```json
  {
    "status": "ready",
    "timestamp": "2026-11-02T14:35:00Z",
    "ollama": {
      "connected": true,
      "base_url": "http://localhost:11434",
      "version": "0.3.12"
    },
    "models": {
      "llama3.1": "available",
      "embeddinggemma": "available"
    }
  }
  ```
- **Resposta (`503 Service Unavailable`):**
  ```json
  {
    "status": "not_ready",
    "timestamp": "2026-11-02T14:35:00Z",
    "ollama": {
      "connected": false,
      "error": "Connection refused on http://localhost:11434"
    }
  }
  ```

---

## 3. Contratos da API REST do Backend Django

O backend Django expõe as rotas REST do Vault protegidas pelo subsistema de permissões e tenancy da clínica (`CanRequestAI`, `accessible_patients`).

### 3.1 `GET /api/vault/patients/{patient_id}/`

Recupera a topologia do grafo de conhecimento do paciente (nós, arestas ponderadas, partições temáticas de comunidades Leiden) e os metadados dos checkpoints gerados.

- **Autenticação:** Cookie de sessão HTTP-Only seguro ou cabeçalho `Authorization: Bearer <jwt>`.
- **Cabeçalhos de Resposta:** `Cache-Control: no-store, private`, `Content-Type: application/json`.
- **Parâmetros de URL:** `patient_id` (UUIDv4 obrigatório).
- **Parâmetros de Consulta (Query Params):**
  - `limit_nodes` (int, opcional, default: 200, máx: 500)
  - `limit_edges` (int, opcional, default: 400, máx: 1000)

- **Response Body (`200 OK`):**
  ```json
  {
    "nodes": [
      {
        "id": "c1f2e3d4-b5a6-4c7d-8e9f-0a1b2c3d4e5f",
        "kind": "symptom",
        "label": "insônia terminal",
        "mention_count": 4,
        "weight": "3.842",
        "first_seen_at": "2026-09-15T10:00:00Z",
        "last_seen_at": "2026-11-02T14:30:00Z"
      },
      {
        "id": "e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b",
        "kind": "context",
        "label": "sobrecarga crônica de trabalho",
        "mention_count": 2,
        "weight": "1.980",
        "first_seen_at": "2026-10-10T11:00:00Z",
        "last_seen_at": "2026-11-02T14:30:00Z"
      }
    ],
    "edges": [
      {
        "id": "f3a4b5c6-d7e8-4f9a-0b1c-2d3e4f5a6b7c",
        "source": "c1f2e3d4-b5a6-4c7d-8e9f-0a1b2c3d4e5f",
        "target": "e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b",
        "relation": "associated",
        "evidence": "Associa o quadro à sobrecarga crônica de trabalho",
        "note_id": "4a7b5e19-3f04-4e28-98e3-0d315cb7281a",
        "observed_at": "2026-11-02T14:30:00Z",
        "confidence": "0.880",
        "weight": "0.880"
      }
    ],
    "communities": [
      [
        "c1f2e3d4-b5a6-4c7d-8e9f-0a1b2c3d4e5f",
        "e2f3a4b5-c6d7-4e8f-9a0b-1c2d3e4f5a6b"
      ]
    ],
    "checkpoints": [
      {
        "id": "7d8e9f0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
        "analysis_id": "9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
        "review_status": "VALIDATED",
        "reviewed_by": "Dr. Fernando Silveira",
        "reviewed_at": "2026-11-02T15:00:00Z",
        "node_count": 14,
        "edge_count": 18,
        "created_at": "2026-11-02T14:35:00Z"
      }
    ]
  }
  ```

- **Códigos de Erro:**
  - `401 Unauthorized`: Sessão expirada ou ausente.
  - `403 Forbidden`: Psicólogo sem vínculo com o paciente (`accessible_patients`).
  - `404 Not Found`: Paciente não encontrado no banco de dados da clínica.

---

### 3.2 `POST /api/vault/analyses/{analysis_id}/checkpoint/`

Orquestra a extração do grafo e a geração de um novo checkpoint longitudinal no formato Markdown.

- **Autenticação:** Exige profissional autenticado com perfil de psicólogo e acesso ao paciente da análise.
- **Parâmetros de URL:** `analysis_id` (UUIDv4 da instância `AIAnalysis`).
- **Pré-requisitos Mandatórios de Negócio:**
  1. A análise associada DEVE estar no status `PENDING_REVIEW`.
  2. A análise NÃO PODE possuir um `VaultCheckpoint` previamente cadastrado (`hasattr(analysis, 'vault_checkpoint') is False`).
  3. A nota clínica associada não pode estar vazia após anonimização.
  4. O versionamento da nota clínica é checado antes e depois da chamada ao Ollama para evitar corridas (`select_for_update`).
- **Payload de Entrada:** `{}` (objeto JSON vazio; todos os dados contextuais decorrem do modelo no banco de dados).

- **Response Body (`201 Created`):**
  ```json
  {
    "id": "7d8e9f0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a"
  }
  ```

- **Códigos de Erro:**
  - `400 Bad Request`:
    - `{"detail": "A checkpoint already exists for this analysis."}`
    - `{"detail": "Only pending analyses can generate a checkpoint."}`
    - `{"detail": "The source note changed during graph extraction; retry with a new analysis."}`
  - `403 Forbidden`: Sem autorização clínica sobre o paciente.
  - `404 Not Found`: Análise não encontrada.
  - `503 Service Unavailable`: Falha de comunicação ou timeout no microsserviço de IA.

---

### 3.3 `GET /api/vault/checkpoints/{checkpoint_id}/`

Visualização do conteúdo do checkpoint ou exportação como anexo para prontuário perene.

#### Cenário 1: Leitura / Pré-visualização na Interface (sem parâmetro `download`)
- **Headers:** `Accept: application/json`.
- **Response Body (`200 OK`):**
  ```json
  {
    "id": "7d8e9f0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a",
    "markdown": "---\ntype: aelo-vault-checkpoint\nversion: 1\npatient_id: 2c3d4e5f-...\ncreated_at: '2026-11-02T14:35:00Z'\nnodes: 14\nedges: 18\n---\n\n# Checkpoint Longitudinal do Vault Clínico\n\n## Análise do Ponto (Sessão Atual)\n...",
    "content_sha256": "8a35f79a95bc68b8e62d4e892c902d33458a2d1e2b3c4d5e6f7a8b9c0d1e2f3a",
    "review_status": "PENDING_REVIEW"
  }
  ```

#### Cenário 2: Download do Arquivo Markdown (`?download=1`)
- **Pré-requisitos Mandatórios de Segurança e Ética:**
  1. A análise associada DEVE possuir `review_status == "VALIDATED"`.
  2. DEVE existir uma validação humana (`HumanValidation`) com **assinatura criptográfica ECDSA P-256 válida**, conferida matematicamente através da chave pública SPKI do psicólogo registrada em `UserSigningKey`.
  3. O hash SHA-256 do texto markdown descriptografado do banco DEVE ser estritamente igual ao campo `content_sha256`.
- **Cabeçalhos de Resposta (`200 OK`):**
  - `Content-Type: text/markdown; charset=utf-8`
  - `Content-Disposition: attachment; filename="aelo-checkpoint-7d8e9f0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a.md"`
  - `Cache-Control: no-store, private`
  - `X-Content-Type-Options: nosniff`
- **Corpo:** Fluxo de bytes brutos codificados em UTF-8 contendo o relatório Markdown integral.
- **Códigos de Erro no Download:**
  - `403 Forbidden`: `{"detail": "A signed clinical approval is required before export."}`
  - `403 Forbidden`: `{"detail": "The checkpoint content hash does not match."}`

---

### 3.4 Contrato de Revisão Ética e Assinatura Criptográfica

Para que um checkpoint se torne elegível para download, a análise associada deve ser assinada digitalmente através da rota existente do Django:

`POST /api/ai/analyses/{analysis_id}/review/`

- **Payload de Entrada (`ReviewSerializer`):**
  ```json
  {
    "decision": "VALIDATED",
    "justification": "Evidências literais do grafo conferidas e confirmadas com o histórico longitudinal do paciente.",
    "signature": {
      "public_key_spki": "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE...",
      "signature_der": "MEQCIFz...wIgY..."
    }
  }
  ```
- **Processamento:**
  - O backend remonta o payload canônico em JSON:
    ```json
    {
      "analysis_id": "<uuid>",
      "patient_id": "<uuid>",
      "content_sha256": "<sha256-do-markdown-do-checkpoint>",
      "decision": "VALIDATED",
      "justification": "<texto-do-clinico>",
      "timestamp": "ISO-8601"
    }
    ```
  - Executa `verify_validation(validation)` utilizando a chave pública registrada do profissional via algoritmo ECDSA com SHA-256 (P-256).
  - Em caso de sucesso, transiciona o status para `VALIDATED` e gera registro imutável em `audit_logs` encadeado em blockchain/hash chain.

---

## 4. Contratos de Tipagem no Frontend (TypeScript)

As interfaces TypeScript garantem que a camada de visualização consuma dados rigorosamente validados:

```typescript
// Frontend/src/types/vault.ts

/**
 * Vocabulário fechado de categorias de nós clínicos no AELO Vault.
 */
export type VaultNodeKind = "symptom" | "event" | "context" | "intervention";

/**
 * Vocabulário fechado de tipos de relações topológicas direcionadas.
 */
export type VaultRelationType = "co_occurs" | "precedes" | "reports" | "associated";

/**
 * Categorias de observações sintetizadas no Ponto vs Todo.
 */
export type VaultClaimKind = "local" | "global" | "question";

/**
 * Status formal de revisão ética do checkpoint conforme CFP 09/2024.
 */
export type VaultReviewStatus = "PENDING_REVIEW" | "VALIDATED" | "REJECTED";

/**
 * Nó conceitual persistido no grafo de conhecimento do paciente.
 */
export interface VaultNode {
  id: string;                      // UUIDv4
  kind: VaultNodeKind;
  label: string;                   // Texto claro descriptografado
  mention_count: number;           // Contagem ponderada de menções
  weight: string;                  // Decimal serializado como string ("3.842")
  first_seen_at: string;           // ISO-8601
  last_seen_at: string;            // ISO-8601
}

/**
 * Aresta direcional conectando dois nós com evidência literal.
 */
export interface VaultEdge {
  id: string;                      // UUIDv4
  source: string;                  // UUIDv4 do nó de origem
  target: string;                  // UUIDv4 do nó de destino
  relation: VaultRelationType;
  evidence: string;                // Trecho textual literal da nota
  note_id: string;                 // UUIDv4 da nota clínica de origem
  observed_at: string;             // ISO-8601
  confidence: string;              // Decimal serializado como string ("0.880")
  weight: string;                  // Decimal serializado como string ("0.880")
}

/**
 * Metadados resumidos de um checkpoint longitudinal na linha do tempo.
 */
export interface VaultCheckpointSummary {
  id: string;                      // UUIDv4
  analysis_id: string;             // UUIDv4
  review_status: VaultReviewStatus;
  reviewed_by: string | null;      // Nome do psicólogo validador
  reviewed_at: string | null;      // ISO-8601
  node_count: number;
  edge_count: number;
  created_at: string;              // ISO-8601
}

/**
 * Payload completo retornado por GET /api/vault/patients/{id}/
 */
export interface VaultGraph {
  nodes: VaultNode[];
  edges: VaultEdge[];
  communities: string[][];         // Matriz de UUIDs agrupados pelo algoritmo de Leiden
  checkpoints: VaultCheckpointSummary[];
}

/**
 * Detalhes integrais de um checkpoint específico para exibição e download.
 */
export interface VaultCheckpointDetail {
  id: string;
  markdown: string;
  content_sha256: string;
  review_status: VaultReviewStatus;
}
```

---

## 5. Validação em Tempo de Execução com Zod no Frontend

Para evitar falhas silenciosas de renderização no React caso o backend responda dados parciais ou tipos corrompidos, recomenda-se o uso de esquemas Zod na camada de serviços do frontend:

```typescript
// Frontend/src/schemas/vault.ts
import { z } from "zod";

export const vaultNodeKindSchema = z.enum(["symptom", "event", "context", "intervention"]);
export const vaultRelationTypeSchema = z.enum(["co_occurs", "precedes", "reports", "associated"]);
export const vaultReviewStatusSchema = z.enum(["PENDING_REVIEW", "VALIDATED", "REJECTED"]);

export const vaultNodeSchema = z.object({
  id: z.string().uuid(),
  kind: vaultNodeKindSchema,
  label: z.string().min(1).max(120),
  mention_count: z.number().int().nonnegative(),
  weight: z.string(),
  first_seen_at: z.string().datetime(),
  last_seen_at: z.string().datetime(),
});

export const vaultEdgeSchema = z.object({
  id: z.string().uuid(),
  source: z.string().uuid(),
  target: z.string().uuid(),
  relation: vaultRelationTypeSchema,
  evidence: z.string().min(1).max(240),
  note_id: z.string().uuid(),
  observed_at: z.string().datetime(),
  confidence: z.string(),
  weight: z.string(),
});

export const vaultCheckpointSummarySchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string().uuid(),
  review_status: vaultReviewStatusSchema,
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().datetime().nullable(),
  node_count: z.number().int().nonnegative(),
  edge_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});

export const vaultGraphSchema = z.object({
  nodes: z.array(vaultNodeSchema),
  edges: z.array(vaultEdgeSchema),
  communities: z.array(z.array(z.string().uuid())),
  checkpoints: z.array(vaultCheckpointSummarySchema),
});
```

Este conjunto formal de contratos estabelece a fronteira de confiança necessária para que as alterações na camada de visualização gráfica (Cytoscape.js) e no backend sejam realizadas de forma segura e livre de regressões.
