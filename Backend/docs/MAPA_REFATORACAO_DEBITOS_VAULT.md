# Mapa de Refatoração e Débitos Técnicos: Vault Cognitivo com GraphRAG Hierárquico

**Projeto:** AELO — Sistema de Apoio à Decisão Clínica em Saúde Mental  
**Data da Documentação:** 2026-11-02  
**Autor:** Equipe de Engenharia / Agente `worker_docs_1`  
**Escopo:** Análise exaustiva de débitos técnicos, pontos de atrito, gargalos de desempenho e oportunidades de refatoração no subsistema de Vault Cognitivo e GraphRAG Hierárquico, abrangendo o Backend Django (`apps/ai_analysis/`, `services/ai/`), o microsserviço FastAPI (`ai_service/`), a interface Frontend React (`PatientVault.tsx`, `clinicalService.ts`) e a infraestrutura de testes automatizados.

---

## 1. Visão Geral da Arquitetura e Contexto Clínico

O subsistema de **Vault Cognitivo com GraphRAG Hierárquico** do AELO foi concebido para fornecer uma memória clínica longitudinal estruturada para psicoterapeutas, operando sob uma arquitetura de duplo processo cognitivo (inspirada na Teoria do Processo Duplo de Kahneman):
1. **Análise do Ponto (Sistema 1 / Local):** Extração imediata de conceitos e relações clínicas da sessão atual via triplas semânticas (nós e arestas).
2. **Análise do Todo (Sistema 2 / Global):** Confrontação da sessão presente com a topologia histórica acumulada do paciente, gerando reflexões, contrastes e perguntas exploratórias para o terapeuta.
3. **Síntese e Auditoria Ética (Checkpoints em Markdown):** Consolidação dos achados em relatórios perenes no formato Markdown, assinados digitalmente pelo profissional com criptografia assimétrica (ECDSA P-256) em conformidade com as diretrizes do Conselho Federal de Psicologia (Resolução CFP 09/2024) e o Artigo 20 da LGPD.

Apesar da solidez conceitual e das rígidas salvaguardas de conformidade já implementadas (como a obrigatoriedade de evidência literal restrita e a persistência criptografada em repouso), a evolução do protótipo acumulou débitos técnicos significativos em todas as três camadas do sistema. Este documento mapeia cada um desses débitos, detalhando seus impactos arquiteturais e fornecendo propostas concretas de refatoração para orientar a atuação da próxima IA desenvolvedora.

---

## 2. Débitos Técnicos no Backend Django (`apps/ai_analysis/`, `services/ai/`)

### 2.1 Gargalo de Bloqueio de Threads nos Workers Gunicorn (I/O Síncrono de IA)

#### Localização no Código
- `Backend/docker-compose.yml` (comando de inicialização: `gunicorn --bind 0.0.0.0:8000 config.wsgi:application --workers 3 --timeout 120`)
- `Backend/apps/ai_analysis/views.py`: função `build_vault_checkpoint` (linhas 78-85)
- `Backend/apps/ai_analysis/vault.py`: função `create_checkpoint` (linhas 51-190)
- `Backend/services/ai/client.py`: classe `AIClient` (linhas 15-46)

#### Diagnóstico Técnico Detalhado
O servidor de aplicação web Django é executado sob o Gunicorn utilizando o modelo padrão de **workers síncronos WSGI**, alocando exatamente **3 workers**. Cada worker é um processo com uma única thread de execução capaz de atender uma única requisição HTTP por vez.

Ao disparar a criação de um checkpoint do Vault (`POST /api/vault/analyses/{analysis_id}/checkpoint/`), o controlador `build_vault_checkpoint` invoca diretamente `create_checkpoint(analysis)` no mesmo fio de execução da requisição web. Dentro desta função ocorrem, de forma sequencial e bloqueante:
1. `AIClient().request_vault(payload)`: requisição HTTP síncrona via biblioteca `requests` para o endpoint `/vault/extract` do FastAPI (latência média de 10 a 25 segundos dependendo do hardware do Ollama).
2. `AIClient().request_vault_synthesis(...)`: segunda requisição HTTP síncrona para `/vault/synthesize` no FastAPI (latência média de 10 a 20 segundos).

Durante todo esse intervalo (totalizando entre **20 e 45 segundos** por operação), o worker Gunicorn fica 100% bloqueado aguardando I/O de rede.

```
[Requisição HTTP 1] ──► Worker Gunicorn #1 ──► [Espera Síncrona Ollama: 35s] ──► (BLOQUEADO)
[Requisição HTTP 2] ──► Worker Gunicorn #2 ──► [Espera Síncrona Ollama: 40s] ──► (BLOQUEADO)
[Requisição HTTP 3] ──► Worker Gunicorn #3 ──► [Espera Síncrona Ollama: 30s] ──► (BLOQUEADO)
                              ▼
[Requisição HTTP 4] ──► NENHUM WORKER LIVRE!
(Qualquer requisição clínica de login, visualização ou auditoria entra em fila e expira com 502/504)
```

#### Impacto e Riscos
- **Esgotamento Total da Aplicação (Thread Starvation):** Basta que 3 psicólogos ou abas abertas solicitem a extração ou checkpoint simultaneamente para que todo o backend do AELO pare de responder. Nenhuma outra rota da API (incluindo autenticação, listagem de pacientes ou registro de atendimento de urgência) poderá ser processada até que a inferência do LLM finalize.
- **Risco de Timeout no Reverse Proxy:** Caso a resposta demore mais que os limites intermediários de proxies ou gateways (como Caddy, Nginx ou Cloudflare), a conexão é abortada unilateralmente pelo cliente, desperdiçando todo o processamento de GPU já iniciado.

#### Proposta de Refatoração
1. **Desacoplamento Assíncrono com Background Tasks:**
   - Adicionar uma fila de tarefas assíncronas (Celery com broker Redis ou uma tabela gerenciada de tarefas no PostgreSQL com `django-tasks` / `django-q2`).
   - A rota `POST /api/vault/analyses/{analysis_id}/checkpoint/` deve apenas registrar o pedido, alterar o estado da análise para `PROCESSING_CHECKPOINT` e retornar imediatamente `HTTP 202 Accepted` com um identificador de tarefa (`{"task_id": "...", "status": "queued"}`).
2. **Notificação de Conclusão:**
   - O worker de background executa a extração e síntese. Ao concluir, atualiza o status para `PENDING_REVIEW` e persiste o `VaultCheckpoint`.
   - O frontend acompanha o progresso via polling leve (`GET /api/vault/analyses/{id}/checkpoint-status/`) ou Server-Sent Events (SSE).

---

### 2.2 Descompasso Crítico na Cascata de Timeouts (Frontend vs. Django vs. FastAPI)

#### Localização no Código
- `Frontend/src/services/clinicalService.ts`: linha 54 (`{ timeout: 90_000 }` — 90 segundos)
- `Backend/config/settings.py`: linha 147 (`AI_SERVICE_TIMEOUT = float(os.getenv("AI_SERVICE_TIMEOUT", "30"))` — 30 segundos padrão)
- `Backend/services/ai/client.py`: linha 30 (`timeout=self.timeout`)
- `Backend/ai_service/main.py`: linhas 113, 197, 218, 237 (`httpx.AsyncClient(timeout=25)` — 25 segundos por chamada Ollama)

#### Diagnóstico Técnico Detalhado
Existe uma severa incoerência e inversão de limites na cadeia de chamadas síncronas entre os serviços:

| Camada | Timeout Configurado | Mecanismo | Comportamento em Caso de Limite |
|---|---|---|---|
| **Frontend** | 90 segundos (90.000 ms) | Axios / Fetch API | Aborta a promessa e exibe erro ao usuário |
| **Gunicorn (WSGI)** | 120 segundos | Flag CLI `--timeout 120` | Mata o processo worker com sinal `SIGABRT` |
| **Django (`AIClient`)** | **30 segundos** | `requests.post(..., timeout=30.0)` | Lança `requests.Timeout` e emite `AIServiceError(503)` |
| **FastAPI (`httpx`)** | 25 segundos por chamada | `httpx.AsyncClient(timeout=25)` | Lança `httpx.TimeoutException` e emite HTTP 503 |

**A Fratura da Cascata:**
O endpoint `/vault/extract` no FastAPI executa sucessivamente:
1. `ollama_vault(payload.note)`: geração JSON com modelo LLaMA 3.1 8B (timeout de 25s).
2. `embed_texts([node.label for node in nodes])`: cálculo de embeddings vetoriais com EmbeddingGemma (timeout de 25s).

Se a extração levar 18 segundos e o embedding levar 14 segundos, o tempo total decorrido no FastAPI será de **32 segundos**. Ambos os passos operaram perfeitamente dentro de seus respectivos limites de 25s. Contudo, aos **30 segundos exatos**, o Django interrompe a conexão abruptamente e lança `AIServiceError(status_code=503)`, retornando erro para o Frontend — enquanto o Frontend ainda estava preparado para esperar mais 60 segundos!

#### Impacto e Riscos
- **Falsos Negativos Sistêmicos:** O sistema falha com erro 503 para o usuário em notas clínicas moderadamente extensas, mesmo quando todos os serviços de IA estavam saudáveis e completariam o processamento poucos segundos depois.
- **Desperdício de Recursos de Hardware:** O Ollama continua processando o embedding na GPU até a conclusão, mas o resultado é descartado porque o Django já cortou o canal HTTP.

#### Proposta de Refatoração
1. Parametrizar explicitamente a cascata com margens decrescentes:
   - Frontend: `timeout = 120s`
   - Gunicorn: `--timeout 150`
   - Django `AI_SERVICE_TIMEOUT`: default de `90s` (ou `100s`)
   - FastAPI `OLLAMA_TIMEOUT`: default de `40s` por chamada individual, permitindo a soma das etapas sem estourar o gateway do Django.
2. Injetar essas variáveis de ambiente de forma harmonizada no `docker-compose.yml` e `.env.example`.

---

### 2.3 Monólito Procedural em `vault.py` e Violação de Separação de Conceitos

#### Localização no Código
- `Backend/apps/ai_analysis/vault.py` (arquivo único com 220 linhas)

#### Diagnóstico Técnico Detalhado
O módulo `vault.py` tornou-se um agregador procedural monolítico que concentra responsabilidades de domínios inteiramente distintos:
1. **Constantes de Vocabulário Fechado:** Definição de `KINDS` e `RELATIONS` (linhas 21-22).
2. **Topologia e Algoritmos de Grafos:** Conversão de instâncias de modelo para a biblioteca `python-igraph`, cálculo de modularidade e particionamento de comunidades pelo algoritmo de Leiden (função `detect_communities`, linhas 25-36).
3. **Criptografia e Hashing:** Geração de chaves HMAC-SHA256 com salvação de segredo da aplicação para geração de fingerprints unívocos de nós (função `_fingerprint`, linhas 39-41).
4. **Comunicação de Rede e Orquestração:** Invocação síncrona do cliente de IA (`AIClient`), controle de payloads e validação cruzada de strings literais (função `create_checkpoint`, linhas 51-100).
5. **Transações de Banco de Dados e Concorrência:** Abertura de bloco `transaction.atomic()`, aquisição de locks pessimistas (`select_for_update()`) na entidade `ClinicalNote`, verificação de versão da nota e gravação atômica de nós e arestas (linhas 101-146).
6. **Matemática de Grafos Temporais (TKG):** Aplicação de decaimento diário de pesos via potência exponencial `0.98 ** elapsed_days` e cálculo manual de centralidade em memória Python (linhas 148-158).
7. **Renderização de Documentos:** Formatação procedural de cabeçalhos YAML (Frontmatter), interpolação de strings Markdown, sanitização de caracteres de controle (`_safe_line`) e cálculo do hash de integridade SHA-256 (linhas 160-220).

#### Impacto e Riscos
- **Dificuldade de Testes Unitários Isolados:** Não é possível testar o algoritmo de Leiden ou a renderização do Markdown sem instanciar todo o ecossistema do Django ORM ou criar mocks pesados de transações e chaves secretas.
- **Fragilidade e Risco de Regressão:** Qualquer alteração na lógica de montagem do Markdown acidentalmente afeta a integridade da transação de persistência das arestas.

#### Proposta de Refatoração
Decompor `vault.py` em um pacote modular estruturado dentro de `Backend/apps/ai_analysis/vault/`:
```
apps/ai_analysis/vault/
├── __init__.py            # Exporta create_checkpoint e detect_communities mantendo compatibilidade
├── constants.py           # KINDS, RELATIONS, limites numéricos (MAX_NODES, MAX_EDGES)
├── algorithms.py          # detect_communities (igraph), decay_weights, calculate_centrality
├── security.py            # _fingerprint HMAC, validação de evidência literal
├── renderers.py           # MarkdownCheckpointRenderer, formatação de frontmatter e seções
└── services.py            # Orquestração do checkpoint, bloqueio pessimista e persistência ORM
```

---

### 2.4 Ausência de DRF Serializers para as Entidades do Vault

#### Localização no Código
- `Backend/apps/ai_analysis/views.py`: linhas 65-72 (`patient_vault`) e 102-108 (`read_vault_checkpoint`)
- `Backend/apps/ai_analysis/serializers.py`: ausência das classes de serialização do Vault

#### Diagnóstico Técnico Detalhado
Nas views que expõem os dados do grafo e dos checkpoints, o Django REST Framework (DRF) é utilizado apenas para autenticação e permissões, sendo completamente contornado na camada de serialização. A conversão de instâncias do ORM para estruturas JSON é realizada através de dicionários Python literais montados manualmente inline:

```python
# Trecho de Backend/apps/ai_analysis/views.py:65-72
return Response({
    "nodes": [{"id": str(n.id), "kind": n.kind, "label": n.label, "mention_count": n.mention_count, ...} for n in nodes],
    "edges": [{"id": str(e.id), "source": str(e.source_id), "target": str(e.target_id), ...} for e in edges],
    "communities": detect_communities(nodes, edges),
    "checkpoints": [{"id": str(c.id), "analysis_id": str(c.analysis_id), ...} for c in checkpoints],
})
```

#### Impacto e Riscos
- **Incompatibilidade com Ferramentas de Documentação:** Ferramentas automáticas como `drf-spectacular` ou Swagger/OpenAPI não conseguem inspecionar os tipos de retorno das rotas do Vault, gerando especificações de schema vazias (`Response 200: object`).
- **Inconsistência de Tipagem Decimal:** O campo `weight` de `VaultNode` e os campos `confidence` e `weight` de `VaultEdge` são convertidos manualmente para strings (`str(n.weight)`) para contornar o erro de serialização do `Decimal`, em vez de utilizarem o tratamento padronizado do DRF.
- **Duplicação de Código:** A lógica de representação dos dados fica dispersa dentro das funções das views, violando o padrão arquitetural do Django REST Framework.

#### Proposta de Refatoração
Implementar classes dedicadas em `apps/ai_analysis/serializers.py`:
- `VaultNodeSerializer(serializers.ModelSerializer)`
- `VaultEdgeSerializer(serializers.ModelSerializer)`
- `VaultCheckpointSummarySerializer(serializers.ModelSerializer)`
- `VaultGraphSerializer(serializers.Serializer)`
- `VaultCheckpointDetailSerializer(serializers.ModelSerializer)`

---

### 2.5 Cálculo de Centralidade e Decaimento em Memória com Slicing Arbitrário

#### Localização no Código
- `Backend/apps/ai_analysis/vault.py`: linhas 148-158

#### Diagnóstico Técnico Detalhado
Para calcular a centralidade e selecionar os tópicos de maior relevância no checkpoint, o código atual realiza a carga de até 1.000 nós e 2.000 arestas do banco de dados para a memória da aplicação através de slices rígidos:

```python
all_nodes = list(VaultNode.objects.filter(patient=patient).order_by("first_seen_at", "id")[:1000])
node_ids = {node.id for node in all_nodes}
all_edges = list(
    VaultEdge.objects.filter(patient=patient, source_id__in=node_ids, target_id__in=node_ids)
    .order_by("observed_at", "id")[:2000]
)
scores = defaultdict(Decimal)
for edge in all_edges:
    days = max((observed_at - edge.observed_at).days, 0)
    decayed = edge.weight * (Decimal("0.98") ** days)
    scores[edge.source_id] += decayed
    scores[edge.target_id] += decayed
```

#### Impacto e Riscos
- **Truncamento Cego de Dados Históricos:** Se um paciente tiver 1.050 nós ou 2.500 arestas acumuladas ao longo de anos de terapia, os elementos mais recentes podem ser silenciosamente excluídos do cálculo devido ao `[:1000]` ordenado por `first_seen_at`.
- **Sobrecarga de Alocação de Memória:** A instanciação de 3.000 objetos Django ORM com campos criptografados consome megabytes de RAM desnecessariamente a cada geração de checkpoint.

#### Proposta de Refatoração
1. Substituir a ordenação estática por filtros orientados a janelas temporais clinicamente relevantes (ex.: últimos 12 meses ou nós com menções ativas).
2. Avaliar a execução de agregações ponderadas diretamente no PostgreSQL utilizando funções SQL analíticas (`SUM(weight * POWER(0.98, ...))`).

---

## 3. Débitos Técnicos no Microsserviço FastAPI (`ai_service/main.py`)

### 3.1 Monólito em Arquivo Único (323 Linhas)

#### Localização no Código
- `Backend/ai_service/main.py`

#### Diagnóstico Técnico Detalhado
O microsserviço de IA é composto por um único arquivo que acumula:
- Configurações globais e variáveis de ambiente (linhas 7-16)
- 12 definições de modelos de dados Pydantic (linhas 19-110)
- Funções utilitárias de chamada ao Ollama para embeddings e geração de texto (linhas 112-247)
- Algoritmos de busca e recuperação: RRF (Reciprocal Rank Fusion), BM25 simplificado e expansão topológica de 1 salto (linhas 132-176)
- Endpoint de health check (linhas 249-251)
- Três endpoints HTTP complexos com validação manual de regras de negócio (linhas 254-323)

#### Impacto e Riscos
- Dificuldade para manter e auditar o código.
- Impossibilidade de reaproveitar funções de serviço ou validação em outros módulos ou suítes de teste.
- Risco elevado de conflitos de merge durante evoluções paralelas.

#### Proposta de Refatoração
Modularizar a estrutura do pacote `ai_service/`:
```
ai_service/
├── main.py                # Ponto de entrada FastAPI, middlewares e registro de rotas
├── config.py              # Variáveis de ambiente e constantes (Ollama URLs, timeouts)
├── core/
│   ├── dependencies.py    # Autenticação X-AI-Service-Token
│   └── lifespan.py        # Gerenciamento de ciclo de vida (startup/shutdown, pool HTTP)
├── schemas/
│   ├── analysis.py        # AnalysisRequest, ContextItem, GraphFact
│   └── vault.py           # VaultRequest, VaultExtraction, VaultSynthesisRequest, VaultSynthesis
├── services/
│   ├── ollama.py          # Cliente HTTP do Ollama (generate, embed) com retentativa
│   └── retrieval.py       # Algoritmos de RAG lexical/semântico e fusão RRF
└── routers/
    ├── health.py          # /health/live e /health/ready
    ├── analysis.py        # POST /analysis
    └── vault.py           # POST /vault/extract e POST /vault/synthesize
```

---

### 3.2 Ausência de Pool de Conexões HTTP (Instanciação Efêmera de `httpx.AsyncClient`)

#### Localização no Código
- `Backend/ai_service/main.py`:
  - Linha 113 em `embed_texts`: `async with httpx.AsyncClient(timeout=25) as client:`
  - Linha 197 em `ollama_analysis`: `async with httpx.AsyncClient(timeout=25) as client:`
  - Linha 218 em `ollama_vault`: `async with httpx.AsyncClient(timeout=25) as client:`
  - Linha 237 em `ollama_vault_synthesis`: `async with httpx.AsyncClient(timeout=25) as client:`

#### Diagnóstico Técnico Detalhado
A cada chamada individual para o Ollama, o FastAPI abre e fecha uma nova instância de `httpx.AsyncClient`. O uso de clientes HTTP efêmeros viola as melhores práticas de comunicação em rede de alta performance:
- Cada requisição é forçada a negociar uma nova conexão TCP (handshake SYN/ACK) com a porta 11434 do Ollama.
- Não há reaproveitamento de conexões mantidas (*HTTP keep-alive*).
- O encerramento constante de clientes deixa sockets locais em estado `TIME_WAIT`, gerando risco de exaustão de portas efêmeras em cenários de requisições concorrentes.

#### Impacto e Riscos
- Degradação de latência: acréscimo de 5 a 20 ms a cada requisição de extração e embedding.
- Instabilidade sob carga concorrente no ambiente Docker.

#### Proposta de Refatoração
Implementar um **cliente HTTP singleton gerenciado pelo ciclo de vida (`lifespan`) do FastAPI**:

```python
# Exemplo conceitual para lifespan em ai_service/main.py
from contextlib import asynccontextmanager
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização: cria pool de conexões persistentes com limites controlados
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(45.0), limits=limits)
    yield
    # Finalização: fecha o pool adequadamente
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)
```

As funções de serviço recebem o cliente via injeção de dependência (`request.app.state.http_client`).

---

### 3.3 Ausência de Retentativas com Backoff Exponencial e Circuit Breaker para o Ollama

#### Localização no Código
- `Backend/ai_service/main.py`: funções `embed_texts`, `ollama_analysis`, `ollama_vault`, `ollama_vault_synthesis`

#### Diagnóstico Técnico Detalhado
O código atual realiza apenas uma tentativa única de requisição HTTP contra a API do Ollama. Se ocorrer qualquer anomalia passageira (como `httpx.ConnectTimeout`, oscilação de rede ou queda momentânea da thread de inferência), a exceção é capturada de imediato e transformada em um erro HTTP 503 Service Unavailable para o cliente.

Essa fragilidade é especialmente crítica no ecossistema do Ollama devido ao fenômeno de **Cold Start de Modelos**:
- Quando o Ollama recebe uma chamada para `llama3.1` (modelo com pesos de ~4,7 GB a 8 GB) e o modelo não está previamente carregado na VRAM da GPU, o daemon precisa carregar os tensores do disco para a memória.
- Esse carregamento inicial pode demorar de **5 a 15 segundos**, período durante o qual o Ollama pode pausar temporariamente o processamento ou responder com lentidão extrema.
- Sem um mecanismo de retentativa inteligente com backoff exponencial e jitter, requisições disparadas durante o cold start falham imediatamente.

#### Impacto e Riscos
- **Altíssima taxa de erros intermitentes:** Primeira requisição de cada turno clínico costuma falhar, exigindo recarregamentos manuais por parte do psicólogo.
- **Sobrecarga em Cascata:** Falhas sem circuit breaker continuam bombardeando o Ollama enquanto ele tenta se recuperar de sobrecargas de memória.

#### Proposta de Refatoração
Integrar a biblioteca **`tenacity`** com política estrita para erros transitórios:
- Retentar apenas em `httpx.ConnectError`, `httpx.ConnectTimeout` e códigos HTTP transitórios (`502`, `503`, `504`).
- Política: máximo de 3 tentativas com backoff exponencial (`wait_exponential(multiplier=1, min=2, max=10)`) e jitter aleatório.
- Não retentar em erros determinísticos (ex.: HTTP 400 ou validação Pydantic).

---

### 3.4 Health Check Cego (`/health` Estático)

#### Localização no Código
- `Backend/ai_service/main.py`: linhas 249-251

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

#### Diagnóstico Técnico Detalhado
O endpoint `/health` limita-se a retornar a string estática `{"status": "ok"}`. Ele não realiza nenhuma verificação da infraestrutura dependente:
- Não verifica se o processo do Ollama está em execução (`GET {OLLAMA_BASE_URL}/api/version`).
- Não confere se os modelos obrigatórios (`llama3.1` e `embeddinggemma`) estão instalados e disponíveis (`GET {OLLAMA_BASE_URL}/api/tags`).
- Não verifica se a porta de comunicação com o host está aberta.

#### Impacto e Riscos
- **Falsa Positividade nos Orquestradores:** O Docker Compose e eventuais balanceadores de carga assumem que o serviço `ai_service` está operacional e saudável, roteando requisições para ele mesmo quando o Ollama travou ou foi encerrado por falta de memória (OOM Killer do Linux).

#### Proposta de Refatoração
Dividir o monitoramento em duas rotas padronizadas:
1. `GET /health/live` (Liveness): verificação superficial e ultra-rápida de que o processo Python do FastAPI está ativo.
2. `GET /health/ready` (Readiness): verificação profunda e ativa:
   - Ping no Ollama (`GET {OLLAMA_BASE_URL}/api/version` com timeout de 2 segundos).
   - Validação de que os modelos `OLLAMA_MODEL` e `OLLAMA_EMBED_MODEL` constam na lista do Ollama.
   - Retorno HTTP 200 com payload detalhado (`{"status": "ready", "ollama": "connected", "models": ["llama3.1", "embeddinggemma"]}`) ou HTTP 503 com detalhes caso o daemon esteja inacessível.

---

### 3.5 Tratamento de Exceções Silencioso e Genérico (Black Hole 503)

#### Localização no Código
- `Backend/ai_service/main.py`:
  - Linhas 272-274 em `/vault/extract`
  - Linhas 290-292 em `/vault/synthesize`
  - Linhas 321-323 em `/analysis`

```python
except (httpx.HTTPError, ValueError, ValidationError):
    raise HTTPException(status_code=503, detail="Ollama extraction unavailable")
```

#### Diagnóstico Técnico Detalhado
Os blocos de captura de exceção das rotas principais agrupam erros completamente distintos (`httpx.HTTPError`, `ValueError`, `ValidationError`) e emitem genericamente um erro HTTP 503 com mensagens padronizadas.
Mais grave ainda: **nenhuma mensagem de log, traceback ou registro em `sys.stderr` é emitido antes do `raise HTTPException`**.

#### Impacto e Riscos
- **Impossibilidade Total de Depuração em Produção:** Quando uma chamada falha com 503, os desenvolvedores e operadores de infraestrutura não têm como saber se a causa raiz foi:
  - Uma falha de rede ao contatar o Ollama.
  - Uma resposta JSON malformada ou truncada gerada pelo LLM.
  - Uma violação de validação do Pydantic (ex.: rótulo ultrapassando 120 caracteres).
  - A rejeição de uma evidência que não foi encontrada literalmente no texto.

#### Proposta de Refatoração
1. Configurar um logger formal via `logging.getLogger("ai_service")`.
2. Registrar o traceback completo (`logger.exception("Falha durante o processamento de /vault/extract: %s", err)`) com identificador de correlação (`X-Request-ID`).
3. Em ambiente de desenvolvimento e testes (`ENVIRONMENT != "production"`), retornar a mensagem detalhada da causa no corpo da resposta JSON do 503.

---

## 4. Débitos Técnicos no Frontend React (`PatientVault.tsx`, `clinicalService.ts`)

### 4.1 Monólito de Apresentação e Estado em `PatientVault.tsx`

#### Localização no Código
- `Frontend/src/components/patients/PatientVault.tsx` (83 linhas)

#### Diagnóstico Técnico Detalhado
O componente reúne em um único arquivo de 83 linhas todas as responsabilidades do subsistema:
1. Gerenciamento de estado de abas (`"graph"` vs `"timeline"`), seleção de nó e buffer de Markdown.
2. Invocação de quatro hooks assíncronos do React Query (`useQuery` para carregar o grafo e três `useMutation` para gerar checkpoint, assinar revisão e consultar detalhes).
3. Cálculo trigonométrico inline das posições de nós e arestas.
4. Renderização do DOM SVG do grafo com tratamento de eventos de mouse e teclado.
5. Painel lateral com filtragem de arestas incidentes para o nó ativo.
6. Lista de histórico de checkpoints com badges de status.
7. Renderizador de texto Markdown com `ReactMarkdown`.

#### Impacto e Riscos
- Violação direta dos princípios de componentização e legibilidade do ecossistema React.
- Dificuldade para criar testes visuais e unitários: não é possível testar o visualizador de markdown ou o painel de inspeção sem montar todo o grafo e suas queries de dados.

#### Proposta de Refatoração
Decompor a interface em componentes especializados dentro de `Frontend/src/components/vault/`:
- `VaultContainer.tsx`: componente orquestrador de estado e layout.
- `VaultGraphCanvas.tsx`: tela de renderização gráfica.
- `VaultNodeInspector.tsx`: painel lateral de detalhes e citações do nó selecionado.
- `VaultTimeline.tsx`: listagem cronológica de checkpoints históricos.
- `VaultMarkdownViewer.tsx`: visualizador sanitizado de Markdown com ações de download.
- Hook customizado `usePatientVault.ts`: encapsulamento de todas as queries, mutations e controle de estado do React Query.

---

### 4.2 Justificativa Hardcoded na Assinatura Criptográfica ECDSA P-256

#### Localização no Código
- `Frontend/src/components/patients/PatientVault.tsx`: linhas 29-33

```tsx
const review = useMutation({
  mutationFn: ({ analysisId, status }: { analysisId: string; status: "VALIDATED" | "REJECTED" }) =>
    signingService.review(analysisId, status, "Evidências do Vault revisadas", user?.id || ""),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vault", patientId] }),
});
```

#### Diagnóstico Técnico Detalhado
A assinatura digital baseada na chave privada Web Crypto (armazenada de forma segura no IndexedDB do navegador) representa a anuência explícita e irrevogável do profissional de psicologia sobre o conteúdo extraído pela IA.
Contudo, o componente injeta a justificativa textual de forma totalmente estática e fixa: `"Evidências do Vault revisadas"`.
Não existe nenhum campo de entrada de texto, diálogo de confirmação ou modal na interface que permita ao profissional relatar sua justificativa clínica personalizada.

#### Impacto e Riscos
- **Comprometimento da Validade Ético-Jurídica (Resolução CFP 09/2024 e LGPD Art. 20):** Auditorias clínicas e éticas exigem que a justificativa do profissional reflita seu julgamento deliberativo, e não um texto padrão gerado automaticamente pela interface.
- **Risco de Assinatura Acidental:** Um único clique acidental no botão de validação assina o parecer criptográfico sem uma etapa de revisão prévia da justificativa.

#### Proposta de Refatoração
Implementar o subcomponente `VaultApprovalModal.tsx`:
- Diálogo modal disparado ao clicar em "Aprovar Checkpoint" ou "Rejeitar Checkpoint".
- Exibição do resumo das métricas (nós, arestas, comunidades e hash SHA-256).
- Campo de texto obrigatório para a justificativa clínica do profissional (com validação de preenchimento mínimo, ex.: 15 caracteres).
- Botão final de assinatura que obtém a chave no IndexedDB e invoca `signingService.review(analysisId, status, justification, userId)`.

---

### 4.3 Bloqueio Total em Modo de Desenvolvimento Mock (`isApiMode`)

#### Localização no Código
- `Frontend/src/components/patients/PatientVault.tsx`: linha 36 (`if (!isApiMode) return null;`)
- `Frontend/src/services/clinicalService.ts`: linha 49 (`if (!isApiMode) return { nodes: [], edges: [], communities: [], checkpoints: [] };`)
- `Frontend/src/services/mockData.ts`: ausência de dados do Vault

#### Diagnóstico Técnico Detalhado
Quando a aplicação roda no modo padrão de desenvolvimento frontend sem o backend ativo (`VITE_USE_API !== "true"`):
1. O serviço `getPatientVault` retorna imediatamente um grafo vazio `{ nodes: [], edges: [], communities: [], checkpoints: [] }`.
2. A primeira linha de renderização de `PatientVault.tsx` executa `if (!isApiMode) return null;`, impedindo a renderização de qualquer elemento na tela.
3. Não há nenhum mock de `VaultGraph` estruturado em `mockData.ts`.

#### Impacto e Riscos
- Impossibilita o desenvolvimento, estilização de CSS, ajustes de acessibilidade e testes de usabilidade da interface por desenvolvedores que não possuam a pilha completa (Docker, Django, PostgreSQL e Ollama) rodando em suas máquinas.

#### Proposta de Refatoração
1. Adicionar uma constante `mockVaultGraph` completa em `Frontend/src/services/mockData.ts` contendo um exemplo clínico realista (com 12 nós dos 4 tipos `kind`, 16 arestas com evidências literais, 2 comunidades de Leiden e 2 checkpoints simulados).
2. Remover a restrição `if (!isApiMode) return null;`, permitindo que o componente opere perfeitamente com os dados mockados no modo de desenvolvimento.

---

### 4.4 Limitações Críticas da Visualização Gráfica em SVG

#### Diagnóstico Técnico Detalhado das 6 Fragilidades do SVG Atual
1. **Truncamento Rígido em 40 Nós (`nodes.slice(0, 40)`):**
   - Na linha 37 de `PatientVault.tsx`, o array de nós é cortado via `slice(0, 40)`.
   - O backend Django suporta até 200 nós por requisição e até 1.000 nós no checkpoint longitudinal. Portanto, em pacientes com acompanhamento prolongado, mais de 75% da rede conceitual é simplesmente ocultada da visualização do terapeuta sem qualquer aviso.
2. **Colapso do Layout Circular Rígido com N > 25:**
   - As posições dos nós são calculadas sobre uma elipse estática: $x = 250 + 190 \cos(\theta)$, $y = 225 + 180 \sin(\theta)$.
   - Para 40 nós, o espaçamento perimetral entre nós é de apenas ~29 pixels. Círculos de raio 9px a 13px começam a colidir visualmente, tornando a seleção por toque ou clique praticamente impossível.
3. **Efeito "Espaguete" de Arestas no Centro:**
   - As arestas são desenhadas como linhas retas cinzas uniformes (`stroke="currentColor" opacity="0.25"`).
   - Não há setas direcionais indicando a causalidade (`source -> target`), não há variação de espessura proporcional à confiança (`confidence`) e não há exibição visual das relações (`co_occurs`, `precedes`, `associated`).
   - Com mais de 25 arestas cruzando a elipse, o centro do grafo vira uma mancha gráfica ilegível.
4. **Ausência de Rótulos Visuais nos Nós:**
   - Os textos e nomes dos nós não são renderizados como elementos `<text>` no SVG.
   - A identificação depende exclusivamente da tag nativa `<title>`, exigindo que o psicólogo passe o cursor do mouse e aguarde o tooltip lento do sistema operacional nó por nó. O grafo aparenta ser uma constelação anônima de pontos.
5. **Inexistência de Codificação Semântica por Cores:**
   - Todos os nós são pintados com a mesma cor primária (`className="text-primary"`), desconsiderando totalmente a categoria clínica do nó (`kind` = `"symptom"`, `"event"`, `"context"`, `"intervention"`).
6. **Omissão Completa das Comunidades de Leiden:**
   - O backend calcula as partições de modularidade de Leiden e retorna `communities: string[][]`.
   - No frontend, o SVG ignora completamente essas partições. O componente limita-se a exibir um texto descritivo passivo no rodapé: *"X comunidades detectadas por Leiden. Agrupamentos não representam diagnósticos."* Não há agrupamento visual, caixas delimitadoras nem cores temáticas correspondentes.
7. **Ausência de Ferramentas de Navegação:**
   - Inexistência de zoom (mouse wheel / gesto de pinça), pan (arrasto de tela) ou reposicionamento de nós (*node dragging*).

---

### 4.5 Avaliação Comparativa de Bibliotecas de Visualização Gráfica

Abaixo apresenta-se o estudo comparativo aprofundado entre as alternativas para substituir o renderizador SVG atual:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPARAÇÃO DE TECNOLOGIAS DE GRAFO                              │
├──────────────────────┬───────────────────────┬───────────────────┬─────────────────────┤
│ Recurso              │ Cytoscape.js          │ react-force-graph │ D3.js (d3-force)    │
├──────────────────────┼───────────────────────┼───────────────────┼─────────────────────┤
│ Mecanismo Render     │ Canvas Multicamadas   │ Canvas 2D / WebGL │ SVG ou Canvas puro  │
│ Suporte a Leiden     │ NATIVO (Compound      │ Muito Difícil     │ Complexo            │
│ (Comunidades)        │ Nodes / Caixas)       │ (Forças custom)   │ (Convex Hulls manu) │
│ Layouts Integrados   │ fcose, cose, cola,    │ Força física      │ Apenas força        │
│                      │ concentric, breadth   │ contínua única    │ personalizada       │
│ Estilização          │ Seletores tipo CSS    │ Callbacks Canvas  │ Seletores DOM / D3  │
│ Tamanho do Bundle    │ ~200 kB (70 kB gzip)  │ ~220 kB (75 kB gz)│ ~40 kB (módulos)    │
│ Integração React     │ Excelente (Ref/DOM)   │ Declarativo Nativo│ Conflitante com DOM │
└──────────────────────┴───────────────────────┴───────────────────┴─────────────────────┘
```

#### Comparativo Técnico Pormenorizado

1. **Cytoscape.js (`cytoscape` + layout `cytoscape-fcose`):**
   - **Vantagens Determinantes:**
     - **Suporte Nativo a *Compound Nodes* (Nós Compostos):** Permite modelar cada comunidade de Leiden como um nó pai que envelopa visualmente seus nós membros em uma caixa delimitadora translúcida com rótulo temático. É a única biblioteca com suporte de primeira classe a hierarquias de grafos agrupados.
     - **Layout `fcose` (Fast Compound Spring Embedder):** Algoritmo especificamente projetado para dispor grafos com nós compostos/clusters, prevenindo sobreposição e organizando as comunidades em clusters esteticamente agradáveis.
     - **Estilização Declarativa sem Overhead:** Utiliza folhas de estilo parecidas com CSS (`selector: 'node[kind = "symptom"]', style: { 'background-color': '#f87171' }`), desacoplando a renderização da lógica de negócios.
     - **Interatividade Completa:** Zoom suave, pan, arrasto de nós com física local, box-selection e eventos de toque nativos.
   - **Desvantagens:** Bundle minificado de cerca de ~200 kB (mitigável através de carregamento sob demanda com `React.lazy`).

2. **react-force-graph (`react-force-graph-2d`):**
   - **Vantagens:** Integração muito simples com React via componentes declarativos; animação física contínua atraente baseada em D3 force.
   - **Desvantagens:** Não possui suporte nativo a nós compostos. Representar as comunidades de Leiden exigiria desenhar polígonos convexos (*convex hulls*) manualmente na camada de renderização de fundo via callbacks de canvas; a simulação física constante pode consumir CPU excessiva em dispositivos móveis.

3. **D3.js Modular (`d3-force`, `d3-zoom`, `d3-selection`):**
   - **Vantagens:** Menor impacto no bundle caso sejam importados apenas micromódulos; flexibilidade matemática total.
   - **Desvantagens:** Altíssima complexidade de desenvolvimento e manutenção; conflito clássico entre a manipulação imperativa do DOM pelo D3 e o ciclo de reconciliação declarativo do React (Virtual DOM); alto risco de memory leaks em re-renderizações.

#### Recomendação Arquitetural Inequívoca
Adotar **Cytoscape.js** (`cytoscape` v3.x e `cytoscape-fcose`) como o padrão definitivo para o AELO Vault. A capacidade nativa de tratar as **comunidades de Leiden como *compound nodes*** atende perfeitamente à visão de GraphRAG Hierárquico do projeto.

---

## 5. Lacunas Críticas na Suíte de Testes Automatizados e Integração

### 5.1 Testes de Backend Rodando 100% sobre SQLite em Memória

#### Localização no Código
- `Backend/config/settings_test.py`: linha 12

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
```

#### Diagnóstico Técnico Detalhado
Toda a suíte atual do backend (29 testes unitários aprovados) é executada exclusivamente sobre **SQLite em memória**.
Embora isso proporcione um tempo de execução rápido (6,7 segundos), cria um falso sentimento de segurança (*false confidence*) em relação aos recursos mais críticos do banco de dados de produção:
- **Extensão `pgvector` e Consultas Vetoriais:** O tipo `VectorField` e o operador de distância por cosseno (`<=>`) são específicos do PostgreSQL com pgvector (habilitados na migração `ai_analysis/0007`). Em SQLite, essas operações não existem ou operam em modo de stub. O cálculo de busca vetorial do GraphRAG nunca foi exercitado pela suíte de integração contínua.
- **Locks Pessimistas de Banco (`select_for_update`):** O bloqueio atômico de notas clínicas concorrentes em `vault.py:104` possui semântica de concorrência totalmente diferente entre SQLite (lock de arquivo inteiro) e PostgreSQL (row-level locking refinado).

#### Proposta de Refatoração
Criar um pipeline e script de teste integrado utilizando Docker:
- `docker compose -f docker-compose.test.yml run --rm backend pytest`
- O container de testes conecta-se a uma instância real de PostgreSQL 16 com extensão `vector` ativada, exercitando migrações reais e consultas vetoriais autênticas.

---

### 5.2 Monkeypatching Total no Cliente de IA (`AIClient`)

#### Localização no Código
- `Backend/tests/test_vault.py`: linhas 18-25

```python
monkeypatch.setattr(AIClient, "request_vault", lambda self, payload: {
    "nodes": [{"kind": "symptom", "label": "insonia persistente", "evidence": "insonia persistente", "embedding": [0.1, 0.2]}],
    "edges": [{"source": 0, "target": 0, "relation": "associated", "evidence": "insonia persistente", "confidence": 0.8}],
})
monkeypatch.setattr(AIClient, "request_vault_synthesis", lambda self, payload: {
    "claims": [{"kind": "local", "text": "Paciente relata insonia.", "note_id": str(note.id), "excerpt": "insonia persistente"}]
})
```

#### Diagnóstico Técnico Detalhado
Nos testes do Vault no Django (`test_vault.py`), as chamadas de rede para o microsserviço de IA são substituídas integralmente via monkeypatch por retornos estáticos em memória.
Simultaneamente, em `test_ai_service.py`, o microsserviço FastAPI é testado de forma isolada contra mocks do Ollama.

**A Lacuna:** Nunca foi executado um teste automatizado em que a classe `AIClient` real envie uma requisição HTTP codificada em JSON contra as rotas `/vault/extract` e `/vault/synthesize` do FastAPI e processe a resposta serializada pelos modelos Pydantic.
Se houver uma divergência silenciosa de contratos (por exemplo, se o Django enviar um campo com nome `note_text` em vez de `text`, ou se o FastAPI retornar floats com precisão incompatível), todos os 29 testes continuarão verdes, mas o sistema falhará imediatamente em produção.

#### Proposta de Refatoração
Criar uma suíte de **testes de contrato inter-serviços** (`Backend/tests/test_vault_contracts.py`):
- Utilizar o `TestClient` do FastAPI para receber requisições disparadas por `AIClient` apontando para o servidor de teste in-process.
- Garantir que os schemas Pydantic e serializers DRF validem mutuamente os payloads em tempo de teste.

---

### 5.3 Cobertura Zero de Testes no Frontend (0% Test Coverage)

#### Localização no Código
- `Frontend/package.json` (scripts: `"dev"`, `"build"`, `"lint"`, `"preview"` — ausência de script `"test"`)
- `Frontend/src/` (ausência total de arquivos `*.test.ts`, `*.test.tsx`, `*.spec.ts`)

#### Diagnóstico Técnico Detalhado
Não existe nenhum framework de testes unitários ou de integração instalado ou configurado no projeto frontend:
- Ausência de Vitest ou Jest.
- Ausência de React Testing Library (`@testing-library/react`).
- Ausência de testes automatizados para fluxos críticos, tais como:
  - Assinatura criptográfica com Web Crypto API no IndexedDB (`signingService.ts`).
  - Renderização segura e bloqueio de XSS no visualizador de Markdown.
  - Comportamento de fallback da interface em modo mock (`isApiMode`).

#### Proposta de Refatoração
1. Instalar dependências de teste no Frontend: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`.
2. Adicionar script `"test": "vitest run"` e `"test:watch": "vitest"` no `package.json`.
3. Escrever suíte de testes unitários para os componentes do Vault e o serviço de assinatura digital.

---

## 6. Matriz Consolidada de Priorização de Débitos Técnicos

A tabela abaixo sintetiza todos os débitos mapeados, priorizando-os por gravidade e complexidade para orientar a sequência de trabalho:

| ID | Componente | Débito Técnico | Gravidade | Complexidade | Prioridade Recomendada |
|:---:|:---:|:---|:---:|:---:|:---:|
| **D1** | Backend | Gargalo de bloqueio síncrono dos 3 workers Gunicorn por chamadas de IA | Crítica (P0) | Alta | Fase 1 |
| **D2** | Backend / FastAPI | Descompasso na cascata de timeouts (Django 30s vs Ollama 50s vs Frontend 90s) | Crítica (P0) | Baixa | Fase 1 |
| **D3** | FastAPI | Ausência de pool persistente de conexões HTTP (`httpx.AsyncClient` efêmero) | Alta (P1) | Média | Fase 1 |
| **D4** | FastAPI | Ausência de retentativas com backoff (Tenacity) para cold starts do Ollama | Alta (P1) | Baixa | Fase 1 |
| **D5** | FastAPI | Health check cego (`/health` estático sem pingar Ollama e modelos) | Alta (P1) | Baixa | Fase 1 |
| **D6** | FastAPI | Logging silencioso em blocos except transformando tudo em 503 sem traceback | Alta (P1) | Baixa | Fase 1 |
| **D7** | Backend | Ausência de serializers DRF formais para as entidades do Vault | Média (P2) | Baixa | Fase 1 |
| **D8** | Backend | Monólito procedural em `vault.py` (220 linhas misturando múltiplos domínios) | Média (P2) | Média | Fase 1 |
| **D9** | Frontend | Justificativa hardcoded na assinatura ética da análise sem modal clínico | Crítica (P0) | Baixa | Fase 2 |
| **D10**| Frontend | Bloqueio total no modo mock (`isApiMode`) e ausência de dados simulados | Alta (P1) | Baixa | Fase 2 |
| **D11**| Frontend | Monólito de 83 linhas em `PatientVault.tsx` e ausência de hook modular | Média (P2) | Média | Fase 2 |
| **D12**| Frontend | Limitações severas do SVG (truncamento 40 nós, elipse rígida, espaguete central, omissão de Leiden) | Alta (P1) | Alta | Fase 2 |
| **D13**| Testes | Ausência de testes de contrato inter-serviços Django $\leftrightarrow$ FastAPI | Alta (P1) | Média | Fase 3 |
| **D14**| Testes | Cobertura zero de testes automatizados no Frontend (0% coverage) | Alta (P1) | Média | Fase 3 |
| **D15**| Testes | Testes de backend executando 100% sobre SQLite em memória | Alta (P1) | Média | Fase 3 |
