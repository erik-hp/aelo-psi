# Matriz de rastreabilidade de requisitos — AELO-PSI (TCC2)

**Versão:** 1.0 — 17/10/2026. **Estado:** baseline proposta, não evidencia implementação ou conformidade.  
Ver [Plano Mestre](PLANO_MESTRE_IMPLEMENTACAO.md) e [registro](REGISTRO_EXECUCAO.md). As hipóteses H1–H3 e objetivos abaixo derivam do projeto de TCC fornecido pelo autor. O desenho MTLI deriva da ADR-001.

## Hipóteses e objetivos de pesquisa

- **H1:** redução potencial do esforço administrativo, com documentação profissional rigorosa e revisão humana.
- **H2:** aceitabilidade associada a tratamento cuidadoso, privacidade e execução local.
- **H3:** exploração de padrões textuais longitudinais como apoio interpretativo, **sem** equivalência automática com estado emocional ou diagnóstico.
- **OE1:** levantar gargalos com psicólogos/estagiários.
- **OE2:** projetar arquitetura do prontuário, RAG, memória temporal e indicadores.
- **OE3:** implementar ciclos DSR e infraestrutura local.
- **OE4:** verificar mecanismos técnicos e lacunas de proteção de dados/ética.
- **OE5:** avaliar usabilidade/aceitação e esforço com SUS, UMUX-Lite e tarefas.

## Requisitos rastreáveis

| Req. | Requisito verificável | Fase/item | Hipótese/objetivo | Evidência mínima | Estado |
| --- | --- | --- | --- | --- | --- |
| RF-01 | Usuários autenticados acessam só clínica/pacientes/ações autorizados | F0-02, F1-01 | OE3/OE4, H2 | Testes de negação BOLA/IDOR em CRUD/listas | NÃO INICIADO |
| RF-02 | Cadastro e controle de acesso paciente/profissional/estágio | F1-01 | OE2/OE3 | API + testes de duas clínicas | NÃO INICIADO |
| RF-03 | Agendamento, remarcação, cancelamento e estados de sessão | F1-02 | H1, OE3 | Teste e tarefa de usabilidade | NÃO INICIADO |
| RF-04 | Nota clínica rascunho/revisão/assinatura/retificação imutável | F1-03 | H1, OE4 | API, teste de bloqueio e histórico | NÃO INICIADO |
| RF-05 | Busca semântica/textual sobre todo histórico autorizado | F2-03/F2-04 | H1/H3, OE2/OE3 | Dataset sintético antigo + recall@k | NÃO INICIADO |
| RF-06 | Síntese RAG com citações nota/versão/trecho e abstenção | F2-05/F2-06 | H1/H2, OE3/OE4 | Precision de citações, erros e links | NÃO INICIADO |
| RF-07 | Extração de temas/eventos/relações temporais derivadas | F3-01 a F3-03 | H3, OE2/OE3 | Teste de casos contraditórios | NÃO INICIADO |
| RF-08 | Revisão humana para aceitar, rejeitar e corrigir memória derivada | F3-04 | H2/H3, OE4 | Auditoria + estado e reindexação | NÃO INICIADO |
| RF-09 | Linha do tempo e grafo restrito ao paciente | F3-05/F3-06 | H3, OE3/OE5 | E2E, acessibilidade, fonte | NÃO INICIADO |
| RF-10 | Indicadores exploratórios temporais com incerteza e origem | F4-01 a F4-04 | H3/OE3/OE4 | Protocolo anotação e erros | NÃO INICIADO |
| RF-11 | Interoperabilidade/exportação FHIR documentada e restrita | F5-01/F5-02 | OE2/OE4 | Validador FHIR + permissão | NÃO INICIADO |
| RF-12 | Painel de pesquisa e auditoria sem conteúdo clínico indevido | F1-05/F2-06 | H2/OE4 | Testes log/prompt/rastro | NÃO INICIADO |
| RNF-01 | Criptografia de campos/derivados, gestão de chaves, backup | F1-04, F5-03 | H2/OE4 | Testes criptografia/restore/rotação | NÃO INICIADO |
| RNF-02 | Segregação e negação de acesso indevido em todas as camadas | F0-02, F2-04, F3-01 | H2/OE4 | 0 vazamentos nos cenários testados | NÃO INICIADO |
| RNF-03 | Inferência local, segredo não exposto e falhas explícitas | F0-03/F0-04 | H2/OE4 | Falhas testadas + revisão rede/config | NÃO INICIADO |
| RNF-04 | Proveniência/versionamento/reprodutibilidade de IA e índice | F2-01, F3-05 | H1/H3, OE3/OE4 | IDs de modelo/prompt/chunk e rebuild | NÃO INICIADO |
| RNF-05 | Conformidade documentada por controle e evidência, sem certificação presumida | F0-06, F5-04 | OE4 | Mapa dados, RIPD, lacunas | NÃO INICIADO |
| RNF-06 | Usabilidade/acessibilidade: WCAG 2.2 AA como alvo | F1-06, F6-05 | OE5 | Avaliação manual e automatizada | NÃO INICIADO |
| RNF-07 | Qualidade do RAG, citações e benchmark de memória | F2-04/F2-05, F6-04 | H1/H3/OE5 | Recall@k, evidência, p95 | NÃO INICIADO |
| RNF-08 | Processo auditável (CI, testes, documentação por alteração) | F0-01/F0-05, F7-03 | OE3/OE4 | Checks e registro de PR | NÃO INICIADO |
| VAL-01 | Avaliação DSR com participantes e ética aplicável | F6-01/F6-02 | OE1/OE5 | Protocolo + comprovação ética | NÃO INICIADO |
| VAL-02 | SUS e UMUX-Lite aplicados e analisados adequadamente | F6-03 | OE5 | Questionários, planilha, cálculo | NÃO INICIADO |
| VAL-03 | Medir tempo, sucesso e confiança em tarefas comparáveis | F6-04 | H1/H2/OE5 | Dados e metodologia comparativa | NÃO INICIADO |
| VAL-04 | Conclusões científicas rastreadas a evidências, limitações | F6-06/F7-01 | OE1–OE5 | Relatório e seção TCC | NÃO INICIADO |

**Importante:** “NÃO INICIADO” significa que o novo critério de aceite *não está validado*, mesmo quando há implementação parcial no repositório.

## Regras de atualização

Adendo de estabilização (06/11/2026): RNF-06/RNF-08 recebem o [plano de investigação de UX/navegação](validation/PLANO_REVISAO_UX_NAVEGACAO.md), e RF-01/RNF-02/RNF-03/RNF-08 o [plano de avaliação do Strix](security/PLANO_AVALIACAO_STRIX.md). Somente pesquisa inicial e planejamento; testes ativos, benchmark prático e redesign pendentes. O marco funcional de 80% não indica cobertura de segurança nem muda o estado de nenhum requisito/gate.

Proposta operacional SC-OP-01 (06/11/2026): [PLANO_OPERACIONAL_CLINICA.md](PLANO_OPERACIONAL_CLINICA.md) relaciona OP-00–OP-11 aos requisitos existentes e distingue refinamentos F0/F1 de ampliações ainda não aprovadas. Pesquisa documental, sem nova implementação, resultado quantitativo ou mudança dos estados de aceite. Requisitos de financeiro/comunicação/portal não foram adicionados como aprovados.

Evidência incremental da auditoria funcional (06/11/2026): RF-01–RF-04 e RNF-02/RNF-03/RNF-06/RNF-08 recebem correções e testes parciais em [AUDITORIA_FUNCIONAL_2026-11-06.md](validation/AUDITORIA_FUNCIONAL_2026-11-06.md). **EM REVISÃO**: cadastro/agendamento/nota persistidos e negações verificadas nos cenários descritos; assinatura/retificação completas, acessibilidade manual, concorrência e IA integral continuam pendentes. Não altera os estados completos dos requisitos ou os gates.

Evidência incremental UI-01 (06/11/2026): RNF-06/RNF-08 recebem a integração visual BoardUI e testes de regressão em [UI_BOARDUI.md](validation/UI_BOARDUI.md). **EM REVISÃO**; os critérios completos desses requisitos continuam não validados e os gates não são alterados.

Evidência incremental da revisão transversal F0 (06/11/2026): RF-01/RNF-02/RNF-03/RNF-08 recebem correções e testes em `Backend/tests/test_api_robustness.py` e `Backend/tests/test_runtime_settings.py`, detalhados no [registro](REGISTRO_EXECUCAO.md). **EM REVISÃO**; estados dos requisitos e gates não mudam.

1. Cada PR cita ID(s) F0–F7 + requisito(s) RF/RNF/VAL.
2. Mudar estado somente com commit/PR e teste/evidência no `REGISTRO_EXECUCAO.md`.
3. Não usar “compliant LGPD”/“FHIR-certified” como estado; registrar controles e riscos residuais.
4. Quando um requisito mudar, avaliar hipóteses, arquitetura, plano, testes e TCC antes do merge.
