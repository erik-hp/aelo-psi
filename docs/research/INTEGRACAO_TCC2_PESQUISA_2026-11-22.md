# Pesquisa de 22/11/2026 e como usá-la no TCC2

Arquivo de preservação. Relaciona as medições e a pesquisa web deste dia ao rascunho `1 - TCC/raw/Erik_Holanda___TCC2_Rascunho.pdf` (31 páginas, lido até a conclusão e a primeira metade das referências). O rascunho não foi alterado. Dados 100% sintéticos. Relatório das medições: `docs/validation/AVALIACAO_NOTAS_LONGAS_2026-11-22.md`.

## 1. Medições consolidadas

Gabarito do mesmo autor das notas, em todas as linhas. Nenhuma delas é taxa de acerto.

| Motor | Teste | Resultado |
| --- | --- | --- |
| Claude (Sonnet, CLI) | 6 notas longas (média de 172 palavras), antes das correções | 53/54 conceitos; 7/12 relações |
| Claude | 1 nota de 1.033 palavras, antes | 21/51 conceitos (41%) |
| Claude | mesma nota, com leitura em trechos | 49/51 (96%); 6/12 relações; 51 s |
| Claude | achados negados ou injetados virando nó | 2 antes, 0 depois; instrução injetada não seguida |
| llama3.1 (Ollama 0.40.15, CPU) | 7 execuções, antes das correções | 0 notas com grafo útil: 5 rejeitadas pelo esquema (`kind` com mais de 32 caracteres; `confidence` ausente) e 2 vazias; 100 a 295 s |
| llama3.1 | notas 1 e 2, com JSON Schema, exemplo no prompt e trechos de 900 caracteres | 6/9 e 5/8 conceitos (11/17); 160 s e 324 s por nota |
| llama3.1 | mesmas notas, trechos de 450 caracteres | 4/9 e 6/8 (10/17); 384 s e 383 s. Não melhorou, padrão mantido em 900 |
| Suítes antigas | desidentificação; recuperação em camadas | iguais ao registro de 06/11: 19/28 vazaram; 17/20 só pelo grafo e 20/20 com grafo e texto, contra 0/20 da recência |

Limites: o `llama3.1` só foi medido em 2 das 6 notas, com saída não determinística, então a diferença entre 11/17 e 10/17 não é conclusiva. Relações em nota longa só contam dentro do mesmo trecho. As 6 notas longas e a nota de estresse não foram rodadas completas no `llama3.1` depois das correções. Equipamento: 16 GB de RAM, sem GPU, Ollama em Docker com 7,7 GB.

## 2. O que muda em cada seção do rascunho

| Seção | Texto atual | O que acrescentar ou corrigir | Fonte interna |
| --- | --- | --- | --- |
| Resumo e 7 (conclusão) | "o modelo local não atingiu o desempenho exigido" | Continua válido para o equipamento testado. A falha de 06/11 tinha causa parcial no projeto (esquema e prompt), corrigida em 22/11; o modelo ainda é lento (160 a 320 s por nota de ~175 palavras) | tabela 1 |
| 4.1 (ciclos de DSR) | 4 ciclos | Dois ciclos novos: nota longa perde conceitos (leitura em trechos) e achados negados viravam nós (filtro de negação). Mais um: esquema e prompt do motor local | `ai_service/main.py` |
| 4.3 (extração) | 20 notas curtas, 44 conceitos | Acrescentar 6 notas longas e 1 de estresse como segunda bateria, declarada circular | `tests/evaluate_extraction_long.py` |
| 4.3 e 6.3 (limite de 45 s) | 45 s por nota | A leitura em trechos faz várias chamadas por nota. Conferir se o limite é por chamada ou por nota antes de comparar | a verificar no código |
| 5.3 (grafo literal) | rótulos interpretativos recusados | Acrescentar: nós negados descartados; chunking com união sem duplicata; limite por nota de 400 nós e 600 arestas; `confidence` ausente vale 0 | `ai_service/` |
| 6.1 e Quadro 1 | 513 testes, versão de 17/11 | Defasado: mudanças de 22/11 são posteriores. Remedir ou datar explicitamente | suíte local: 512 aprovados, 4 ignorados (SQLite) |
| 6.3 e Quadro 2 | llama3.1: 11 de 20 notas, 19 de 44 conceitos, 43 s | Manter como medição de 06/11 e acrescentar a de 22/11 em quadro separado, com notas diferentes | tabela 1 |
| 6.5 e Quadro 3 | "IA local: não demonstrada" | Não mudar ainda. 11/17 em 2 notas não demonstra; falta rodar o conjunto completo | tabela 1 |
| 6.6 (limitações) | gabarito do mesmo autor | Acrescentar que o 98% com o Claude é circular e que a regra de negação é lexical | seção 1 |
| 3.5 (relacionados) | só literatura científica | Parágrafo curto com produtos comerciais, marcado como "segundo o fornecedor" | seção 3 |
| 7 (continuidade) | avaliador diferente do autor | Reforçar com o teto de F1 0,80 a 0,93 entre anotadores humanos | seção 3 |
| 4.2 e 6ª frente (questionário) | "[A PREENCHER: número de casos]" | As 6 notas longas podem ser os casos, mas faltam as saídas do protótipo para exibir | seção 4 |

## 3. Pesquisa externa utilizável

Produtos (alegações do fornecedor, sem estudo independente de acurácia): Upheal, Mentalyc, Blueprint, Eleos (EUA); PsiNota AI, PsiRecord, Psidigital, Amplimed (Brasil). Diferença de abordagem: geram nota a partir da sessão; o Aelo lê a nota já escrita e exige citação literal. O ensaio do Eleos mediu resultado clínico, não precisão de nota. Um teste prático achou o Upheal inventando detalhes em painéis auxiliares.

Literatura de extração clínica, para citar como teto realista (nenhum é psicoterapia nem português): CLINES, F1 entre anotadores 0,82; notas de exame (JMIR), 0,84; determinantes sociais pediátricos, 0,80 a 0,85; outro estudo, 0,86 a 0,93.

Tempo: escribas por IA com economia modesta (menos de 1 a 5 minutos por nota; 16 minutos por 8 horas em estudo multicêntrico com médicos). Não há número para psicólogos. Serve de contexto para P1, não de evidência.

Para monografia: preferir os estudos com DOI ou PubMed; usar blogs de fornecedor só como existência do produto. Um estudo de 2026 (VHA e Univ. de Washington) foi citado por blog de fornecedor e não foi lido na fonte.

## 4. Decisões abertas

1. **Negação.** Descartar "nega ideação suicida" evita falso sintoma, mas apaga a negação, que é informação clínica. Alternativa: guardar a polaridade no nó. Conversa com orientador e, idealmente, com um psicólogo.
2. **Questionário e CEP.** O rascunho prevê questionário anônimo; `docs/validation/F6_PROTOCOLO_ENTREVISTAS_E_AVALIACAO_DSR.md` diz que nada começa antes do CEP. Alinhar com o orientador.
3. **Versão de referência.** Escolher entre manter a de 17/11 e declarar as mudanças como ciclo posterior, ou fixar nova versão e remedir os Quadros 1 e 2.
4. **Modelo local.** Rodar o conjunto completo no `llama3.1` e, se possível, em máquina com GPU ou modelo menor; só então revisar o Quadro 3.
5. **Segunda anotação.** Gabarito independente (orientador ou colega) para calcular concordância real.

## 5. Regras do TCC2 a respeitar

Uso de IA só como apoio à redação e sempre declarado; entrega final em Word. Este arquivo é material de pesquisa, não texto para a monografia.

## Fontes

- https://www.mentalyc.com/blog/ai-clinical-notes-vs-human-notes (fornecedor)
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10366966/
- https://pubmed.ncbi.nlm.nih.gov/42948623
- https://medinform.jmir.org/2025/1/e78432/
- https://arxiv.org/pdf/2404.00826
- https://www.techtarget.com/healthtechanalytics/feature/AI-scribes-deliver-modest-time-savings-but-still-boost-clinician-experience
- https://www.statnews.com/2026/04/01/ai-ambient-scribes-modest-time-savings-clinical-documentation/
- https://psinotaai.com/o-que-e-psinota-ai (fornecedor)
- https://www.amplimed.com.br/blog/prontuario-com-ia/ (fornecedor)
- https://psirecord.com.br/ (fornecedor)
