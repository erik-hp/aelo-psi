# Guia de Transição e Checklist de Implementação para a Próxima IA

**Projeto:** AELO — Sistema de Apoio à Decisão Clínica em Saúde Mental (Vault Cognitivo com GraphRAG)  
**Data do Guia:** 2026-11-02  
**Autor:** Equipe de Engenharia / Agente `worker_docs_1`  
**Destinatário:** Próxima IA Desenvolvedora / Engenheiro de Software Full-Stack  
**Escopo:** Roadmap sequenciado, acionável e auto-contido para guiar a execução das refatorações prioritárias nas três camadas da aplicação (FastAPI, Django e React), garantindo a continuidade do projeto sem atritos, regressões ou quebra de conformidade ética.

---

## 1. Diretrizes Gerais e Metodologia de Execução

Como próxima IA desenvolvedora atuando no projeto AELO, sua missão é implementar as melhorias de arquitetura, escalabilidade e resiliência mapeadas nos documentos `Backend/docs/MAPA_REFATORACAO_DEBITOS_VAULT.md` e `Backend/docs/CONTRATOS_INTERFACES_VAULT.md`.

Para assegurar a máxima confiabilidade do sistema clínico, siga estritamente os seguintes princípios de engenharia:

1. **Princípio da Não-Regressão Mandatória:**
   - Antes de iniciar qualquer tarefa e ao concluir cada fase, execute os comandos de verificação:
     - Backend: `cd Backend; .venv\Scripts\pytest -q` (deve manter todos os 29 testes atuais aprovados).
     - Frontend: `cd Frontend; npm run build` (deve compilar com código de saída 0).
2. **Respeito aos Contratos e Invariantes Éticas:**
   - Nunca flexibilize a regra da **evidência literal estrita** (`item.label in text` e `item.evidence in text`).
   - Mantenha a obrigatoriedade da assinatura criptográfica ECDSA P-256 e verificação de SHA-256 antes de qualquer exportação de arquivo `.md`.
3. **Desenvolvimento Incremental em Três Fases:**
   - Execute as tarefas rigorosamente na ordem sequencial deste guia:
     - **Fase 1:** Backend e Microsserviço de IA (resiliência de infraestrutura).
     - **Fase 2:** Frontend e Interface do Usuário (modularização e visualização Cytoscape).
     - **Fase 3:** Testes de Integração e Validação de Contratos (fechamento de lacunas de qualidade).

---

## 2. Fase 1: Resiliência, Desacoplamento e Confiabilidade no Backend e FastAPI

### Tarefa 1.1: Implementação de Lifespan e Singleton `httpx.AsyncClient` no FastAPI

- **Objetivo:** Eliminar a abertura e fechamento contínuo de sockets TCP com o Ollama, criando um pool de conexões persistentes gerenciado pelo ciclo de vida da aplicação.
- **Arquivos-Alvo:**
  - `Backend/ai_service/main.py`
- **Instruções Técnicas de Implementação:**
  1. Importar `asynccontextmanager` de `contextlib`.
  2. Definir função de ciclo de vida `@asynccontextmanager async def lifespan(app: FastAPI):`:
     - Instanciar `app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=5.0), limits=httpx.Limits(max_keepalive_connections=20, max_connections=50))` no startup.
     - Utilizar `yield`.
     - Fechar o cliente no shutdown: `await app.state.http_client.aclose()`.
  3. Atualizar a declaração do app: `app = FastAPI(title="AELO AI Service", lifespan=lifespan)`.
  4. Refatorar as funções `embed_texts`, `ollama_analysis`, `ollama_vault` e `ollama_vault_synthesis` para receberem `client: httpx.AsyncClient` como parâmetro, extraindo-o de `request.app.state.http_client` nos endpoints correspondentes.
- **Critérios Objetivos de Sucesso (DoD):**
  - O código não contém mais nenhuma ocorrência de `async with httpx.AsyncClient(...)` dentro das funções de inferência.
  - A suíte de testes `pytest tests/test_ai_service.py` executa e aprova todos os 8 testes sem falhas.
- **Mitigação de Riscos:**
  - Garantir que o `TestClient` do FastAPI continue funcionando nos testes unitários chamando adequadamente o gerenciador de contexto `with TestClient(app) as client:` para disparar o `lifespan`.

---

### Tarefa 1.2: Retentativa com Backoff Exponencial (Tenacity) para Chamadas Ollama

- **Objetivo:** Proteger o microsserviço contra falhas transitórias de conexão e tolerar o tempo de *cold start* durante o carregamento de tensores dos modelos na VRAM.
- **Arquivos-Alvo:**
  - `Backend/requirements/ai.txt`
  - `Backend/ai_service/main.py`
- **Instruções Técnicas de Implementação:**
  1. Adicionar `tenacity>=8.2.0` no arquivo `Backend/requirements/ai.txt`.
  2. Em `ai_service/main.py`, importar `retry`, `stop_after_attempt`, `wait_exponential`, `retry_if_exception_type`.
  3. Criar uma política de retentativa compartilhada:
     ```python
     ollama_retry = retry(
         reraise=True,
         stop=stop_after_attempt(3),
         wait=wait_exponential(multiplier=1, min=1, max=6),
         retry=retry_if_exception_type((httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout)),
     )
     ```
  4. Decorar as funções que chamam a API do Ollama (`embed_texts`, `ollama_analysis`, `ollama_vault`, `ollama_vault_synthesis`) com `@ollama_retry`.
- **Critérios Objetivos de Sucesso (DoD):**
  - Se o Ollama demorar até 4 segundos para responder na primeira tentativa devido ao carregamento do modelo, a segunda tentativa é executada automaticamente e a requisição é concluída com sucesso.
  - Erros de validação semântica (como evidência não encontrada no texto) NÃO disparam retentativa (falham de imediato).
- **Mitigação de Riscos:**
  - Definir um limite máximo de espera cumulativo para não estourar o timeout global do Django.

---

### Tarefa 1.3: Health Check Ativo (`/health/ready`) e Logging Estruturado de Erros

- **Objetivo:** Substituir a rota de saúde estática por verificações ativas do Ollama e adicionar logs com stack trace nos blocos `except`.
- **Arquivos-Alvo:**
  - `Backend/ai_service/main.py`
- **Instruções Técnicas de Implementação:**
  1. Configurar o logger no início do arquivo: `logger = logging.getLogger("ai_service")`.
  2. Manter `GET /health` e `GET /health/live` retornando `{"status": "ok"}` para liveness.
  3. Criar `GET /health/ready`:
     - Disparar requisição `GET {OLLAMA_BASE_URL}/api/version` com timeout de 2.0s.
     - Disparar requisição `GET {OLLAMA_BASE_URL}/api/tags` e verificar se `OLLAMA_MODEL` e `OLLAMA_EMBED_MODEL` estão presentes na lista de modelos.
     - Se tudo estiver operacional, retornar HTTP 200 com payload detalhado.
     - Caso contrário, retornar HTTP 503 com `{"status": "not_ready", "error": str(err)}`.
  4. Nos blocos `except` das rotas `/vault/extract`, `/vault/synthesize` e `/analysis`:
     - Substituir o bloco silencioso por:
       ```python
       except Exception as exc:
           logger.exception("Erro durante processamento da rota %s: %s", request.url.path, exc)
           raise HTTPException(status_code=503, detail=f"AI service failure: {exc}")
       ```
- **Critérios Objetivos de Sucesso (DoD):**
  - Chamar `GET /health/ready` com o Ollama inativo retorna HTTP 503 com mensagem clara de causa.
  - Todas as exceções geram logs com nível `ERROR` e rastreamento completo de pilha no console.

---

### Tarefa 1.4: Alinhamento da Cascata de Timeouts entre Serviços

- **Objetivo:** Harmonizar os limites de tempo de espera entre Frontend, Gunicorn, Django e FastAPI, impedindo falsos 503 prematuros no Django.
- **Arquivos-Alvo:**
  - `Backend/config/settings.py`
  - `Backend/services/ai/client.py`
  - `Backend/docker-compose.yml`
  - `Backend/.env.example`
- **Instruções Técnicas de Implementação:**
  1. Em `Backend/config/settings.py:147`, alterar o valor padrão de fallback:
     ```python
     AI_SERVICE_TIMEOUT = float(os.getenv("AI_SERVICE_TIMEOUT", "90"))
     ```
  2. Em `Backend/docker-compose.yml`:
     - No serviço `backend`: configurar variável de ambiente `AI_SERVICE_TIMEOUT: 90`.
     - Garantir que o comando do Gunicorn mantenha `--timeout 120` (ou `150`) para dar margem ao timeout de 90s do cliente.
  3. No `Backend/.env.example`, documentar a variável `AI_SERVICE_TIMEOUT=90`.
- **Critérios Objetivos de Sucesso (DoD):**
  - O Django aguarda até 90 segundos por operações combinadas de extração e embedding antes de emitir timeout.
  - A suíte de testes do backend continua executando com sucesso.

---

### Tarefa 1.5: Serializers DRF para as Entidades do Vault no Django

- **Objetivo:** Eliminar a montagem manual de dicionários Python inline nas views do Django, padronizando a serialização com o Django REST Framework.
- **Arquivos-Alvo:**
  - `Backend/apps/ai_analysis/serializers.py`
  - `Backend/apps/ai_analysis/views.py`
- **Instruções Técnicas de Implementação:**
  1. Em `apps/ai_analysis/serializers.py`, criar as classes:
     - `VaultNodeSerializer(serializers.ModelSerializer)`: campos `["id", "kind", "label", "mention_count", "weight", "first_seen_at", "last_seen_at"]`.
     - `VaultEdgeSerializer(serializers.ModelSerializer)`: campos `["id", "source", "target", "relation", "evidence", "note_id", "observed_at", "confidence", "weight"]`.
     - `VaultCheckpointSummarySerializer(serializers.ModelSerializer)`: campos `["id", "analysis_id", "review_status", "reviewed_by", "reviewed_at", "node_count", "edge_count", "created_at"]`.
     - `VaultCheckpointDetailSerializer(serializers.ModelSerializer)`: campos `["id", "markdown", "content_sha256", "review_status"]`.
  2. Em `apps/ai_analysis/views.py`:
     - Na view `patient_vault`, substituir as list comprehensions manuais por:
       ```python
       return Response({
           "nodes": VaultNodeSerializer(nodes, many=True).data,
           "edges": VaultEdgeSerializer(edges, many=True).data,
           "communities": detect_communities(nodes, edges),
           "checkpoints": VaultCheckpointSummarySerializer(checkpoints, many=True).data,
       })
       ```
     - Na view `read_vault_checkpoint`, utilizar `VaultCheckpointDetailSerializer(checkpoint).data`.
- **Critérios Objetivos de Sucesso (DoD):**
  - As respostas JSON de `GET /api/vault/patients/{id}/` e `GET /api/vault/checkpoints/{id}/` mantêm rigorosamente os mesmos campos e formatos exigidos em `CONTRATOS_INTERFACES_VAULT.md`.
  - Os testes existentes em `Backend/tests/test_vault.py` passam com 100% de sucesso.

---

### Tarefa 1.6: Modularização Pacífica de `Backend/apps/ai_analysis/vault.py`

- **Objetivo:** Separar as 220 linhas de algoritmos, Markdown e serviços de transação em submódulos coesos sem quebrar imports existentes.
- **Arquivos-Alvo:**
  - Criar pacote `Backend/apps/ai_analysis/vault/`:
    - `constants.py` (constantes `KINDS`, `RELATIONS`, limites numéricos)
    - `algorithms.py` (`detect_communities`, centralidade ponderada, decaimento diário)
    - `renderers.py` (formatação de Markdown, frontmatter YAML, `_safe_line`)
    - `services.py` (`create_checkpoint`, bloqueio pessimista de nota e persistência)
  - Manter `Backend/apps/ai_analysis/vault.py` como facade importando e reexportando `create_checkpoint` e `detect_communities` para retrocompatibilidade total.
- **Critérios Objetivos de Sucesso (DoD):**
  - Nenhuma importação externa em views, models ou testes quebra (`from apps.ai_analysis.vault import create_checkpoint, detect_communities`).
  - Execução de `pytest Backend/tests/test_vault.py` passa sem erros.

---

## 3. Fase 2: Refatoração Modular do Frontend e Migração de Grafo

### Tarefa 2.1: Definição dos Tipos TypeScript Estritos e Schemas Zod no Frontend

- **Objetivo:** Fornecer tipagem estrita em substituição às strings genéricas e garantir validação em tempo de execução.
- **Arquivos-Alvo:**
  - `Frontend/src/types/vault.ts` (novo arquivo)
  - `Frontend/src/schemas/vault.ts` (novo arquivo)
- **Instruções Técnicas de Implementação:**
  1. Criar `Frontend/src/types/vault.ts` com as interfaces especificadas na Seção 4 de `CONTRATOS_INTERFACES_VAULT.md` (`VaultNodeKind`, `VaultRelationType`, `VaultNode`, `VaultEdge`, `VaultGraph`, etc.).
  2. Criar `Frontend/src/schemas/vault.ts` contendo os schemas de validação Zod conforme a Seção 5 de `CONTRATOS_INTERFACES_VAULT.md`.
  3. Atualizar `Frontend/src/services/clinicalService.ts` para importar e utilizar as novas interfaces em vez das declarações inline.
- **Critérios Objetivos de Sucesso (DoD):**
  - O comando `npm run build` no Frontend executa sem nenhum erro de tipagem TypeScript.

---

### Tarefa 2.2: Mock Data Completo e Habilitação do Vault em Modo de Desenvolvimento Offline

- **Objetivo:** Permitir que desenvolvedores trabalhem na interface do Vault sem necessidade do backend ou Ollama em execução local.
- **Arquivos-Alvo:**
  - `Frontend/src/services/mockData.ts`
  - `Frontend/src/services/clinicalService.ts`
  - `Frontend/src/components/patients/PatientVault.tsx`
- **Instruções Técnicas de Implementação:**
  1. Em `Frontend/src/services/mockData.ts`, criar a constante `mockVaultGraph`:
     - Incluir 10 nós com os quatro tipos de `kind` (`"symptom"`, `"event"`, `"context"`, `"intervention"`).
     - Incluir 14 arestas com citações literais e pesos realistas.
     - Incluir 2 partições de comunidades de Leiden (`[["id-1", "id-2"], ["id-3", "id-4"]]`).
     - Incluir 2 checkpoints simulados (um `VALIDATED` e um `PENDING_REVIEW`).
  2. Em `Frontend/src/services/clinicalService.ts:49`, retornar `mockVaultGraph` caso `!isApiMode`.
  3. Em `Frontend/src/components/patients/PatientVault.tsx`, remover a linha de bloqueio `if (!isApiMode) return null;`.
- **Critérios Objetivos de Sucesso (DoD):**
  - Ao rodar `npm run dev` com `VITE_USE_API=false`, o componente do Vault renderiza o grafo simulado e o histórico de checkpoints perfeitamente na tela.

---

### Tarefa 2.3: Modal de Justificativa Clínica para Assinatura Ética (ECDSA P-256)

- **Objetivo:** Eliminar a justificativa hardcoded na validação da análise, fornecendo um diálogo modal para o psicólogo digitar seu parecer clínico formal.
- **Arquivos-Alvo:**
  - `Frontend/src/components/vault/VaultApprovalModal.tsx` (novo componente)
  - `Frontend/src/components/patients/PatientVault.tsx`
- **Instruções Técnicas de Implementação:**
  1. Desenvolver o componente `VaultApprovalModal.tsx`:
     - Propriedades: `isOpen: boolean`, `onClose: () => void`, `onConfirm: (justification: string) => Promise<void>`, `decision: "VALIDATED" | "REJECTED"`, `checkpointSha256: string`.
     - Área de texto para entrada da justificativa clínica (com contador de caracteres e validação de no mínimo 10 caracteres).
     - Alerta visual destacando a conformidade com a Resolução CFP 09/2024 (a assinatura é irrevogável e vinculada ao hash da evidência).
     - Botão de confirmação que exibe estado de carregamento durante a geração da assinatura Web Crypto no IndexedDB.
  2. No componente principal do Vault, substituir a chamada direta de mutação pela abertura do modal.
- **Critérios Objetivos de Sucesso (DoD):**
  - O botão de aprovação abre o modal; a assinatura só é disparada após o clínico fornecer justificativa válida.
  - A justificativa digitada é enviada no payload de `signingService.review` e persistida no banco do Django.

---

### Tarefa 2.4: Decomposição Modular de `PatientVault.tsx` e Hook `usePatientVault`

- **Objetivo:** Refatorar o componente monolítico de 83 linhas em submódulos focados e extrair a lógica de rede para um hook customizado.
- **Arquivos-Alvo:**
  - `Frontend/src/hooks/usePatientVault.ts` (novo arquivo)
  - `Frontend/src/components/vault/VaultContainer.tsx` (novo componente)
  - `Frontend/src/components/vault/VaultNodeInspector.tsx` (novo componente)
  - `Frontend/src/components/vault/VaultTimeline.tsx` (novo componente)
  - `Frontend/src/components/vault/VaultMarkdownViewer.tsx` (novo componente)
  - `Frontend/src/components/patients/PatientVault.tsx` (atualizado para atuar como wrapper do container)
- **Instruções Técnicas de Implementação:**
  1. Criar `usePatientVault(patientId: string)`:
     - Encapsular `useQuery` de leitura do grafo.
     - Encapsular `useMutation` para criação de checkpoint e assinatura de revisão.
     - Gerenciar estado de seleção de nós, aba ativa e modal de aprovação.
  2. Extrair o visualizador Markdown seguro para `VaultMarkdownViewer.tsx`.
  3. Extrair a linha do tempo de checkpoints com badges para `VaultTimeline.tsx`.
  4. Extrair o painel lateral de inspeção de nó selecionado para `VaultNodeInspector.tsx`.
- **Critérios Objetivos de Sucesso (DoD):**
  - `PatientVault.tsx` torna-se um componente limpo e coeso (< 40 linhas).
  - Todas as funcionalidades anteriores (visualização de markdown, aprovação, seleção de nó) continuam operando normalmente.

---

### Tarefa 2.5: Migração da Visualização do Grafo para Cytoscape.js com *Compound Nodes*

- **Objetivo:** Substituir a renderização estática em SVG com truncamento em 40 nós por uma visualização profissional e escalável em Canvas com agrupamento nativo de comunidades Leiden.
- **Arquivos-Alvo:**
  - `Frontend/package.json`
  - `Frontend/src/components/vault/VaultCytoscapeCanvas.tsx` (novo componente)
  - `Frontend/src/components/vault/VaultContainer.tsx`
- **Instruções Técnicas de Implementação:**
  1. Instalar as dependências necessárias no diretório `Frontend`:
     ```powershell
     npm install cytoscape cytoscape-fcose
     npm install -D @types/cytoscape
     ```
  2. Implementar `VaultCytoscapeCanvas.tsx`:
     - Registrar a extensão de layout: `cytoscape.use(fcose);`.
     - Transformar o payload `VaultGraph` em elementos Cytoscape:
       - Cada nó de `nodes` vira um elemento com `data: { id: node.id, label: node.label, kind: node.kind, weight: parseFloat(node.weight), parent: communityId }`.
       - Cada comunidade de `communities` vira um **nó composto pai** (*compound node*): `data: { id: `comm_${idx}`, label: `Comunidade ${idx + 1}` }`.
       - Cada aresta de `edges` vira um elemento com `data: { id: edge.id, source: edge.source, target: edge.target, relation: edge.relation, confidence: parseFloat(edge.confidence) }`.
     - Configurar a folha de estilo Cytoscape:
       - Rótulos visíveis com quebra de linha: `'label': 'data(label)'`, `'font-size': '11px'`, `'text-wrap': 'wrap'`.
       - Cores semânticas por categoria clínica:
         - `node[kind = "symptom"]`: vermelho/coral (`#f87171`)
         - `node[kind = "event"]`: azul/índigo (`#60a5fa`)
         - `node[kind = "context"]`: âmbar/amarelo (`#fbbf24`)
         - `node[kind = "intervention"]`: verde/esmeralda (`#34d399`)
       - Nós pais (*compound nodes* de Leiden): caixa translúcida (`background-opacity: 0.1`, `border-style: dashed`).
       - Arestas direcionadas com setas: `'target-arrow-shape': 'triangle'`, `'curve-style': 'bezier'`, espessura proporcional à `confidence`.
     - Layout: aplicar `name: 'fcose', quality: 'proof', randomize: false, animate: true`.
     - Eventos interativos:
       - Ao clicar no nó (`cy.on('tap', 'node', ...)`), acionar callback `onSelectNode(node.id)`.
       - Suporte nativo a zoom pela roda do mouse, pan e reposicionamento manual de nós.
     - Barra de ferramentas auxiliar: botões para "Centralizar Grafo" (`cy.fit()`), "Aumentar Zoom" e "Diminuir Zoom".
- **Critérios Objetivos de Sucesso (DoD):**
  - O componente renderiza grafos com mais de 100 nós sem travamento ou sobreposição.
  - Não há mais truncamento em 40 nós (`slice(0, 40)` removido).
  - As comunidades de Leiden são exibidas claramente como grupos temáticos contendo seus respectivos nós membros.
  - O build do frontend (`npm run build`) conclui com êxito (código de saída 0).
- **Mitigação de Riscos:**
  - Como o Cytoscape manipula um elemento de container Canvas imperativo via `useRef`, certificar-se de destruir a instância no cleanup do hook (`useEffect`: `return () => { cy.destroy(); };`) para evitar vazamentos de memória (*memory leaks*).

---

## 4. Fase 3: Fortalecimento da Suíte de Testes e Validação Integrada Contínua

### Tarefa 3.1: Testes de Contrato Inter-serviços Django $\leftrightarrow$ FastAPI

- **Objetivo:** Validar a conformidade mútua de schemas entre o cliente HTTP do Django e as rotas do FastAPI sem monkeypatching cego.
- **Arquivos-Alvo:**
  - `Backend/tests/test_vault_contracts.py` (novo arquivo)
- **Instruções Técnicas de Implementação:**
  1. Utilizar o `TestClient` do FastAPI instanciado a partir de `Backend.ai_service.main.app`.
  2. Implementar um teste em que a classe `AIClient` do Django direcione suas requisições para o `TestClient` local via adaptador customizado ou mock de transporte HTTP (`pytest-httpx` / `requests_mock`).
  3. Validar cenários de sucesso e erro:
     - Envio de payload real do Django para `/vault/extract` e recepção de nós/arestas parseados corretamente.
     - Validação de que a rejeição por evidência não-literal no FastAPI é capturada e tratada pelo Django de forma adequada.
- **Critérios Objetivos de Sucesso (DoD):**
  - Execução de `pytest Backend/tests/test_vault_contracts.py` é concluída com 100% de aprovação.

---

### Tarefa 3.2: Configuração de Vitest e Testes Unitários no Frontend

- **Objetivo:** Estabelecer a infraestrutura de testes automatizados no frontend (saindo de 0% de cobertura).
- **Arquivos-Alvo:**
  - `Frontend/package.json`
  - `Frontend/vite.config.ts` (ou `Frontend/vitest.config.ts`)
  - `Frontend/src/tests/setup.ts` (novo arquivo)
  - `Frontend/src/components/vault/VaultApprovalModal.test.tsx` (novo arquivo)
- **Instruções Técnicas de Implementação:**
  1. Instalar pacotes de teste no Frontend:
     ```powershell
     npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
     ```
  2. Adicionar os scripts em `Frontend/package.json`:
     ```json
     "test": "vitest run",
     "test:watch": "vitest"
     ```
  3. Configurar ambiente de teste `jsdom` no Vite ou arquivo dedicado.
  4. Escrever testes unitários para:
     - `VaultApprovalModal.test.tsx`: valida que o botão de confirmar só é habilitado após digitação de justificativa válida.
     - `usePatientVault`: valida o carregamento de dados em modo mock.
- **Critérios Objetivos de Sucesso (DoD):**
  - Executar `npm test` no Frontend roda a suíte e aprova todos os testes criados.

---

### Tarefa 3.3: Pipeline de Teste Integrado com Docker e PostgreSQL 16 + pgvector

- **Objetivo:** Exercitar migrações e consultas vetoriais autênticas com a extensão `pgvector` em ambiente de contêiner.
- **Arquivos-Alvo:**
  - `Backend/docker-compose.test.yml` (novo arquivo)
- **Instruções Técnicas de Implementação:**
  1. Criar `Backend/docker-compose.test.yml` orquestrando:
     - Serviço `db_test`: imagem `pgvector/pgvector:pg16` com banco em memória temporária (tmpfs).
     - Serviço `backend_test`: executa `python manage.py migrate` e `pytest`.
  2. Adicionar teste que executa busca vetorial real (`VaultNode.objects.annotate(distance=CosineDistance('embedding', query_vector)).order_by('distance')`).
- **Critérios Objetivos de Sucesso (DoD):**
  - O comando `docker compose -f docker-compose.test.yml run --rm backend_test` conclui todas as migrações e suíte de testes com código de saída 0.

---

## 5. Checklist Rápido de Verificação de Transição (Definition of Done)

Utilize este checklist para verificar cada marco antes de declarar a transição concluída:

| Item de Verificação | Comando / Procedimento | Critério de Aceitação |
|---|---|---|
| **Testes Unitários do Backend** | `cd Backend; .venv\Scripts\pytest -q` | 29+ testes aprovados sem falhas |
| **Linters e Estilo do Backend** | `cd Backend; .venv\Scripts\ruff check .` | 0 erros de linting |
| **Build de Produção do Frontend** | `cd Frontend; npm run build` | Código de saída 0 (sem erros de TypeScript) |
| **Linters do Frontend** | `cd Frontend; npm run lint` | Execução limpa sem advertências impeditivas |
| **Testes Automatizados do Frontend** | `cd Frontend; npm test` | Suíte Vitest aprovada com 100% de sucesso |
| **Modo Mock Offline** | Iniciar Frontend com `VITE_USE_API=false` | Vault renderiza grafo completo e checkpoints simulados |
| **Integridade de Código** | `git status` | Nenhuma modificação espúria ou commit acidental |

Seguindo este roteiro estruturado, a próxima IA desenvolvedora disporá de todas as especificações técnicas, modelos de dados e salvaguardas necessárias para entregar uma versão robusta, elegante e clinicamente segura do Vault Cognitivo e GraphRAG no AELO.
