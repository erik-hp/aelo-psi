# Vault Cognitivo, GraphRAG e checkpoints Markdown

## Escopo implementado em 2026-11-02

O AELO mantém um grafo **por paciente** em `VaultNode` e `VaultEdge` no PostgreSQL. Cada relação tem nota fonte, trecho literal, confiança, peso e data observada. Cada nó registra número de menções e peso. Rótulos e trechos ficam criptografados em repouso. O vetor do nó usa `pgvector` e é gerado pelo Ollama a partir do conceito pseudonimizado. `VaultCheckpoint` guarda o Markdown criptografado e seu SHA-256. A migração `ai_analysis/0007` habilita a extensão `vector`; `0009` acrescenta pesos e menções. O Compose usa uma imagem PostgreSQL com pgvector.

O fluxo é explícito: registrar nota → enfileirar análise → acompanhar job → enfileirar checkpoint → acompanhar job → revisar as evidências → assinar a aprovação ou rejeição da análise → baixar o `.md` se aprovada. Um worker separado chama o Ollama; requisições HTTP retornam 202 sem ocupar workers Gunicorn durante a inferência. A extração pela IA aceita somente rótulos e evidências presentes literalmente na nota pseudonimizada, com categorias e relações em lista fechada. O Django repete a validação antes da transação. O hash do checkpoint integra o payload assinado da análise; qualquer alteração posterior inviabiliza a verificação da assinatura. A API aplica a autorização existente por paciente, audita leitura e escrita e impede exportação antes da aprovação.

A análise guarda a versão da nota fonte. A criação do checkpoint verifica essa versão, bloqueia a nota contra edição/exclusão e confere que seu texto não mudou durante a chamada ao Ollama. O download confere a assinatura persistida e o SHA-256 do Markdown.

O relatório tem frontmatter, a visão **Ponto** da nota atual, a visão **Todo** com observações cautelosas do Ollama, cronologia das relações, contagem de nós/arestas, centralidade ponderada e comunidades detectadas por Leiden. A segunda chamada ao serviço de IA recebe trechos literais atuais e históricos; cada observação deve citar uma dessas fontes, e o Django confere a citação antes de gravá-la. A citação literal não prova que a interpretação semântica esteja correta. A análise posterior recebe fatos do grafo e seleciona um subconjunto com fusão de ranking lexical e vetorial e expansão de um salto. A interface tem abas, grafo Cytoscape com comunidades, as evidências de suas relações, Markdown renderizado sem HTML bruto e aprovação assinada com justificativa digitada. A API limita a resposta visual a 200 nós/400 arestas; o checkpoint usa até 1000 nós/2000 arestas. Esses limites devem ser revistos antes de operar em históricos maiores.

O peso inicial de cada nó é 1; a cada nova menção ele recebe `peso_anterior × 0,98^(dias desde a última menção) + 1`. O peso de cada ocorrência de aresta é sua confiança declarada pelo extrator. A centralidade exibida no checkpoint soma os pesos de arestas incidentes, com o mesmo decaimento diário. São indicadores exploratórios, sem calibração clínica. Menções processadas fora de ordem podem produzir pesos aproximados; a data da aresta continua vinculada à nota, não a um evento interno à narrativa.

## Rotas

- `GET /api/vault/patients/{patient_id}/`: nós, relações, comunidades e checkpoints do paciente autorizado.
- `POST /api/vault/analyses/{analysis_id}/checkpoint/`: retorna 202 e `job_id`; o worker extrai a nota e cria o checkpoint.
- `GET /api/vault/jobs/{job_id}/`: status e identificador do checkpoint concluído.
- `POST /api/analysis/request/` e `GET /api/analysis/jobs/{job_id}/`: enfileiramento e acompanhamento da análise geral.
- `GET /api/vault/checkpoints/{checkpoint_id}/`: lê Markdown e SHA-256.
- `GET /api/vault/checkpoints/{checkpoint_id}/?download=1`: exporta `.md` somente após revisão assinada.
- `POST /vault/extract`: endpoint interno autenticado do microsserviço de IA.
- `POST /vault/synthesize`: endpoint interno de observações Ponto/Todo com citações verificadas.

## Segurança e limites

O mascaramento em `services/security/anonymization.py` cobre identificadores padronizados e nome/código do paciente, mas **não garante anonimização completa** de texto clínico livre. Revisão humana e política de dados são necessárias antes de copiar o `.md` para um Obsidian pessoal. Nenhuma nota clínica é gravada automaticamente no vault de pesquisa. Vetores no pgvector não usam a criptografia de campo aplicada ao texto; a proteção depende do banco, acesso e discos da infraestrutura. O grafo Cytoscape usa os rótulos e as relações devolvidos pela API; o leitor Markdown ignora HTML bruto e restringe os elementos renderizados.

O tempo da aresta é o da nota fonte; eventos internos à narrativa não são extraídos em linha do tempo própria. Leiden identifica comunidades topológicas, sem valor diagnóstico. Não há Apache AGE nem consultas Cypher. Não há escores RAGAS publicados: eles exigem conjunto de referência autorizado, anotação clínica e avaliação separada para fidelidade, recuperação e relevância. O mecanismo não diagnostica nem toma decisões autônomas.

O [plano arquitetural do Obsidian](../../1%20-%20TCC/wiki/outputs/plano_arquitetural_vault_graphrag.md) propõe um campo de estado próprio no checkpoint e gravação do relatório diretamente pelo serviço de IA. Aqui o estado/revisor são derivados da análise e sua assinatura, evitando duas fontes de verdade; o Markdown final é montado pelo Django a partir de dados validados e de observações citadas do serviço. O plano também sugere exemplos de alerta clínico. O protótipo os trata apenas como perguntas para revisão e não emite diagnóstico ou recomendação terapêutica. A Resolução CFP 09/2024 não é uma norma específica de IA, e o art. 20 da LGPD não equivale a uma garantia automática de explicabilidade deste software.

## Recuperação em camadas

`AI_LOD_RETRIEVAL` vem desligada. Quando ligada, conceitos do grafo presentes na nota analisada trazem até `AI_LOD_MAX_REMOTE_NOTES` notas antigas em texto integral, sem penalizar idade. Conceito não extraído e paráfrase não são recuperados. Ver [ADR-003](../../docs/architecture/ADR-003-recuperacao-em-camadas.md).

## Leitura automática

Com `AI_AUTO_EXTRACTION=True` e `AELO_SYNTHETIC_DATA_ONLY=True`, salvar uma nota enfileira uma leitura por versão, processada por `process_vault_jobs`. A leitura não trava a nota, e `queue_note_extractions` enfileira notas existentes. A aplicação não inicia com essa opção em modo HTTPS. Use apenas dados sintéticos.

## Implantação e verificação

Instale `Backend/requirements/base.txt`, migre o PostgreSQL com a extensão `vector` disponível e mantenha as variáveis existentes do serviço de IA/Ollama. Inicie um processo separado com `python manage.py process_vault_jobs`; o Compose inclui o serviço `vault-worker` e um serviço único `migrate`. Rode `python -m pytest`, `python -m ruff check .`, `npm.cmd test`, `npm.cmd run lint` e `npm.cmd run build`. As migrações e 37 testes, incluindo busca vetorial real, passaram no Compose PostgreSQL/pgvector; a latência e a inferência com Ollama real ainda precisam de validação integrada. A rotina de retenção remove jobs e resultados do paciente na ordem das dependências.

## Fontes técnicas verificadas

- [pgvector-python: integração Django e VectorExtension](https://github.com/pgvector/pgvector-python/blob/master/README.md)
- [python-igraph: algoritmo Leiden](https://python.igraph.org/en/develop/api/igraph.Graph.html)
- [react-markdown: renderização segura por padrão](https://github.com/remarkjs/react-markdown/blob/main/readme.md)
- [ANPD: direitos dos titulares e decisões automatizadas](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [CFP: posicionamento sobre IA na prática psicológica](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/)
