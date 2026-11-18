# F6-01 / F6-02 / F6-03 — Protocolo de Entrevistas Semiestruturadas, Avaliação DSR e Ética (CEP/TCLE)

**Versão:** 1.0 — 17/11/2026  
**Estado:** Protocolo e instrumentos prontos para alinhamento com o orientador e submissão ética; **nenhuma coleta com seres humanos foi executada até esta data**.  
**Relaciona-se a:** `OE1`, `OE5`, `H1`, `H2`, `H3`, `F6-01`, `F6-02`, `F6-03`, `F6-04`, `VAL-01`, `VAL-02`, `VAL-03`.

> **Regra ética inviolável (Resoluções CNS nº 466/2012 e nº 510/2016; Manual UniCatólica 2026, p. 14):** nenhuma entrevista, gravação, tarefa cronometrada ou aplicação de questionário (SUS / UMUX-Lite) com psicólogos ou estudantes deve ser iniciada antes do alinhamento formal com o orientador (Prof. Me. Ronildo Oliveira da Silva) e da situação ética aplicável no Comitê de Ética em Pesquisa (CEP / Plataforma Brasil), mediante assinatura de TCLE. Mesmo utilizando prontuários 100% fictícios na tela, **as respostas, opiniões, tempos e dados demográficos dos entrevistados são dados de participantes humanos**.

---

## 1. Pauta Imediata para Reunião com o Orientador

Antes de ir a campo para as entrevistas, validar e registrar por escrito com o orientador estes 4 pontos:

1. **Cronograma do CEP x Data da Banca (`D2`):** confirmar se há janela hábil no calendário da UniCatólica para submeter e aprovar o protocolo na Plataforma Brasil antes da defesa da monografia, ou se a coleta com psicólogos exige ajuste de escopo/cronograma.
2. **Arquitetura de Modelos de Fronteira (`Gemini` / `Claude` — `SC-IA-01` / `ADR-004`):** validar no texto da monografia a adoção de adaptadores para modelos mais capazes (`Gemini 2.5 Pro` / `Claude Sonnet`) sob **trava estrita de dados sintéticos (`AELO_SYNTHETIC_DATA_ONLY=True`)** para demonstração e benchmark de memória longitudinal, discutindo os requisitos jurídicos/CFP (consentimento específico, transferência internacional ANPD Res. 19/2024, anonimização/ZDR) que seriam necessários para eventual operação clínica real, em contraste com o gargalo empírico medido no modelo local em CPU (`llama3.1`).
3. **Recorte da Monografia (40 a 80 laudas — `D1`):** confirmar a estrutura de capítulos da monografia em Word (`.docx`) e a seção da **Declaração de Uso de Inteligência Artificial** exigida pela norma institucional da UniCatólica.
4. **Amostra-alvo:** psicólogos clínicos com CRP ativo (e/ou estagiários supervisionados de Psicologia, conforme recorte definido), `N` previsto entre 5 e 15 participantes por amostragem intencional/bola de neve, sem coleta de dados de pacientes reais.

---

## 2. Roteiro de Entrevista Semiestruturada (`OE1` — 20 a 30 minutos)

**Objetivo:** levantar gargalos reais de organização documental, consulta longitudinal entre sessões e critérios de confiança/aceitação diante de recursos assistivos de IA (locais e em nuvem).

### Bloco A — Perfil Profissional (sem identificar pacientes)
1. Tempo de atuação clínica e abordagem teórica predominante.
2. Volume médio aproximado de atendimentos semanais e meio atual de registro (papel, editor de texto comum, sistema de prontuário eletrônico).

### Bloco B — Gargalos Operacionais e Recuperação Longitudinal (`H1` / `H3`)
3. Como você organiza hoje o registro de uma sessão e quanto tempo, em média, dedica à documentação após os atendimentos?
4. Quando precisa retomar um tema, evento familiar ou mudança de rotina relatada pelo paciente há vários meses (ex.: 15 ou 30 sessões atrás), como você localiza essa informação hoje? Quais dificuldades ocorrem?
5. Em que momentos faz falta distinguir rapidamente o que foi relato literal do paciente em uma sessão antiga daquilo que foi síntese posterior?

### Bloco C — Percepção sobre IA Assistiva, Fontes Literais e Modelos (`H2`)
6. Caso uma plataforma apresentasse um mapa de temas recorrentes em que cada conexão exigisse exibir o trecho exato da nota original e dependesse da sua aprovação ou rejeição explícita, como você avaliaria a utilidade e os riscos desse recurso na preparação pré-sessão?
7. Na prática clínica, qual é o impacto percebido entre processar textos em servidor interno da clínica (com maior custo de equipamento/tempo) versus utilizar modelos em nuvem mais rápidos e precisos (como Gemini ou Claude), considerando sigilo profissional, LGPD e orientações do CFP?
8. Que garantias mínimas (ex.: bloqueio de edição após assinatura, trilha de retificação com motivo, ausência de classificação automática de risco/diagnóstico) seriam indispensáveis para você confiar no sistema?

---

## 3. Roteiro Replicável de Demonstração e Tarefas (`F6-01` / `OE5` — 15 a 20 minutos)

**Ambiente obrigatório:** instância local do AELO-PSI populada **exclusivamente** com o caso sintético padronizado ("Helena Martins — Caso Sintético 01", com histórico longitudinal sobre sono, rotina de trabalho e apoio familiar), identificada na tela como fictícia.

| Tarefa | Instrução ao Participante | Critério Objetivo de Sucesso | Métricas Observadas |
| :--- | :--- | :--- | :--- |
| **T1 — Agendamento e conflito** | Agendar uma nova sessão para a paciente sintética e observar a prevenção de horário sobreposto. | Sessão criada com status agendado sem sobrescrever outro horário ativo. | Conclusão (S/N), tempo (s), erros/dúvidas. |
| **T2 — Redação, assinatura e retificação (`F1-03`)** | Registrar uma nota sintética curta na sessão, assiná-la digitalmente e realizar uma retificação formal informando o motivo. | Nota transita `Rascunho → Assinada → Retificada`, preservando versão 1 no histórico. | Conclusão (S/N), tempo (s), compreensão do bloqueio. |
| **T3 — Recuperação de tema remoto (`H1`/`H3`)** | Localizar em quais sessões anteriores o tema "sono" / "mudança de turno" apareceu e abrir a nota original correspondente pelo Vault. | Participante identifica a nota de origem e confere o trecho literal. | Conclusão (S/N), tempo (s), conferência da fonte. |
| **T4 — Supervisão humana da IA (`OE4`)** | Inspecionar uma síntese assistiva pendente, conferir se os trechos citados batem com a nota e aprovar ou rejeitar com justificativa assinada. | Decisão (`VALIDATED` ou `REJECTED`) registrada após conferência explícita. | Conclusão (S/N), tempo (s), percepção de controle. |

---

## 4. Aplicação e Cálculo de SUS e UMUX-Lite (`F6-03` / `VAL-02`)

Imediatamente após as tarefas T1–T4, aplicar os dois instrumentos de forma independente (nunca misturar ou somar as escalas como equivalentes):

1. **System Usability Scale — SUS (Brooke, 1996):** 10 itens em escala Likert de `1` (*Discordo totalmente*) a `5` (*Concordo totalmente*), alternando itens positivos (ímpares: `resposta - 1`) e negativos (pares: `5 - resposta`), soma multiplicada por `2,5` (`0` a `100`).
2. **UMUX-Lite (Lewis et al., 2013):** 2 itens em escala Likert de `1` a `7`:
   - Item 1 (utilidade/capacidade): *"As funcionalidades do AELO-PSI atendem às necessidades da tarefa proposta."*
   - Item 2 (facilidade): *"O AELO-PSI é fácil de usar."*
   - Reportar separadamente o escore bruto `(item1 - 1 + item2 - 1) * (100 / 12)` e a estimativa de correspondência `(0,65 * bruto) + 22,9`.

**Processamento auditável no repositório:**
```bash
cd Backend
python services/metrics/usability_scales.py --input caminho/respostas_anonimizadas.json
```
Para dados reais coletados após aprovação ética, o JSON deve declarar `"dataset_kind": "approved_cep_collection"` e `"cep_protocol_reference": "<CAAE/Parecer>"` (sem nomes, e-mails ou CRPs dos participantes no arquivo versionado).

---

## 5. Minuta Base de TCLE (Para Revisão do Orientador e Submissão ao CEP)

- **Título do estudo:** Plataforma Web Inteligente para Gestão Operacional e Auxílio ao Monitoramento Terapêutico em Clínicas de Psicologia.
- **Pesquisador responsável / Orientador:** Prof. Me. Ronildo Oliveira da Silva; **Pesquisador executante:** Erik Holanda Pires (Sistemas de Informação — UniCatólica).
- **Objetivo e procedimentos:** entrevista semiestruturada (20–30 min) e teste guiado de usabilidade (15–20 min) utilizando exclusivamente registros clínicos fictícios, seguido dos questionários SUS e UMUX-Lite. Nenhum dado de paciente real será solicitado ou inserido.
- **Riscos mínimos e mitigação:** eventual desconforto ou cansaço ao responder perguntas ou testar a interface; liberdade plena para recusar qualquer questão ou encerrar a participação a qualquer momento, sem prejuízo. Dados identificados apenas por código pseudônimo (`PART-01`, `PART-02`...).
- **Benefícios:** contribuição científica para o desenho de sistemas de apoio documental éticos, seguros e sob supervisão profissional na Psicologia.
- **Guarda e confidencialidade:** registros mantidos sob guarda restrita dos pesquisadores pelo prazo normativo das Resoluções CNS 466/2012 e 510/2016, sem divulgação nominal.
