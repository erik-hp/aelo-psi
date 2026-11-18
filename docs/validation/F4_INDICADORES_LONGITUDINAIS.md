# F4-01 — Definição Metodológica dos Indicadores Longitudinais Exploratórios

**Versão:** 1.0 — 17/11/2026  
**Estado:** Protocolo metodológico documentado; visualização numérica automática mantida **desabilitada em modo API** até validação clínica com psicólogos (`G4`).  
**Relaciona-se a:** `F4-01` a `F4-04`, `RF-10`, `H3`, `OE2`, `AGENTS.md`.

## 1. Justificativa Científica da Transição (TCC1 → TCC2)

No anteprojeto de TCC1, a hipótese `H3` e o objetivo `OE2` mencionavam "análise longitudinal de sentimentos" sobre prontuários psicológicos. Durante os ciclos de *Design Science Research* (DSR) do TCC2, a revisão técnica e normativa identificou três riscos graves em converter narrativas clínicas em curvas numéricas automáticas de "humor" ou "risco":

1. **Invalidez clínica de polaridade superficial:** em psicoterapia, relatos de choro, luto ou angústia durante a elaboração de um evento podem representar avanço terapêutico, enquanto frases curtas ou irônicas ("está tudo ótimo, não quero mais falar disso") produzem falso positivo em classificadores léxicos/sentimentais.
2. **Risco ético de automação diagnóstica:** atribuir percentuais como "risco", "estado emocional = 64%" ou `moodScore = 0` quando falta dado induz ancoragem cognitiva indevida e conflita com o posicionamento do CFP sobre IA (2025), que reserva avaliação e interpretação clínica exclusivamente à psicóloga/ao psicólogo.
3. **Opacidade frente à fonte documental:** um número agregado não permite ao profissional auditar qual trecho de qual sessão gerou aquela variação.

## 2. Decisão Adotada no Artefato AELO-PSI

1. **Substituição por recorrência temática ancorada em evidência literal:** o acompanhamento longitudinal no modo real (`VITE_USE_API=true`) opera pelo **Vault / Memória Clínica** (`VaultNode`, `VaultEdge`, `VaultCheckpoint`), contabilizando menções documentadas (`mention_count`), datas de primeira/última ocorrência (`first_seen_at`, `last_seen_at`) e trechos copiados literalmente das notas (`evidence`), sempre sujeitos à revisão humana assinada.
2. **Bloqueio de escores numéricos não validados na API:** em `PatientProfilePage.tsx`, a aba `Evolução longitudinal` exibe aviso explícito de indisponibilidade no modo API, sem `moodScore = 0` ou fallback simulado (`F4-03` / `F0-03`).
3. **Armazenamento técnico preparado (`SentimentMetric`):** o modelo `SentimentMetric` (`Backend/apps/ai_analysis/models.py`) preserva metadados cifrados (`EncryptedJSONField`) caso um protocolo futuro aprovado por especialistas (`F4-02` / `F4-04`) venha a medir valência estritamente textual com intervalo de incerteza, versão de modelo, extensão da nota e tratamento explícito de negação/ironia.

## 3. Regras Obrigatórias para Qualquer Experimento Futuro (`F4-02`–`F4-04`)

- Rotular qualquer medida como **sinal linguístico exploratório do texto**, nunca como humor real, diagnóstico, gravidade, adesão ou risco clínico.
- Representar ausência de nota ou falha de extração como `null` / lacuna visível, jamais como zero.
- Avaliar concordância contra anotação humana independente de psicólogos sobre corpus sintético contendo negação explícita, relato de terceiros, ambiguidade temporal e ironia antes de ligar gráficos numéricos na interface de produção.
