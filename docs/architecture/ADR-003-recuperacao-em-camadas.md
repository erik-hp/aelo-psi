# ADR-003 — Recuperação em camadas (Level of Detail na busca)

**Status:** proposta, aguardando decisão do autor e do orientador.
**Data:** 06/11/2026.
**Relaciona-se a:** ADR-001, F2-03/F2-04, RF-05/RF-06, RNF-07. **G0 continua BLOQUEADO.**
**Evidências:** [relatório de pesquisa](../research/recuperacao-lod-e-ia-em-nuvem.md), `Backend/tests/evaluate_lod_retrieval.py`.

## Contexto

O autor propôs aplicar à memória do paciente a ideia de *Level of Detail* de jogos: quanto mais antiga a nota, menos detalhe. A proposta inicial reduziria notas antigas a frases, palavras e tags. A discussão evoluiu para reduzir detalhe só na busca, preservando o texto integral.

A inspeção do código mostrou um problema anterior: `build_context` entregava apenas as últimas `context_limit` notas, com máximo de 20. Em teste sintético com 31 notas, a sessão 1 ficava fora do contexto mesmo no limite máximo. Hoje a IA não vê a sessão antiga em nível nenhum de detalhe.

## Decisão proposta

1. **Nada é degradado no registro.** Nota clínica permanece íntegra, e índice, grafo e resumo são derivados e reconstruíveis, como exige o `AGENTS.md`.
2. **O grafo do Vault é a visão distante.** Conceitos de `VaultNode` presentes na nota analisada levam, por `VaultEdge`, às notas de origem.
3. **O modelo recebe texto integral**, nunca a versão resumida da nota remota. O limite é o número de notas (`AI_LOD_MAX_REMOTE_NOTES`).
4. **Idade não reduz a posição.** A ordem usa conceitos compartilhados e confiança da evidência. O decaimento `0,98^dias` do grafo não participa da recuperação: seu peso é 0,0263 em 180 dias e 0,0006 em 365 dias, o que reproduziria na busca a degradação rejeitada acima.
5. **Escopo por paciente no banco**, com notas excluídas fora da seleção.

## Estado da implementação

Implementado em `Backend/apps/ai_analysis/retrieval.py`, **desligado por padrão** (`AI_LOD_RETRIEVAL=False`). Sem tabela nova, migração ou indexação adicional: usa apenas dados derivados já existentes. Enquanto a flag estiver desligada, muda só uma correção: a nota analisada sempre entra no contexto.

## Evidência e limites

Experimento sintético com 20 pacientes e 60 sessões:

| Extração assumida | Mesma palavra | Janela atual | Camadas |
| --- | --- | --- | --- |
| 90% | 100% | 0/20 | 17/20 |
| 70% | 70% | 0/20 | 9/20 |
| 50% | 40% | 0/20 | 5/20 |

**Este experimento comprova o mecanismo, não uma taxa de acerto.** O 0/20 da janela é garantido por construção, pois o evento foi plantado fora dela. O acerto em camadas apenas acompanha `extração × mesma palavra`, parâmetros assumidos, e não medições do Ollama ou de pacientes. O uso de cerca de 20% do histórico é a aritmética de 12 notas em 60.

O que ele demonstra é o ponto fraco: **conceito não extraído continua invisível**, e paráfrase não é reconhecida. A seleção busca só em rótulos do grafo, justamente a variante que a literatura mostra perder recall. Como `VaultNode.label` é cifrado, a seleção decifra até 1.000 rótulos na aplicação, e esse tempo não foi medido.

A literatura aponta na mesma direção. No LongMemEvalM, buscar por palavras-chave ou resumos recuperou menos que buscar pelo texto, mesmo devolvendo o texto integral ao final. Valores e ressalvas estão no relatório. Não foi encontrado teste direto em psicoterapia.

## Alternativas

| Alternativa | Avaliação |
| --- | --- |
| Degradar notas antigas por idade | Rejeitada: perde evidência e contraria a regra de fonte da verdade. |
| Ler todo o histórico a cada análise | Rejeitada: excede o contexto local e piora com histórico longo. |
| Manter a janela de recência | Rejeitada como solução final: a sessão antiga fica invisível. |
| Só grafo | Adotada apenas como primeiro passo, pelo limite descrito acima. |
| Grafo + busca lexical e vetorial sobre o texto | **Direção recomendada** para F2. |

## Próximos passos, depois de G0/G1

1. Busca lexical em memória sobre texto decifrado, somente após autorização. O texto é cifrado na aplicação, então PostgreSQL FTS não alcança o conteúdo, e um `tsvector` em claro desfaria a proteção. Exige decisão própria.
2. Vetores por trecho com busca exata filtrada por clínica e paciente. Índice HNSW global não é indicado: o filtro ocorre após a varredura e pode devolver poucos resultados sem aviso.
3. Medir com conjunto de referência estratificado por idade da evidência, usando Recall@k, MRR e precisão de citação. Metas só depois da linha de base.
4. Revisar o decaimento do checkpoint, que hoje ordena conceitos por centralidade.

## Critérios para ligar a flag

- Decisão registrada do autor e do orientador.
- G0 e G1 atingidos.
- Extração medida com modelo real em conjunto sintético de referência.
- Contexto real dentro de `OLLAMA_NUM_CTX`.

## Consequências

**Positivas:** a sessão antiga passa a poder chegar ao modelo, sem custo de LLM na seleção e com rastreabilidade por nota. **Negativas:** depende de checkpoints já gerados e herda as falhas da extração. Um identificador em nota antiga bloqueia a análise, comportamento intencional de falha fechada.
