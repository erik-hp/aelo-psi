# ADR-003 — Recuperação em camadas (Level of Detail na busca)

**Status:** desenho escolhido pelo autor em 06/11/2026. Leitura automática autorizada pelo autor somente em ambiente sintético; dados reais seguem bloqueados.
**Data:** 06/11/2026.
**Relaciona-se a:** ADR-001, F2-03/F2-04, RF-05/RF-06, RNF-07. **G0 continua BLOQUEADO.**
**Evidências:** [relatório de pesquisa](../research/recuperacao-lod-e-ia-em-nuvem.md), `Backend/tests/evaluate_lod_retrieval.py`.

## Contexto

O autor propôs aplicar à memória do paciente a ideia de *Level of Detail* de jogos: dar a cada nota o nível de detalhe necessário, sem que a IA releia todo o histórico a cada análise. Na formulação do autor, a IA lê cada nota inteira uma vez, estrutura o conteúdo e classifica as partes mais relevantes. Depois, a busca consulta esse resultado para encontrar o que se liga à sessão atual. "Tags" significa esse resultado da leitura completa, não um resumo que substitui a leitura.

A inspeção do código mostrou um problema anterior: `build_context` entregava apenas as últimas `context_limit` notas, com máximo de 20. Em teste sintético com 31 notas, a sessão 1 ficava fora do contexto mesmo no limite máximo. A IA não via a sessão antiga em nível nenhum de detalhe.

O risco restante é decidir hoje o que será relevante no futuro: o que a estrutura não guardou não seria encontrado. A literatura indica o mesmo. No LongMemEvalM, palavras-chave extraídas do texto completo recuperaram menos que o texto original, enquanto texto original somado a fatos extraídos recuperou mais. Os valores e ressalvas estão no relatório.

## Decisão

1. **A IA lê a nota inteira uma vez**, e o resultado é estruturado com tema, evento e trecho de origem.
2. **Relevância ordena, nunca descarta.** Ela não é avaliação clínica, e a revisão humana da ADR-001 continua valendo.
3. **A busca tem duas rotas:** estrutura extraída e texto original. Cada rota tem vagas próprias, para que notas encontradas pelas duas não expulsem o que só uma encontrou.
4. **A busca cobre notas de qualquer idade.** Não há regra de "só palavras-chave depois de muito tempo", e a idade não reduz a posição. O decaimento `0,98^dias` do grafo fica fora da recuperação: vale 0,0263 em 180 dias e 0,0006 em 365 dias.
5. **O modelo recebe a nota escolhida inteira.** O limite é o número de notas (`AI_LOD_MAX_REMOTE_NOTES`), nunca o texto reduzido.
6. **Nada é degradado no registro.** Estrutura e índices são derivados e reconstruíveis.
7. **Escopo por paciente**, com notas excluídas fora da seleção.

## Estado da implementação

| Parte | Estado |
| --- | --- |
| Rota da estrutura sobre o grafo do Vault | Implementada |
| Rota do texto original, com BM25 em memória | Implementada; o texto é pontuado após autorização, sem nada persistido |
| Vagas por rota e nota analisada sempre incluída | Implementadas |
| Ligar a seleção | **Desligada por padrão** (`AI_LOD_RETRIEVAL=False`) |
| Comparar rotas | `AI_LOD_SOURCE_SEARCH=False` deixa só a estrutura |
| Extração automática de cada nota | Implementada, separada do checkpoint e sem travar a nota. Exige `AI_AUTO_EXTRACTION=True` e `AELO_SYNTHETIC_DATA_ONLY=True`; a aplicação não inicia sem o segundo nem em modo HTTPS |
| Classificação de relevância | **Pendente:** hoje existem só `confidence` e contagem de menções |
| Busca vetorial sobre o texto | Pendente |

A fila `NoteExtractionJob` (migração `0013`) registra uma leitura por versão da nota, e o worker a processa fora da requisição. Reprocessar não duplica o grafo, editar substitui o que veio do texto antigo, e o estado aparece em `extraction` na rota do Vault. Peso e menções são aproximações exploratórias: uma edição não recalcula o peso já acumulado.

## Evidência e limites

Experimento sintético com 20 pacientes e 60 sessões, usando o código real de seleção:

| Extração assumida | Mesma palavra | Janela atual | Só estrutura | Estrutura + texto |
| --- | --- | --- | --- | --- |
| 90% | 100% | 0/20 | 17/20 | 20/20 |
| 90% | 70% | 0/20 | 14/20 | 17/20 |
| 70% | 100% | 0/20 | 12/20 | 20/20 |
| 70% | 70% | 0/20 | 9/20 | 19/20 |
| 50% | 70% | 0/20 | 5/20 | 11/20 |
| 50% | 40% | 0/20 | 5/20 | 9/20 |

**O experimento compara rotas no simulador, não mede uma taxa real.** O 0/20 da janela é garantido por construção, a extração e o vocabulário são parâmetros assumidos, e o desenho das vagas foi ajustado depois que uma primeira versão mostrou resultado idêntico entre as rotas. O uso de texto ficou próximo nas duas rotas e em cerca de 20% do histórico, o que é a aritmética de 12 notas em 60.

Limites conhecidos: paráfrase não é reconhecida pela busca lexical, não há redução de palavras à raiz, e a seleção decifra notas e rótulos na aplicação, com tempo ainda não medido em histórico longo.

### Medição com modelo real

Em 20 notas sintéticas com Claude (`sonnet`), a primeira rodada achou 43 de 44 conceitos, mas a validação manteve só 15: o prompt pedia conceito resumido e a regra exigia cópia literal. Depois de pedir cópia exata e descartar só o item inválido, foram 44 de 44, com 59 de 59 conceitos aceitos. As notas são curtas e explícitas, o gabarito é do mesmo autor e o prompt foi ajustado após a primeira rodada. Isso valida o caminho técnico, não a qualidade clínica, e não vale para o modelo local.

Rótulos são cópias literais. Paráfrases como "evitação da casa antiga" são recusadas de propósito, pois seriam interpretação gravada como conceito.

## Alternativas

| Alternativa | Avaliação |
| --- | --- |
| Degradar notas antigas por idade | Rejeitada: perde evidência e contraria a regra de fonte da verdade. |
| Ler todo o histórico a cada análise | Rejeitada: excede o contexto local e piora com histórico longo. |
| Manter a janela de recência | Rejeitada: a sessão antiga fica invisível. |
| Buscar só na estrutura | Rejeitada como rota única: o que a extração perdeu fica invisível. |
| Somar pontos das rotas (RRF) | Rejeitada nesta etapa: notas nas duas listas tomaram as vagas no ensaio. Reavaliar com dados melhores. |
| Estrutura + texto original com vagas por rota | **Escolhida.** |

## Próximos passos

1. Ampliar o conjunto sintético, com notas longas e implícitas, e medir o modelo local escolhido.
2. Classificar relevância para ordenar, com revisão humana.
3. Adicionar vetores por trecho, com busca exata filtrada por clínica e paciente. Índice HNSW global não é indicado, e `tsvector` em claro desfaria a criptografia.
4. Para o TCC2, comparar só estrutura com estrutura + texto, estratificando pela idade da evidência, com Recall@k, MRR e precisão de citação. Não foi encontrado teste equivalente em psicoterapia.

## Critérios para usar fora de dados sintéticos

- G0 e G1 atingidos.
- Extração medida com modelo real.
- Contexto real dentro de `OLLAMA_NUM_CTX`.

## Consequências

**Positivas:** a sessão antiga pode chegar ao modelo sem custo de LLM na seleção e com rastreabilidade por nota. Falha de extração deixa de esconder a nota. **Negativas:** cada análise passa a ler o histórico do paciente em memória. Um identificador em nota antiga selecionada bloqueia a análise, comportamento intencional de falha fechada.
