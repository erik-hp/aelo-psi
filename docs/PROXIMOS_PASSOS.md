# Próximos passos para concluir o AELO-PSI (TCC2)

**Escrito em:** 17/11/2026, a partir de `REGISTRO_EXECUCAO.md` e do Plano Mestre. Não substitui os dois: ao divergir, vale o registro. **G0 continua BLOQUEADO**, sem nenhum gate liberado.

"Concluir" aqui segue o G7: artefato demonstrável e documentação consistente com o código. Não significa produto clínico homologado.

## 1. Fechar a F0 (liberar o G0)

| # | Passo | Quem | Estado |
|---|-------|------|--------|
| 1 | Revisão independente de autorização e LGPD (F0-02) | Revisor externo | Pendente, não dá para fechar sozinho |
| 2 | Decidir as 10 decisões GOV e as 9 classes RET de [F0_GOVERNANCE_DECISIONS.md](privacy/F0_GOVERNANCE_DECISIONS.md) | Responsáveis competentes | Pendente |
| 3 | Validar juridicamente o RIPD (hoje só rascunho) e confirmar a situação da CFP 001/2009 | Jurídico/orientador | Pendente |
| 4 | Implantação alvo F0-04: TLS real, endurecimento do ambiente, governança de chaves e reconstrução das imagens antigas que contêm backup Git/histórico | Autor | Pendente |
| 5 | Pentest, ou revisão de infraestrutura e privacidade | Autor ou terceiro | Pendente |
| 6 | Validar o pipeline integral (worker, Ollama, interface) e inspecionar no navegador (claro, escuro, alto contraste, leitor de tela) | Autor | Pendente |
| 7 | Pendências técnicas de F0: proteção de tokens contra XSS, encerramento de sessão em outros dispositivos, corrida de cadastro duplicado, concorrência de agenda, `SearchFilter` real em pacientes/usuários | Autor | Pendente |
| 8 | Consolidar os critérios G0 em documento e registrar no `REGISTRO_EXECUCAO.md` | Autor | Depois dos passos 1 a 7 |

A CI local (`tools/local_ci.py`) cobre os checks técnicos sem depender da cota do GitHub. Rode-a antes de cada marco: [LOCAL_CI.md](validation/LOCAL_CI.md).

## 2. F1: núcleo clínico confiável (G1)

- Prontuário íntegro, com fluxo completo de assinatura e histórico auditável (F1-03: hoje só existe a assinatura da revisão de IA).
- Criptografia e autorização por clínica operacionais.
- Financeiro, notificações e edição de preferências e contas.
- Autosave e concorrência de edição.

## 3. F2: indexação e RAG rastreável (G2)

- Busca no histórico completo, com citações verificáveis e sem fonte de paciente errado.
- Testes de falha de IA e de injeção.
- Métricas de base com `evaluate_lod_retrieval.py` e `services/metrics/evidence_benchmark.py`. Medir no GraphRAG real, não só no fixture.

## 4. F3: ligações semânticas e temporalidade (G3)

- Relações justificadas e revisadas por humano, com proveniência temporal.
- Linha do tempo consistente com as notas.
- Comparar as métricas de recuperação com as do G2.
- **Não iniciar antes do G0 e do G2.**

## 5. F4 e F5 (opcionais se o prazo apertar)

- **F4:** indicadores longitudinais exploratórios. Não classificam gravidade nem risco. Exigem definição metodológica e revisão clínica.
- **F5:** exportação limitada e governança do dado. Hoje as exportações são legíveis e a retenção de cópias e chaves não está homologada.

O Plano Mestre sugere priorizar o MVP G0 a G3 e tratar F4 e F5 como escopo reduzido.

## 6. F6 e F7: avaliação e fechamento acadêmico

- Protocolo DSR e avaliação de usabilidade e acessibilidade (WCAG 2.2). Avaliação com humanos exige CEP e cronograma confirmados. Sem isso, usar protocolos sintéticos.
- Pendências do autor e do orientador: texto do TCC2 em Word, com IA declarada como apoio à redação, conforme o guia no cofre.
- Apresentação: [guia de 15 a 20 minutos](../1%20-%20TCC/wiki/outputs/guia_apresentacao_tcc2_15_20_minutos.md).
- Documentação consistente com o código, e demonstração com dados sintéticos.

## 7. Ordem sugerida

1. Passos 1 a 8 da F0 (liberam o G0).
2. F1 e F2 (G1, G2): o núcleo que sustenta a demonstração.
3. F3 no que o prazo permitir.
4. Em paralelo, a partir de agora: texto do TCC2, protocolo sintético e CEP.
5. F7: empacotamento e defesa.

## 8. Pendências de ambiente local

- Confirmar no GitHub o estado dos PRs #15 a #24 e da `main`, pois o registro pode estar defasado.
- A branch `validation/f0-area1-tls` ainda não foi enviada ao remoto.
- Pastas pessoais não versionadas (`.agents/`, `.obsidian/`, `1 - TCC/`, `Claude outputs/`, `reports/`, `research_notes/`, `node_modules/` na raiz): decidir se entram no `.gitignore`.
- Avisos conhecidos do build: 9 de Fast Refresh, Zod e chunk grande do Cytoscape.
