# Evidência local medida no repositório AELO-PSI (06/11/2026)

Todos os dados abaixo são sintéticos e foram executados nesta sessão. Limitam-se a estes fixtures: não são resultados clínicos nem medem qualidade real do Ollama.

## Código antes das mudanças

- `Backend/apps/ai_analysis/services.py::build_context` entregava ao serviço de IA só as últimas `limit` notas (`order_by("-created_at")[:limit]`); o serializer limita `context_limit` a 20 e o frontend usa 10.
- Teste: com 31 notas, a sessão 1 não aparece no contexto mesmo com `limit=20`. Hoje, a IA não vê sessões antigas.
- Bug adicional: a nota analisada também podia ficar fora do contexto quando mais antiga que a janela.
- O grafo enviado era limitado às 40 arestas mais recentes.
- Peso do grafo: `0,98^dias`. Valores: 30 dias 0,5455; 60 dias 0,2976; 90 dias 0,1623; 180 dias 0,0263; 365 dias 0,0006. O checkpoint ordena conceitos por essa centralidade; a recuperação nova não usa esse decaimento.
- Nenhuma chamada a `/api/generate` definia `num_ctx`; o Compose não define `OLLAMA_CONTEXT_LENGTH`.

## Ensaio real com Ollama 0.40.15 (container descartável, modelo smollm:135m, num_ctx 512, removido ao final)

| Pedido | Resultado observado |
| --- | --- |
| prompt longo sem `shift` | HTTP 200; `prompt_eval_count` 258; log do servidor `truncating input prompt limit=258 prompt=18025 keep=4 new=258` |
| prompt longo com `format: json` | HTTP 200, truncado igualmente |
| prompt longo com `shift: false` | HTTP 400 "the prompt is longer than the context length currently available to the model" |
| `format: json` + `shift: false` | HTTP 400 |
| prompt curto com `shift: false` | HTTP 200 |

Depois da correção, `generate_json` foi exercitada no mesmo servidor: prompt curto respondeu; prompt grande foi barrado antes da chamada (`PromptTooLargeError`); com a estimativa forçada para baixo, o servidor recusou com HTTP 400. Nenhum modelo de produção (`llama3.1`) foi executado.

## Experimento de recuperação (código real, `Backend/tests/evaluate_lod_retrieval.py`)

20 pacientes sintéticos, 60 sessões semanais, semente 20261106, janela 10, até 2 notas remotas. "Extração" e "mesma palavra" são parâmetros assumidos do cenário, não medições.

| Extração | Mesma palavra | Recência | Camadas | Chars recência | Chars camadas | Chars histórico |
| --- | --- | --- | --- | --- | --- | --- |
| 90% | 100% | 0/20 | 17/20 | 670 | 808 | 4052 |
| 90% | 70% | 0/20 | 14/20 | 670 | 787 | 4056 |
| 70% | 100% | 0/20 | 12/20 | 668 | 802 | 4055 |
| 70% | 70% | 0/20 | 9/20 | 669 | 793 | 4057 |
| 50% | 70% | 0/20 | 5/20 | 672 | 743 | 4050 |
| 50% | 40% | 0/20 | 5/20 | 678 | 737 | 4053 |

Leitura: o acerto fica limitado pela extração e pelo vocabulário. As notas sintéticas são curtas; as contagens de caracteres valem só como proporção. A recuperação nova usa correspondência literal sem acentos, sem embeddings nem Ollama.

## Filtro de identificadores atual (`Backend/tests/evaluate_deidentification.py`)

28 frases sintéticas escritas para exercitar cada categoria; não é taxa de vazamento esperada em texto real.

| Categoria | Removido | Bloqueado | Vazou |
| --- | --- | --- | --- |
| Direto (CPF, e-mail, telefone, nome completo, código, endereço, RG) | 6 | 1 | 0 |
| Nome parcial do paciente | 0 | 0 | 3 |
| Terceiros | 0 | 1 | 5 |
| Trabalho | 0 | 0 | 4 |
| Local | 0 | 0 | 3 |
| Evento raro | 0 | 0 | 3 |
| Data | 1 | 0 | 1 |

Total: 19 de 28 vazaram.

## Implementado nesta rodada

- Seleção em camadas em `apps/ai_analysis/retrieval.py`, desligada por padrão (`AI_LOD_RETRIEVAL=False`): reutiliza `VaultNode`/`VaultEdge`, sem tabela nova; notas remotas entram em texto integral; idade não reduz a posição.
- Nota analisada sempre presente no contexto.
- `generate_json`: envia `num_ctx` (padrão 8192) e `shift: false`, e barra prompts acima do limite antes da chamada.

## Restrições do projeto

- `AGENTS.md`: manter Ollama até ADR aprovada; proibido alegar que RAG elimina alucinação, que NER garante anonimato ou que processamento local é conformidade automática com LGPD; falha do Ollama é falha explícita.
- Plano Mestre: restrições 1, 7, 8 e 10; sem G0 não iniciar indexação de conteúdo clínico; F2 e F3 dependem de G0/G1; RNF-03 prevê inferência local.
- G0 continua bloqueado.
