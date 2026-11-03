# TCC II — transição rastreável a partir do projeto de TCC I

**Data de revisão:** 03/11/2026  
**Repositório-base:** `erik-hp/aelo-psi`, `main` em `cf8fb9a752d6a77bd404819c4134890a83678cf7`  
**Natureza:** planejamento acadêmico e preparação de evidências; não é aprovação de G0, de CEP ou de uso clínico.

## 1. Fontes acadêmicas recebidas

Os arquivos `1-introducao.md`, `2-objetivos.md`, `3-referencial.md`, `4-metodologia.md`, `5-cronograma.md`, `6-orcamento.md`, `7-referencias.md` e `projeto-completo.md` foram fornecidos pelo autor como base do TCC I. O ZIP LaTeX separado é um template (`documento.tex`, `abntex2` e seções `.tex`) e **não contém automaticamente as revisões dos arquivos Markdown**. Esta revisão não presume que o orientador tenha validado a versão mais recente.

Há divergências materiais entre os capítulos separados e `projeto-completo.md`:

- `2-objetivos.md`/`3-referencial.md`/`4-metodologia.md` descrevem GraphRAG em PostgreSQL, nós/arestas temporais, checkpoints e revisão profissional; a consolidação ainda descreve predominantemente RAG vetorial genérico.
- A versão separada corrige a descrição da Resolução CFP 09/2024 e reconhece limites de pseudonimização e explicabilidade, em contraste com afirmações categóricas do texto consolidado.
- `7-referencias.md` ainda descreve a Resolução CFP 009/2024 como norma específica de IA; corrigir referência e citações após conferir a fonte primária.
- `5-cronograma.md` se refere a atividades programadas em 2026, não a etapas realizadas. O quadro omite julho e chama o período de onze meses apesar de conter dez colunas; conferir calendário institucional e datas efetivas.

**Diretriz editorial:** preservar os textos do TCC I como fontes históricas, registrar versões e produzir o TCC II como documento de resultados; não sobrescrever silenciosamente o projeto aprovado nem inventar coleta, aprovação ética ou escores.

## 2. Correspondência entre TCC I e implementação atual

| Eixo do projeto | Evidência de implementação existente | Evidência faltante para o TCC II |
| --- | --- | --- |
| OE1 — gargalos e requisitos com profissionais | Requisitos propostos na matriz e no plano | Entrevistas efetivamente realizadas, aprovação/dispensa ética aplicável e análise de conteúdo |
| OE2 — arquitetura de prontuário e IA | Django/DRF, React, FastAPI, PostgreSQL/pgvector, Vault GraphRAG | Diagramas finais, critérios arquiteturais, testes de interoperabilidade e limites documentados |
| OE3 — desenvolvimento DSR iterativo | Vault com worker, proveniência literal, revisão assinada e UI | Histórico de ciclos, Ollama real, rastreamento de decisões e medições reproduzíveis |
| OE4 — proteção e supervisão humana | Grants, criptografia, auditoria, validação de fontes e revisão assinada em código | Revisão independente, implantação, RIPD, risco residual e gates G0/G1 efetivamente aprovados |
| OE5 — usabilidade/utilidade | Páginas e testes automatizados de UI; proposta de SUS/UMUX-Lite | Protocolo de tarefas, aplicação autorizada, coleta e análise real de SUS/UMUX-Lite, tempo e erros |

**Situação da integração:** PR #11 e PR #12 foram mescladas em `main` em 03/11/2026. Entretanto, `docs/REGISTRO_EXECUCAO.md` mantém **G0 bloqueado**; commits e testes locais citados nele não equivalem a homologação de uso real. A etapa é **verificação e validação dos gates**, não migração de arquitetura ou antecipação do uso com pacientes.

## 3. Hipóteses, variáveis e cautelas

- **H1 (eficiência):** medir tempo de tarefa, acerto e retrabalho em tarefas comparáveis. Sem grupo/comparação consistente não afirmar redução comprovada de esforço.
- **H2 (soberania/aceitabilidade):** distinguir execução local, autorização/criptografia, percepção de confiança e atendimento legal. O primeiro não comprova os demais.
- **H3 (padrões longitudinais):** medir recuperação de notas históricas e proveniência; indicador textual é **exploratório** e não equivale a estado emocional, diagnóstico, risco ou prognóstico.

Ferramentas RAG/GraphRAG **não garantem fidelidade semântica** a partir da mera presença de trechos citados. Registrar anotação independente, erros, abstenções e limites do modelo. Nenhuma pontuação RAGAS, SUS ou UMUX-Lite pode ser publicada sem dataset e procedimento efetivamente executados.

## 4. Ordem de trabalho e escopo autorizado

1. **F0/G0:** repetir verificações sintéticas de autorização interclínica, processamento local/segredos, falhas explícitas, implantação e governança de riscos. Registrar evidência por SHA e comando. Não liberar dados reais.
2. **F1/G1:** rever assinatura/retificação do prontuário, chaves, backup e trilhas de auditoria com revisão competente.
3. **F2/F3:** avaliar extração e recuperação longitudinal **apenas quando os gates permitirem**; o código existente não prova qualidade clínica.
4. **F6 — preparação antecipável:** criar dataset estritamente sintético, métricas reprodutíveis de fontes e recuperação, roteiro de tarefas, protocolo SUS/UMUX-Lite e planejamento ético. Coleta com participantes somente após situação CEP/TCLE definida.
5. **F7:** transformar proposta em trabalho final: arquitetura efetiva, método executado, resultados rastreáveis, discussão, limitações e conclusões sustentadas.

## 5. Primeiro artefato reprodutível de avaliação (F6-04 — preparação)

`Backend/services/metrics/evidence_benchmark.py` avalia esquema JSON sintético de notas e saídas declaradas. Calcula `retrieval_recall_at_k` e `literal_citation_validity_rate` e conta referências a outro paciente, fontes desconhecidas e versões incorretas. Não usa rede nem Ollama e não imprime textos das notas. O script **não está conectado à inferência de produção**, não avalia semântica clínica e não libera G0/G1/F6.

Execução a partir de `Backend/`:

```bash
python services/metrics/evidence_benchmark.py --input tests/fixtures/tcc2_evidence_synthetic.json --strict
python -m pytest tests/test_tcc2_evidence_benchmark.py -q
```

O JSON de exemplo é artificial e não pode ser reportado como desempenho do produto: demonstra somente que o avaliador funciona. Para experimento real, versionar referência e protocolo, separar gold de previsões, comparar abordagens sob mesma amostragem e preservar confidencialidade.

## 6. Pontos acadêmicos a corrigir antes da versão final

- Conferir fontes primárias e corrigir referência à CFP 09/2024 (exercício mediado por TDICs, não norma autônoma reguladora de IA); utilizar também posicionamento oficial do CFP sobre IA publicado em 2025 após revisão do orientador.
- Verificar situação normativa de CFP 001/2009 e normas de registro vigentes; citar art. 20 da LGPD com seu alcance específico (decisões **unicamente** automatizadas).
- Evitar afirmar que RAG elimina alucinações, que infraestrutura local garante sigilo ou que NER/pseudonimização remove todos os identificadores.
- Revisar DOI, afirmações estatísticas, precisão bibliográfica, natureza da pesquisa-ação, amostragem e cronograma com fontes e orientador.
- Não relatar aprovação CEP, entrevistas, SUS, RAGAS, auditorias ou resultados de IA real sem evidência identificável e método descrito.

**Próxima decisão acadêmica:** confirmar com orientador qual versão do TCC I é a referência oficial. Enquanto isso, os arquivos permanecem fontes separadas e não substituem um depósito aprovado.
