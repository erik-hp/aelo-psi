# Relatório Oficial de Auditoria de UX Clínica e Ergonomia Cognitiva
## Plataforma AELO: Prontuário Eletrônico Psicológico e Cog-Vault com IA Consultiva

**Documento:** `CLINICAL_UX_AUDIT.md`  
**Versão:** 1.0.0 — Oficial / Linha de Base Diagnóstica  
**Data:** 2026-11-03  
**Status:** Homologado para Execução dos Milestones M2, M3 e M4  
**Autoria Técnica:** Subagente Especialista em Ergonomia Clínica e Engenharia de Software (`worker_audit_1`)  
**Supervisão Normativa:** Conselho Federal de Psicologia (Resoluções CFP nº 01/2009 e 009/2024), Lei Geral de Proteção de Dados (Lei nº 13.709/2018, Art. 11 e Art. 20) e Padrões Internacionais de Usabilidade em Saúde (ISO 9241-210 / Nielsen-Norman Group Healthcare Ergonomics).

---

## 1. Resumo Executivo e Contextualização Clínica

### 1.1 A Realidade do Psicólogo Clínico e a Carga Mental do Cuidado
A prática da psicoterapia clínica se assenta sobre processos relacionais e cognitivos de alta sensibilidade humana. Ao longo de jornadas diárias que compreendem de 6 a 8 atendimentos clínicos contínuos de 50 minutos cada, o psicólogo opera em estado ininterrupto de **escuta qualificada**, **sintonia empática** e **análise contínua de narrativas complexas e multifacetadas**. 

O material clínico processado envolve relatos de desamparo, traumas severos, ideação suicida, conflitos vinculares e vulnerabilidades existenciais profundas. Ao término de cada sessão (ou ao final de um longo bloco de atendimentos), o profissional se depara com a obrigação legal, deontológica e ética de formalizar o registro documental de cada paciente (anamnese, notas de evolução, hipóteses diagnósticas, planos terapêuticos e encaminhamentos).

### 1.2 O Fenômeno do Burnout Administrativo Induzido por Prontuários (EHR-Induced Burnout)
Estudos internacionais e nacionais em ergonomia hospitalar e ambulatorial demonstram que sistemas eletrônicos de registro em saúde mal projetados figuram como uma das principais causas de exaustão profissional, despersonalização e estresse crônico entre terapeutas (*EHR-induced burnout*). As causas-raiz desse fenômeno residem em:
1. **Fadiga de Decisão (*Decision Fatigue*):** O esgotamento gradual da capacidade de julgamento crítico decorrente da exposição contínua a dezenas de decisões secundárias, menus desnecessários e opções concorrentes na interface.
2. **Ansiedade de Perda Catastrófica de Dados:** A tensão psíquica constante provocada pela ausência de mecanismos seguros de salvamento automático (*autosave*) durante o relato da sessão.
3. **Fadiga de Alarme e Cegueira de Atenção (*Alarm Fatigue*):** A proliferação desordenada de alertas visuais de aviso com pesos idênticos, que anestesia a percepção do terapeuta para riscos iminentes (ex.: ideação autolítica).
4. **Desconexão da Rastreabilidade e Opacidade Algorítmica:** A apresentação de conclusões ou métricas geradas por inteligência artificial desvinculadas das evidências literais textuais originais, obrigando o terapeuta a despender energia cognitiva desproporcional para validar a dedução da máquina.

### 1.3 O Imperativo Ético da Supervisão Humana Ativa (*Human-in-the-Loop* - HITL)
A integração de modelos avançados de linguagem (LLMs) e extração de grafos de conhecimento estruturados (*Patient Vault*) não pode, sob qualquer pretexto, transformar a tecnologia em uma autoridade clínica autônoma. O diagnóstico e a tomada de decisão são **atos privativos e indelegáveis do psicólogo**. 

Uma interface clínica ergonômica deve evitar os dois extremos perniciosos:
* **A Rejeição por Sobrecarga:** Quando o sistema é tão burocrático, lento ou confuso que o terapeuta abandona as ferramentas assistivas de IA.
* **O "Rubber Stamping" (Aprovação Cega por Exaustão):** Quando a interface, exaurida de atrito cognitivo, induz o profissional a assinar sugestões da IA com um clique apressado para encerrar o expediente mais cedo, comprometendo a segurança do paciente e incorrendo em infração ético-disciplinar grave perante o conselho de classe.

Este relatório formaliza a auditoria diagnóstica do Frontend da plataforma AELO, pontuando cada uma das **12 Leis de UX Clínica e Ergonomia Cognitiva** sob uma rubrica estruturada de 5 faixas (0 a 10), correlacionando os pontos de atrito a linhas e arquivos específicos da base de código, e traçando o roteiro acionável para a refatoração nos Milestones subsequentes.

---

## 2. Tabela Resumo Consolidada da Avaliação Diagnóstica

A avaliação foi realizada com base na rubrica diagnóstica técnica de 5 faixas:
* **0.0 – 2.9 (Crítico / Inaceitável):** Violação grave de modelos mentais clínicos, indução a erro ou risco regulatório alto.
* **3.0 – 5.9 (Fraco / Insuficiente):** Funcionalidade básica presente, porém com atrito acentuado, opacidade e risco de *rubber stamping*.
* **6.0 – 7.9 (Moderado / Básico):** Operacional, mas exige esforço cognitivo compensatório do terapeuta.
* **8.0 – 8.9 (Bom / Ergonômico):** Interface fluida, alinhada aos modelos mentais da psicologia e com boa rastreabilidade.
* **9.0 – 10.0 (Excelente / Padrão Ouro):** Estado da arte em ergonomia cognitiva, segurança jurídica e prevenção de burnout.

| # | Lei de UX Clínica e Ergonomia Cognitiva | Nota (0-10) | Classificação | Componente / Arquivo de Maior Atrito | Impacto Clínico e Cognitivo Sintético |
|:---:|---|:---:|:---:|---|---|
| **01** | **Lei de Jakob** (Modelos Mentais Clínicos) | **4.5** | Fraco / Insuficiente | `PatientVault.tsx`, `NarrativeEditor.tsx`, `PatientProfilePage.tsx` | Jargão de jogos ("Saves") em vez de termos canônicos; editor sem templates clínicos (SOAP/DAP); prontuário monolítico em vez de abas. |
| **02** | **Lei de Hick** (Sobrecarga de Escolhas) | **3.5** | Fraco / Insuficiente | `PatientProfilePage.tsx`, `AgendaPage.tsx` | Dezenas de botões idênticos de análise por sessão; matriz de 42 dias no calendário competindo com a linha do tempo diária. |
| **03** | **Lei de Fitts** (Ergonomia e Ações Críticas) | **4.0** | Fraco / Insuficiente | `VaultApprovalModal.tsx`, `VaultCytoscapeCanvas.tsx`, `Header.tsx` | Botões críticos ("Cancelar" e "Assinar") colados com `gap-2`; zoom do grafo com centro fixo; menu mobile inoperante. |
| **04** | **Lei de Miller** (Chunking da Informação) | **4.5** | Fraco / Insuficiente | `PatientProfilePage.tsx`, `VaultNodeInspector.tsx`, `AIAnalysisCard.tsx` | Mais de 25 estímulos visuais simultâneos em rolagem infinita; arestas do grafo e cenários de risco sem agrupamento semântico. |
| **05** | **Efeito Von Restorff** (Atenção Seletiva) | **3.5** | Fraco / Insuficiente | `DashboardPage.tsx`, `AgendaPage.tsx`, `AuditTable.tsx`, `badge.tsx` | Alertas de risco grave camuflados em âmbar suave igual a pendências burocráticas leves; tabela de auditoria monocromática. |
| **06** | **Efeito Estética-Usabilidade** (Confiança e Rigor) | **6.5** | Moderado / Básico | `VaultMarkdownViewer.tsx`, `VaultCytoscapeCanvas.tsx`, `globals.css` | Boa paleta escura base, porém acabamento cru em markdown, nós sem legenda cromática e abas improvisadas sem padrão WAI-ARIA. |
| **07** | **Lei da Proximidade** (Rastreabilidade e IA Explicável) | **3.5** | Fraco / Insuficiente | `VaultNodeInspector.tsx`, `AIAnalysisCard.tsx`, `PatientProfilePage.tsx` | Evidências literais citadas pela IA desvinculadas das notas originais do prontuário (sem navegação direta); fontes separadas das conclusões. |
| **08** | **Efeito de Posição Serial** (Ancoragem Local vs. Global) | **4.5** | Fraco / Insuficiente | `PatientProfilePage.tsx`, `NarrativeEditorPage.tsx`, `DashboardPage.tsx` | O cofre cognitivo (visão global longitudinal) está sepultado no rodapé; ausência de síntese da sessão anterior no editor de notas. |
| **09** | **Regra do Pico-Final** (Encerramento Seguro e Ético) | **3.0** | Fraco / Insuficiente | `VaultApprovalModal.tsx`, `DashboardPage.tsx` | Fechamento abrupto da assinatura com toast volátil de 4s; ausência de recibo visual com hash SHA-256 e sem fechamento formal de jornada. |
| **10** | **Limite de Doherty** (Responsividade e Feedback da IA) | **4.0** | Fraco / Insuficiente | `NarrativeEditorPage.tsx`, `PatientProfilePage.tsx`, `DashboardPage.tsx` | Ausência de feedback de etapas da IA durante chamadas de 5-10s (skeleton cinza estático); risco de duplo clique; CLS perceptivo. |
| **11** | **Lei de Tesler** (Conservação da Complexidade) | **4.5** | Fraco / Insuficiente | `PatientProfilePage.tsx`, `VaultApprovalModal.tsx`, `DashboardPage.tsx` | Reducionismo psicométrico em scores percentuais ("Humor: 75%") sem contexto; falha de query secundária colapsa o dashboard inteiro. |
| **12** | **Efeito Zeigarnik** (Continuidade e Metas Terapêuticas) | **3.0** | Fraco / Insuficiente | `NarrativeEditor.tsx`, `Sidebar.tsx`, `AgendaPage.tsx` | Inexistência crítica de autosave (risco de perda catastrófica); falta de contadores de pendências e ausência de ciclo de vida clínico da sessão. |

### Diagnóstico Global Consolidado
* **Média Global do Frontend:** **4.08 / 10.0** (**Faixa Fraco / Insuficiente**)
* **Parecer Técnico:** A aplicação possui fundações tecnológicas modernas e performáticas (React 18, Vite, TanStack Query, Cytoscape), porém padece de fricções cognitivas estruturais que oneram a rotina do psicólogo, geram sobrecarga atencional pré e pós-sessão e abrem flancos perigosos para validação descuidada de pareceres de IA. A transição para o padrão ergonômico e ético de excelência (notas $\ge 8.5$) é plenamente viável mediante a execução do plano de refatoração delineado neste documento.

---

## 3. Análise Aprofundada Lei por Lei

---

### 3.1 Lei de Jakob (Familiaridade e Modelos Mentais Clínicos)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Formulada por Jakob Nielsen, a lei estabelece que os usuários transferem as expectativas acumuladas no uso de outros sistemas para a interface em uso. No domínio da psicologia clínica, o modelo mental do profissional é moldado por décadas de formação e prática em prontuários físicos e diretrizes do Conselho Federal de Psicologia (CFP). Esse modelo mental se estrutura em:
1. **Identificação e Contato Inicial (Anamnese);**
2. **Evolução Cronológica de Sessões (frequentemente sob formatos canônicos como SOAP ou DAP);**
3. **Plano de Tratamento e Metas Terapêuticas;**
4. **Relatórios, Laudos e Documentos Auditados.**

Quando um software impõe analogias alienígenas à clínica (ex.: jargões de desenvolvimento de software ou videogames) ou fragmenta o prontuário em leiautes desordenados, o psicólogo gasta energia em decodificação mecânica em vez de canalizá-la para o paciente.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/patients/PatientVault.tsx` (linhas 45-55):**
   A aba de histórico documental é nomeada literalmente como `"Linha do Tempo / Saves"`. O termo *"Saves"* pertence à cultura de entretenimento digital e jogos eletrônicos. Na psicologia clínica, o registro de estados do prontuário constitui uma *"Evolução Documental"*, *"Checkpoint Clínico"* ou *"Histórico de Consolidações"*.
2. **`Frontend/src/components/forms/NarrativeEditor.tsx` (linhas 15-45):**
   O editor clínico disponibiliza uma caixa de texto crua e indiferenciada (`<Textarea placeholder="Descreva a sessão..." />`), sem oferecer nenhum suporte ou scaffold para estruturas consagradas como SOAP (*Subjective, Objective, Assessment, Plan*) ou DAP (*Data, Assessment, Plan*). O terapeuta precisa memorizar mentalmente a estrutura documental exigida pelas boas práticas e pela Resolução CFP nº 01/2009.
3. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 60-220):**
   Em vez da clássica e familiar divisão do prontuário em abas temáticas estanques, a página empilha todas as informações em uma rolagem infinita contínua de milhares de pixels: dados cadastrais, agenda, histórico de sessões com caixas de texto abertas, gráficos estatísticos e o grafo de conhecimento.
4. **`Frontend/src/pages/AgendaPage.tsx` (linhas 58-95):**
   A agenda tenta funcionar como um calendário de produtividade corporativa de escritório, negligenciando a rotina do consultório de psicologia, na qual o profissional opera por uma linha do tempo horária focada no dia atual e no acolhimento do paciente.

#### C. Risco Clínico e Cognitivo Associado
* **Estranhamento e Rejeição Institucional:** O uso de termos vulgares ou descontextualizados diminui a credibilidade da plataforma perante comitês de ética e clínicas de psicologia.
* **Omissão Documental Involuntária:** A falta de scaffolds clínicos estruturados no editor induz o terapeuta cansado a redigir anotações lacônicas, omitindo intervenções fundamentais exigidas pelo CFP em caso de fiscalização ou solicitação judicial.

#### D. Nota Justificada: 4.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Há termos misturados de software/games, ausência de scaffolds SOAP/DAP e quebra da estrutura canônica de prontuário em abas, embora os fluxos essenciais de navegação básica estejam funcionais.

#### E. Recomendações e Plano Acionável de Intervenção
* Renomear a aba em `PatientVault.tsx` para `"Histórico de Checkpoints Clínicos"` ou `"Evoluções Auditadas"`.
* Integrar scaffolds rápidos no `NarrativeEditor.tsx` (botões para injetar templates SOAP e DAP).
* Estruturar `PatientProfilePage.tsx` em 4 abas canônicas: **Resumo Clínico**, **Prontuários & Sessões**, **Evolução Longitudinal** e **Cofre Cognitivo (Vault)**.

---

### 3.2 Lei de Hick (Sobrecarga de Escolhas e Fadiga de Decisão)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
A Lei de Hick-Hyman postula que o tempo necessário para tomar uma decisão cresce logaritmicamente com o número de alternativas apresentadas: $T = b \cdot \log_2(n + 1)$. Na rotina de um psicólogo com múltiplos pacientes subsequentes, o córtex pré-frontal sofre exaustão cognitiva progressiva. Apresentar múltiplos botões redundantes e opções concorrentes em tela gera **paralisia decisória** e aumenta a probabilidade de escolhas impulsivas.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 17-57 e 149-156):**
   Para cada sessão listada no histórico do paciente, o componente instancia um sub-bloco `SessionAnalysisBlock`, contendo seu próprio campo `<Textarea>` editável e seu próprio botão `"Enviar para análise"`. Se o paciente possui 12 sessões, há 12 caixas de texto abertas e 12 botões idênticos de envio de análise competindo simultaneamente na tela.
2. **Competição de Níveis de Análise em `PatientProfilePage.tsx`:**
   O psicólogo se depara concomitantemente com:
   - Botões de análise por sessão individual na coluna esquerda;
   - Painel de análise consolidada com scores globais na coluna direita;
   - Botão `"Gerar checkpoint da análise recente"` no rodapé do `PatientVault`.
   O profissional fica em dúvida sobre qual ação deve disparar e se a análise de uma sessão sobrescreve o cofre global.
3. **`Frontend/src/pages/AgendaPage.tsx` (linhas 163-188):**
   A tela expõe uma matriz mensal completa de 42 botões de dias, forçando o terapeuta a filtrar manualmente o olhar em uma grade volumosa, em vez de focar nas decisões imediatas do turno de trabalho.

#### C. Risco Clínico e Cognitivo Associado
* **Paralisia Decisória e Ansiedade:** O terapeuta teme acionar o botão incorreto e perder dados de auditoria anteriores.
* **Fadiga de Decisão Pré-Sessão:** O psicólogo consome minutos preciosos do intervalo entre sessões tentando decodificar em qual formulário deve registrar as notas do paciente.

#### D. Nota Justificada: 3.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Múltiplas opções e formulários redundantes abertos concorrendo na mesma tela, exigindo esforço contínuo de filtragem visual e sobrecarregando o julgamento clínico.

#### E. Recomendações e Plano Acionável de Intervenção
* Eliminar as textareas abertas concorrentes em `PatientProfilePage.tsx`, encapsulando as sessões em acordeões colapsáveis com fluxo focado de edição.
* Centralizar a ação de análise clínica em um único ponto contextual evidente.
* Na `AgendaPage.tsx`, adotar a linha do tempo diária como visualização primária, recolhendo a grade de 42 dias para um seletor mensal sob demanda.

---

### 3.3 Lei de Fitts (Ergonomia e Ações Críticas)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Formulada por Paul Fitts, a lei modela o tempo necessário para mover o cursor até um alvo: $MT = a + b \cdot \log_2(2D / W)$, onde $D$ é a distância e $W$ é a largura do alvo. Em ambientes clínicos, ações de alto impacto ético-jurídico (como assinatura digital criptográfica ou cancelamento de registros) devem possuir alvos generosos e zonas deliberadas de salvaguarda motora para prevenir disparos acidentais (*slips* motores).

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/patients/VaultApprovalModal.tsx` (linhas 14-25):**
   Os botões `"Cancelar"` e `"Assinar aprovação"` estão posicionados lado a lado no rodapé direito com um espaçamento ínfimo de apenas 8px (`gap-2`). O botão de assinatura — que gera uma vinculação jurídica criptográfica irreversível — não possui barreira motora, aviso de confirmação ou destaque espacial, possibilitando toques errôneos em touchpads ou tablets.
2. **`Frontend/src/components/patients/VaultCytoscapeCanvas.tsx` (linhas 30-40):**
   Os botões de controle do grafo (`"Centralizar"`, `"+"`, `"-"`) estão agrupados abaixo do canvas, fora da área natural de navegação visual. Além disso, a função de zoom utiliza coordenadas absolutas fixas no código: `zoom({ level, renderedPosition: { x: 250, y: 230 } })`, desconsiderando completamente a resolução responsiva e a posição do nó sob inspeção.
3. **`Frontend/src/components/patients/VaultTimeline.tsx` (linhas 15-25):**
   Ações contextuais críticas como `"Aprovar eticamente"` e `"Baixar .md"` são renderizadas como botões minúsculos (`size="sm"`, altura de 32px), abaixo do limiar ergonômico recomendado de 44x44px (WCAG 2.5.5).
4. **`Frontend/src/components/layout/Header.tsx` (linha 12):**
   O botão de menu mobile (`<Menu className="h-5 w-5" />`) não possui evento de clique (`onClick`), tornando o alvo motor nulo em dispositivos portáteis.

#### C. Risco Clínico e Cognitivo Associado
* **Assinatura Acidental Indevida:** O risco de o terapeuta clicar inadvertidamente em "Assinar aprovação" ao tentar apenas fechar a janela modal.
* **Frustração Motora no Grafo:** A dificuldade de manipular o grafo com zoom impreciso afasta o terapeuta do uso da visualização conceitual das queixas do paciente.

#### D. Nota Justificada: 4.0 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Zonas de toque comprimidas, justaposição perigosa entre botões primários e de cancelamento em modais críticos, e controles de zoom com posicionamento estático e imperfeito.

#### E. Recomendações e Plano Acionável de Intervenção
* Separar fisicamente os botões em `VaultApprovalModal.tsx`, conferindo ao botão de assinatura estética destacada de selo ético e área de clique espaçada (`gap-4` ou `justify-between`).
* Implementar controles flutuantes sobrepostos (*floating overlay*) no `VaultCytoscapeCanvas.tsx` com cálculo dinâmico do centro do container.
* Garantir dimensões mínimas de 40-44px para botões operacionais com suporte pleno a foco de teclado.

---

### 3.4 Lei de Miller (Chunking e Digestão da Informação)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
George A. Miller estabeleceu que a memória de trabalho de curto prazo humana consegue reter em média $7 \pm 2$ unidades de informação (*chunks*). Em tarefas analíticas de saúde mental com alto grau de estresse, esse limite funcional decai para cerca de 4 blocos conceituais. A quebra estruturada da informação (*chunking*) é imperativa para permitir rápida apreensão situacional.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 80-220):**
   A página renderiza em sequência direta mais de 25 estímulos informacionais concorrentes: 4 cards de métricas no cabeçalho, bloco de frequência, agenda, histórico completo de sessões com notas abertas, 3 scores de IA, lista de cenários de risco, lista de considerações, 3 gráficos temporais Recharts e o painel do Vault. O volume excede quatro vezes a capacidade da memória operacional.
2. **`Frontend/src/components/patients/VaultNodeInspector.tsx` (linhas 10-25):**
   Quando um nó do grafo é inspecionado, todas as suas arestas são despejadas em uma lista plana de parágrafos idênticos sem categorização semântica por tipo de vínculo (`co_occurs`, `precedes`, `reports`, `associated`) ou ordenação por relevância clínica.
3. **`Frontend/src/components/analysis/AIAnalysisCard.tsx` (linhas 35-50):**
   Os blocos `"Cenários de risco"` e `"Pontos a considerar"` são renderizados como listas contínuas de frases soltas, sem divisão por gravidade, temporalidade ou esfera da vida do paciente (familiar, ocupacional, intrapsíquica).

#### C. Risco Clínico e Cognitivo Associado
* **Sobrecarga Cognitiva e Saturação Mental:** O terapeuta não consegue memorizar os aspectos cruciais do paciente durante a rápida leitura antes da sessão.
* **Omissão de Conexões Sistêmicas:** Relações vitais entre sintomas e gatilhos estressores ficam diluídas em listas textuais extensas e desestruturadas.

#### D. Nota Justificada: 4.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Ausência de particionamento semântico nas principais telas; excesso de estímulos simultâneos sem agrupamento modular por chunks.

#### E. Recomendações e Plano Acionável de Intervenção
* Modularizar o perfil do paciente em 4 abas estruturadas (Miller 4 chunks principais).
* Categorizar as relações no `VaultNodeInspector.tsx` por agrupamentos conceituais com badges semânticos.
* Estruturar cenários de risco por nível de severidade clínica (Crítico, Moderado, Observação).

---

### 3.5 Efeito Von Restorff (Destaque e Atenção Seletiva / Efeito de Isolamento)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Hedwig von Restorff comprovou que, em uma série de estímulos homogêneos, o item que destoa perceptualmente é o que atrai a atenção imediata e é fixado na memória. Em saúde mental, marcadores de risco à vida (ideação suicida ativa, automutilação, heteroagressividade, abandono medicamentoso em quadros psicóticos) demandam destaque perceptual nítido e exclusivo. Inversamente, usar cores de alerta para eventos corriqueiros gera **fadiga de alarme**, fazendo o profissional ignorar alertas verdadeiramente críticos.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/DashboardPage.tsx` e `AgendaPage.tsx`:**
   O componente `<Badge variant="warning">` é utilizado indistintamente tanto para uma sessão com índice de risco grave (`attentionIndex >= 80`) quanto para uma sessão meramente rotulada como `"needs_review"` (uma pendência administrativa de rotina). Ambas recebem a mesma tonalidade âmbar suave (`border-amber-400/30 bg-amber-400/10 text-amber-300`).
2. **`Frontend/src/components/patients/VaultTimeline.tsx` (linha 9):**
   O status vital `PENDING_REVIEW` (que indica um checkpoint aguardando assinatura ética formal do psicólogo sob pena de nulidade documental) é renderizado como texto corrido monocromático no cabeçalho do item: `"10/05/2026, 14:30 · 10 nós · 14 relações · PENDING_REVIEW"`, sem badge pulsante ou contraste que o diferencie de um checkpoint já homologado (`VALIDATED`).
3. **`Frontend/src/pages/AuditPage.tsx` e `AuditTable.tsx` (linhas 10-25):**
   A tabela de auditoria exibe todas as ações com tipografia uniforme em cinza claro e badges neutros (`variant="muted"`). Ações rotineiras como "Visualizou prontuário" possuem o exato mesmo peso visual de eventos de altíssima criticidade como "Exportação de dados sensíveis", "Tentativa de acesso não autorizado" ou "Assinatura digital de checkpoint".
4. **`Frontend/src/components/ui/badge.tsx` (linhas 6-18):**
   O componente primitivo de badge dispõe somente de 4 variantes: `default` (azul), `success` (ciano), `warning` (âmbar) e `muted` (cinza). Não existe uma variante `critical` ou `destructive` (borda vermelha de alto contraste) destinada a riscos clínicos iminentes.

#### C. Risco Clínico e Cognitivo Associado
* **Cegueira para Risco de Suicídio / Emergência:** Avisos de severidade máxima passam despercebidos porque se assemelham visualmente a pendências burocráticas leves.
* **Fadiga de Alarme:** O terapeuta aprende a ignorar badges de alerta por considerá-los excessivos e inespecíficos.

#### D. Nota Justificada: 3.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Nivelamento cromático perigoso entre pendências administrativas e alertas de emergência vital; ausência de primitiva de badge crítico na UI.

#### E. Recomendações e Plano Acionável de Intervenção
* Expandir `badge.tsx` com a variante `critical` (vermelho de alto contraste com ícone indicativo).
* Reservar o destaque visual agudo (`critical`) exclusivamente para fatores clínicos de emergência.
* Destacar visualmente checkpoints `PENDING_REVIEW` com badge de prioridade na `VaultTimeline.tsx`.
* Categorizar eventos na `AuditTable.tsx` com badges semânticos diferenciados por gravidade LGPD.

---

### 3.6 Efeito Estética-Usabilidade (Confiança e Rigor Clínico)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Postulado por Masaaki Kurosu e Kaori Kashimura, o efeito demonstra que os usuários percebem interfaces esteticamente harmoniosas, equilibradas e polidas como mais fáceis de usar, mais robustas e confiáveis. No consultório psicológico, onde vigoram a sobriedade, a confidencialidade e o acolhimento, uma interface desordenada ou com aspecto de "esboço técnico" suscita desconfiança e gera aversão ao uso contínuo.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/patients/VaultMarkdownViewer.tsx` (linhas 10-20):**
   A exibição do relatório de checkpoint clínico é feita em uma caixa cinza rudimentar com borda simples (`max-h-96 overflow-auto rounded border p-3`), sem acabamento tipográfico editorial (`prose-invert`), hierarquia elegante de subtítulos ou espaçamento respirável para citações clínicas.
2. **`Frontend/src/components/patients/VaultCytoscapeCanvas.tsx` (linhas 45-80):**
   As cores dos nós do grafo estão fixadas no código em hexadecimais puros (`#60a5fa`, `#f87171`, `#fbbf24`, `#34d399`) e não há nenhuma legenda explicativa na tela. O grafo aparenta ser um módulo experimental desconectado do rigor do prontuário médico.
3. **`Frontend/src/components/patients/PatientVault.tsx` (linhas 30-40):**
   O fallback de carregamento do grafo sob `Suspense` exibe apenas um texto cru: `<p className="text-sm text-muted-foreground">Carregando grafo…</p>`, sem animação harmônica de skeleton ou indicador elegante de carregamento.
4. **Ausência de Componente Padronizado de Abas (`components/ui/tabs.tsx`):**
   A alternância entre o grafo e a linha do tempo em `PatientVault.tsx` é feita com botões manuais (`variant={tab === "graph" ? "default" : "ghost"}`), sem o refinamento estético, foco semântico e suavidade de transição de um componente WAI-ARIA nativo.

#### C. Risco Clínico e Cognitivo Associado
* **Perda de Confiança na Integridade do Prontuário:** O aspecto improvisado de certas telas gera receio no terapeuta quanto à robustez do armazenamento de dados confidenciais.
* **Desconforto Visual:** A leitura continuada de relatórios em caixas cinzas mal formatadas amplia a fadiga ocular no término da jornada diária.

#### D. Nota Justificada: 6.5 / 10.0 (Moderado / Básico)
*Justificativa:* O design system base possui uma paleta sóbria agradável (`hsl(220 26% 5%)`) e tipografia legível (`Inter`), mas componentes específicos apresentam acabamento cru e improvisado.

#### E. Recomendações e Plano Acionável de Intervenção
* Implementar o componente `Frontend/src/components/ui/tabs.tsx` com acessibilidade total e acabamento refinado.
* Aplicar tipografia clínica enriquecida (`prose`) no `VaultMarkdownViewer.tsx`.
* Inserir legenda cromática formal no `VaultCytoscapeCanvas.tsx` explicando o papel de cada cor de nó (Sintoma, Evento, Intervenção, Contexto).

---

### 3.7 Lei da Proximidade (Rastreabilidade e IA Explicável)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Princípio fundamental da percepção Gestalt: elementos posicionados contiguamente no espaço são interpretados pelo cérebro como pertencentes ao mesmo grupo conceitual ou dotados de relação causal direta. No contexto de IA aplicada à saúde mental, **a Lei da Proximidade é o pilar da explicabilidade algorítmica**. Todo insight, hipótese diagnóstica ou entidade de grafo gerada pela IA deve estar fisicamente justaposta à evidência textual literal que a originou. Conclusões isoladas de suas fontes forçam o terapeuta a alternar janelas e buscar manualmente a comprovação, quebrando a linha de raciocínio clínico.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/patients/VaultNodeInspector.tsx` (linhas 7-15):**
   O painel de inspeção exibe a relação extraída e a citação textual:
   `{edge.relation} · peso {edge.weight}: “{edge.evidence}” (nota {edge.note_id}, {new Date(edge.observed_at)...})`.
   Contudo, a evidência literal está totalmente desconectada do prontuário de origem. Não há um link interativo ou atalho para abrir ou visualizar a nota integral onde aquela frase foi proferida pelo paciente. O psicólogo fica impossibilitado de conferir o contexto dialógico mais amplo da citação.
2. **`Frontend/src/components/analysis/AIAnalysisCard.tsx` (linhas 55-65):**
   As "Fontes utilizadas" aparecem condensadas como badges minúsculos na base do card (`analysis.sources`), completamente distanciadas dos blocos de "Padrões identificados" e "Cenários de risco" posicionados no topo. O terapeuta não sabe qual fonte embasou qual dedução.
3. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 130-170):**
   Os scores percentuais atribuídos pela IA (Humor: 75%, Estado emocional: 60%, Encargo: 40%) estão renderizados na coluna lateral direita, afastados por centenas de pixels das notas das sessões na coluna esquerda que alimentaram esses cálculos.
4. **Bifurcação de Abas em `PatientVault.tsx`:**
   O grafo Cytoscape e o Markdown de checkpoint residem em abas mutuamente exclusivas, impedindo a inspeção simultânea da narrativa clínica com a topologia das entidades.

#### C. Risco Clínico e Cognitivo Associado
* **Aprovação Cega de Alucinações da IA:** Pela dificuldade de localizar a nota original, o psicólogo sobrecarregado deixa de checar a veracidade da citação e homologa deduções algorítmicas imprecisas.
* **Quebra Epistemológica:** O profissional perde a confiança na IA quando não consegue aferir o contexto imediato da fala do paciente.

#### D. Nota Justificada: 3.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Ruptura espacial entre conclusões da IA e dados originais do prontuário; impossibilidade de rastreabilidade bidirecional imediata.

#### E. Recomendações e Plano Acionável de Intervenção
* No `VaultNodeInspector.tsx`, transformar `(nota {edge.note_id})` em gatilho navegável contíguo que abra a nota da sessão em painel deslizante ou destaque a evolução correspondente.
* No `AIAnalysisCard.tsx`, associar cada padrão identificado diretamente à sua nota de fundamentação *inline*.
* Permitir visualização lado a lado ou contígua entre o grafo ontológico e a narrativa do checkpoint.

---

### 3.8 Efeito de Posição Serial (Ancoragem e Visão Dual Local vs. Global)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Descoberto por Hermann Ebbinghaus, descreve a propensão da memória a fixar os primeiros itens (Efeito Primazia) e os últimos itens (Efeito Recência) de uma série, enquanto os elementos centrais sofrem atenuação mnemônica. Na preparação pré-sessão de 5 minutos, o psicólogo clínico necessita de uma **visão dual estruturada**:
1. **Âncora Global (Primazia):** O diagnóstico de base, hipóteses longitudinais e alianças de encaminhamento consolidadas ao longo dos meses.
2. **Âncora Local (Recência):** O conteúdo da última sessão, tarefas comportamentais pactuadas e o estado afetivo mais recente.
Se essas duas âncoras não estiverem imediatamente visíveis no topo da tela, a continuidade do vínculo terapêutico é fragilizada.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 190-205):**
   O `PatientVault` — que constitui a síntese longitudinal global mais sofisticada do paciente (o grafo ontológico de toda a história terapêutica) — está posicionado no fim da página, abaixo de uma rolagem vertical quilométrica. Pelo efeito de recência negativa, ele é frequentemente esquecido pelo terapeuta durante a rotina do atendimento.
2. **`Frontend/src/pages/NarrativeEditorPage.tsx` (linhas 15-40):**
   Ao ingressar no editor para redigir o prontuário de uma nova consulta, a página é aberta em branco, sem um painel de ancoragem da sessão anterior. O psicólogo é forçado a sair da tela ou abrir outra guia no navegador para relembrar o que foi trabalhado na semana anterior.
3. **`Frontend/src/pages/DashboardPage.tsx` (linhas 110-150):**
   O dashboard não dispõe de um card de destaque para a **Próxima Sessão Imediata** (quem é o paciente, horário e resumo da última evolução), forçando o profissional a caçar o paciente na lista do dia.

#### C. Risco Clínico e Cognitivo Associado
* **Ruptura de Continuidade Terapêutica:** O terapeuta entra na consulta sem o resgate ágil dos combinados da sessão anterior, causando sensação de desatenção perante o paciente.
* **Subutilização da Inteligência Longitudinal:** O cofre cognitivo deixa de ser consultado por estar escondido no rodapé do prontuário.

#### D. Nota Justificada: 4.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Visão longitudinal global empurrada para o fim da página; falta de ancoragem situacional da última sessão no fluxo de escrita de novas notas.

#### E. Recomendações e Plano Acionável de Intervenção
* Alocar o `PatientVault` em aba de destaque de primeiro nível no `PatientProfilePage.tsx`.
* Inserir um card retrátil de "Última Sessão" no `NarrativeEditorPage.tsx` para suporte à memória de trabalho.
* Adicionar o "Hero Card da Próxima Sessão" no topo do `DashboardPage.tsx` com atalho direto ao prontuário.

---

### 3.9 Regra do Pico-Final (Peak-End Rule - Sensação de Conclusão e Segurança Ético-Legal)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Postulada pelo Nobel Daniel Kahneman, a regra dita que os seres humanos julgam uma experiência psicológica não pela média de seus momentos, mas pelo ponto de maior intensidade emocional (o pico) e pelo seu fechamento (o final). O preenchimento de prontuários é historicamente percebido como o pico burocrático mais estressante da profissão. O momento final (*End*) — a assinatura e o arquivamento legal do documento — deve transmitir sensação tangível de alívio, dever cumprido e segurança jurídica indelével.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/patients/VaultApprovalModal.tsx` (linhas 20-30):**
   Ao apor a assinatura clínica e clicar em `"Assinar aprovação"`, o modal simplesmente se fecha abruptamente. O usuário é agraciado unicamente com um toast genérico e volátil que desaparece após 4,2 segundos: *"Revisão assinada. A decisão foi registrada com assinatura criptográfica"*.
2. **Ausência de Recibo Visual e Hash SHA-256 no Frontend:**
   Após o toast sumir, não fica visível nenhum carimbo de conformidade com a Resolução CFP nº 01/2009, nenhum selo visual de integridade nem a exibição do hash criptográfico (`content_sha256`) gerado para o checkpoint. O terapeuta não tem comprovação visual duradoura de que o ato clínico foi blindado contra adulterações.
3. **`Frontend/src/pages/DashboardPage.tsx`:**
   Não há um indicador visual de "Expediente Seguro" ou "Jornada do Dia Concluída". Ao final do dia, o psicólogo fecha o navegador inseguro se deixou alguma evolução sem assinar.

#### C. Risco Clínico e Cognitivo Associado
* **Insegurança Jurídica Subjetiva:** O profissional sofre com a dúvida crônica sobre se a documentação atende aos critérios do conselho em caso de litígio judicial.
* **Perpetuação da Tensão Mental Pós-Trabalho:** A falta de um fechamento solene e claro impede o desligamento psicológico saudável após o expediente clínico.

#### D. Nota Justificada: 3.0 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Fechamento abrupto sem cerimônia visual de autenticação ética; ausência de comprovante criptográfico auditável explícito na interface pós-assinatura.

#### E. Recomendações e Plano Acionável de Intervenção
* Implementar no `VaultApprovalModal.tsx` uma tela de sucesso com selo visual de autenticação ética, carimbo temporal oficial e exibição resumida do hash SHA-256.
* Exibir na `VaultTimeline.tsx` o badge definitivo com ícone de escudo criptográfico para checkpoints homologados.
* Adicionar no `DashboardPage.tsx` um indicador de fechamento seguro de pendências clínicas ao término do expediente.

---

### 3.10 Limite de Doherty (Responsividade e Feedback da IA)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Walter J. Doherty estabeleceu que a interação produtivo-cognitiva entre humano e computador ocorre quando a resposta do sistema ocorre em um tempo inferior a 400 milissegundos. Quando processos de inteligência artificial profunda (como extração de entidades clínicas, inferência com LLM e clusterização de grafos com algoritmo de Leiden) demandam entre 3 e 10 segundos, a interface deve obrigatoriamente fornecer feedback contínuo dos estágios de raciocínio. O silêncio perceptual da tela gera ansiedade de travamento e induz o usuário a múltiplos cliques destrutivos.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/NarrativeEditorPage.tsx` (linhas 25-35):**
   Ao clicar no botão para submeter a nota para análise da IA (`mutation.isPending`), o botão não exibe spinner interno nem mensagem de progresso. A página inteira substitui o conteúdo por um `<LoadingSkeleton />` estático cinza, sem nenhuma informação sobre o que o servidor está processando.
2. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 45-55):**
   Durante o processamento de análise da sessão, o botão fica desabilitado com o texto `"Analisando..."`, sem estimativa de tempo ou estágios conceituais.
3. **Ausência de Tratamento de Erro Visual em `NarrativeEditorPage.tsx`:**
   O hook `useMutation` na página não declara `onError`, deixando a tela muda se a conexão com o backend falhar ou expirar por timeout, deixando o psicólogo completamente sem resposta.
4. **Ausência de Skeletons Estruturados na `AgendaPage.tsx` e `AuditPage.tsx`:**
   Essas páginas não possuem skeleton estruturado durante o carregamento inicial, exibindo telas piscantes em branco e provocando alteração cumulativa de layout (CLS).

#### C. Risco Clínico e Cognitivo Associado
* **Cliques Múltiplos e Sobrecarga de Requisições:** Ansioso com a falta de resposta imediata, o terapeuta clica repetidamente no botão de envio, disparando requisições duplicadas.
* **Percepção de Sistema Lento e Inseguro:** O silêncio visual da interface transmite a impressão de que a aplicação está corrompida.

#### D. Nota Justificada: 4.0 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Skeletons estáticos sem microcopy de estágios cognitivos da IA; ausência de tratamento de erro em páginas-chave e feedback assíncrono genérico.

#### E. Recomendações e Plano Acionável de Intervenção
* Implementar microcopy contextual de estágios da IA (*"Indexando narrativa clínica..."*, *"Mapeando conexões conceituais..."*, *"Estruturando grafo de entidades..."*).
* Adicionar estado `loading` nativo no componente `Frontend/src/components/ui/button.tsx` com spinner SVG e bloqueio de múltiplos disparos.
* Configurar skeletons correspondentes à estrutura real das telas em todas as rotas assíncronas.

---

### 3.11 Lei de Tesler (Conservação da Complexidade)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Larry Tesler formulou que todo sistema possui uma quantidade intrínseca de complexidade que não pode ser eliminada; ela precisa ser absorvida pelo software ou transferida para o usuário. Na clínica psicológica, a mente humana e o sofrimento psíquico são infinitamente complexos. O papel da tecnologia é **absorver a complexidade mecânica, administrativa e criptográfica**, liberando o terapeuta para lidar com a complexidade relacional e clínica. O sistema peca gravemente quando tenta "simplificar" o processo clínico reduzindo o paciente a percentuais superficiais ou quando transfere ao profissional cálculos manuais de segurança.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/pages/PatientProfilePage.tsx` (linhas 135-145):**
   A síntese do paciente apresentada pela IA se resume a 3 cards de texto com métricas percentuais planas: *"Humor: 75%"*, *"Estado emocional: 60%"*, *"Encargo psicológico: 40%"*. Essa abordagem incorre em reducionismo psicométrico tolo: o software transfere a dúvida ao psicólogo sobre como uma aflição humana complexa pode ser quantificada em "75% de humor", sem oferecer o substrato qualitativo do cálculo.
2. **`Frontend/src/pages/DashboardPage.tsx` (linhas 60-65):**
   A página declara:
   ```tsx
   if (dashboardQuery.isError || agendaQuery.isError || financeQuery.isError) {
     return <p role="alert" className="text-sm text-destructive">Não foi possível carregar o dashboard.</p>;
   }
   ```
   Se o endpoint financeiro falhar, **a tela inteira do consultório colapsa**, impedindo o profissional de ver seus atendimentos clínicos. O software transferiu a fragilidade de um módulo auxiliar para a rotina central de atendimento.
3. **`Frontend/src/components/patients/VaultApprovalModal.tsx` (linha 16):**
   O modal impõe a validação `justification.trim().length >= 10`, mas não fornece sugestões ou atalhos de justificativas padronizadas, forçando o terapeuta cansado a inventar e digitar manualmente frases repetitivas a cada checkpoint.

#### C. Risco Clínico e Cognitivo Associado
* **Reducionismo Clínico e Desumanização:** Tratar o paciente por percentuais frios pode induzir o terapeuta a diagnósticos enviesados.
* **Bloqueio Operacional em Falhas Secundárias:** Ficar sem acesso à agenda do dia por causa de uma falha de rede no módulo financeiro gera caos no consultório.

#### D. Nota Justificada: 4.5 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Complexidade mecânica de queries não tolerante a falhas; reducionismo de métricas psicológicas e transferência indevida de esforço de redação de justificativas.

#### E. Recomendações e Plano Acionável de Intervenção
* Substituir os percentuais frios por indicadores clínicos qualitativos acompanhados de justificativa narrativa contextualizada.
* Desacoplar as queries no `DashboardPage.tsx`, aplicando degradação graciosa em falhas de módulos secundários.
* Oferecer atalhos de justificativas clínicas estruturadas no `VaultApprovalModal.tsx`.

---

### 3.12 Efeito Zeigarnik (Continuidade e Metas Terapêuticas)

#### A. Definição Teórica e Fundamento Psicológico/Ergonômico
Bluma Zeigarnik demonstrou que o cérebro humano retém tarefas incompletas ou interrompidas com muito maior tensão e ocupação mnemônica do que tarefas concluídas. Em terapeutas, a sensação permanente de "prontuários inacabados", notas de sessão deixadas para depois e evoluções pendentes é o mais poderoso vetor de sofrimento e ruminação profissional fora do consultório. A interface deve apoiar o fechamento deliberado de ciclos e salvaguardar continuamente o trabalho em andamento.

#### B. Manifestação Empírica e Pontos de Atrito no Frontend
1. **`Frontend/src/components/forms/NarrativeEditor.tsx` (Risco Crítico de Perda de Dados):**
   O editor não possui rotina de **salvamento automático (*autosave*)** nem persistência em cache local (`localStorage`). Se o navegador travar, o computador descarregar ou o terapeuta clicar acidentalmente em outro link da barra lateral, a nota clínica inteira é perdida de forma irreversível. Essa ausência gera ansiedade crônica durante a digitação de notas em tempo real.
2. **`Frontend/src/components/layout/Sidebar.tsx` e `Header.tsx`:**
   A barra lateral e o cabeçalho não possuem contadores dinâmicos de pendências (ex.: badge com *"3 evoluções pendentes de preenchimento"* ou *"1 checkpoint aguardando supervisão ética"*). O profissional não sabe se possui pendências acumuladas sem navegar pacientemente por cada paciente.
3. **`Frontend/src/pages/AgendaPage.tsx` (linhas 110-140):**
   O sistema trata as sessões apenas como `draft` ou `completed`. Não existem os estados clínicos essenciais do ciclo de atendimento: *"Aguardando na sala de espera"*, *"Em consulta"*, *"Atendimento realizado (Evolução pendente)"*, impedindo o psicólogo de rastrear quais sessões do dia já foram formalizadas no prontuário.

#### C. Risco Clínico e Cognitivo Associado
* **Perda Catastrófica de Prontuários:** Perda de registros detalhados de sessões por acidentes de software ou navegação.
* **Burnout por Tensão Zeigarnik Não Resolvida:** Incapacidade de saber se todas as pendências ético-documentais foram sanadas antes de encerrar o expediente.

#### D. Nota Justificada: 3.0 / 10.0 (Fraco / Insuficiente)
*Justificativa:* Ausência completa de autosave no editor clínico (gravíssima falha ergonômica) e inexistência de sinalizadores de fechamento de pendências no sistema de navegação.

#### E. Recomendações e Plano Acionável de Intervenção
* Implementar autosave com persistência em `localStorage` sob chave `draft_narrative_${patientId}` e indicador discreto de *"Rascunho salvo às HH:MM:SS"*.
* Adicionar badges numéricos de pendências na `Sidebar.tsx` e no ícone de notificações do `Header.tsx`.
* Modelar o ciclo de vida clínico dos atendimentos na `AgendaPage.tsx` com status de evolução pendente.

---

## 4. Marco Regulatório e Ético: CFP e LGPD

A arquitetura de software e a experiência de usuário de um sistema clínico para psicólogos estão subordinadas a marcos regulatórios federais estritos. Qualquer decisão de interface que fira tais resoluções acarreta nulidade probatória e responsabilização disciplinar e civil do profissional.

### 4.1 Resolução CFP nº 01/2009: Guarda Documental e Registro de Atendimento
1. **Obrigatoriedade do Registro:**
   * É dever inalienável do psicólogo manter registro documental rigoroso de todos os atendimentos realizados.
   * O registro deve conter obrigatoriamente: identificação do usuário, datas e frequências, evolução do processo psicoterapêutico, procedimentos técnico-científicos adotados e encaminhamentos.
2. **Prazo Obrigatório de Guarda:**
   * O prontuário deve ser custodiado de forma íntegra e confidencial pelo período mínimo de **5 (cinco) anos** contados a partir da data de encerramento do acompanhamento.
   * Em atendimentos de crianças e adolescentes, o prazo é contado com salvaguarda prescricional especial, podendo se estender além da maioridade civil.
3. **Sigilo Profissional e Controle de Acesso (Artigo 9º do Código de Ética):**
   * O sistema deve garantir controles de acesso baseados em perfis de privilégio restrito (RBAC: `ADMIN`, `PSYCHOLOGIST`, `INTERN`). 
   * Estagiários e administradores não possuem autorização legal para visualizar anotações íntimas de prontuário, cabendo à interface mascarar ou omitir tais dados conforme o papel logado.
4. **Imutabilidade e Aditamento Formal:**
   * Uma vez assinado um registro de prontuário, ele não pode ser livremente editado ou excluído. Qualquer complementação ou retificação posterior deve ocorrer exclusivamente sob a forma de **aditamento documental**, com carimbo de data, hora e justificativa formal do aditante.

### 4.2 Resolução CFP nº 009/2024: A Não-Delegação do Ato Privativo à Inteligência Artificial
1. **Primazia do Julgamento Humano:**
   * A elaboração de diagnósticos, prognósticos, laudos e intervenções psicológicas constitui ato privativo exclusivo do profissional de psicologia registrado no conselho regional competente.
   * Fica expressamente vedada a delegação de julgamento clínico ou a tomada de decisão autônoma a qualquer software, algoritmo de aprendizado de máquina ou inteligência artificial generativa.
2. **Caráter Estritamente Consultivo da IA:**
   * Todos os artefatos de texto, métricas de atenção, agrupamentos de conceitos e grafos de conhecimento gerados pelo AELO possuem natureza **exclusivamente assistiva e consultiva**.
   * A interface tem a obrigação de evidenciar que o material da IA é uma sugestão preliminar que não integra o prontuário sem a expressa revisão, chancela e assinatura do psicólogo responsável.
3. **Supervisão Ativa Obrigatória (*Human-in-the-Loop*):**
   * O fluxo de aprovação de checkpoints (`VaultApprovalModal.tsx`) materializa a exigência legal de supervisão humana ativa. A assinatura não pode ser um processo passivo de clique cego; ela deve exigir conferência das evidências e justificativa clínica deliberada.

### 4.3 LGPD (Lei Federal nº 13.709/2018): Proteção de Dados Sensíveis de Saúde
1. **Dados Pessoais Sensíveis de Saúde Mental (Art. 5º, II e Art. 11):**
   * Narrativas terapêuticas, traumas, histórico familiar e ideações clínicas constituem o nível mais crítico de dados protegidos pela LGPD.
   * O tratamento desses dados exige medidas técnicas de segurança aptas a prevenir acessos não autorizados, incidentes de vazamento e quebras de integridade.
2. **Direito à Revisão Humana de Decisões Automatizadas (Art. 20):**
   * O titular dos dados (o paciente) tem o direito de solicitar a revisão de qualquer decisão tomada unicamente com base em tratamento automatizado de seus dados pessoais.
   * O design do sistema AELO assegura a inexistência de decisões automatizadas, demonstrando que todo processamento algorítmico passa pelo crivo analítico e assinatura manual do terapeuta.
3. **Trilhas de Auditoria Forense e Cadeia de Custódia:**
   * Conforme regulado pela página `AuditPage.tsx`, toda leitura, edição, solicitação de análise de IA e assinatura de documento deve produzir um evento auditável imutável registrando autor, perfil, ação, entidade afetada, data/hora e endereço IP.
4. **Garantia Criptográfica de Integridade com SHA-256:**
   * Os checkpoints gerados pelo cofre cognitivo (Markdown e grafos ontológicos) devem ser selados por hash criptográfico inviolável (SHA-256), atestando perante peritos e juízos que o documento arquivado permanece idêntico àquele validado pelo psicólogo no instante da sessão.

---

## 5. Matriz de Priorização e Roadmap de Refatoração

### 5.1 Matriz de Impacto Clínico x Esforço de Implementação (Matriz de Prioridade)

| Prioridade | Ação de Intervenção | Risco Mitigado | Esforço | Milestone Alvo |
|:---:|---|---|:---:|:---:|
| **P1** | **Autosave com `localStorage` e scaffolds SOAP/DAP no `NarrativeEditor`** | Prevenção de perda catastrófica de anotações e redução da fadiga de estruturação clínica. | Médio | **M2** |
| **P1** | **Reestruturação do `PatientProfilePage` em 4 Abas Canônicas** | Eliminação da sobrecarga sensorial e fadiga de rolagem (>25 estímulos para 4 chunks). | Médio | **M2** |
| **P1** | **Rastreabilidade e Contiguidade de Evidências no `VaultNodeInspector`** | Prevenção de aprovação cega de alucinações da IA e garantia de explicabilidade. | Médio | **M2** |
| **P1** | **Selo Criptográfico SHA-256 e Proteção Motora no `VaultApprovalModal`** | Fechamento seguro (Peak-End) e separação de alvos críticos contra cliques acidentais. | Baixo | **M2** |
| **P2** | **Desacoplamento Resiliente de Queries e Hero Card no `DashboardPage`** | Prevenção de tela em branco em falha financeira e ancoragem imediata do próximo paciente. | Médio | **M3** |
| **P2** | **Timeline Diária e Ciclo de Vida da Sessão na `AgendaPage`** | Redução da carga de 42 botões de calendário e controle de evoluções pendentes (Zeigarnik). | Médio | **M3** |
| **P2** | **Navegação Mobile (Drawer) no `Header` e Badges Zeigarnik na `Sidebar`** | Desbloqueio da usabilidade em tablets e sinalização clara de pendências clínicas. | Médio | **M3** |
| **P2** | **Taxonomia Visual LGPD e Correção de Roles na `AuditPage`** | Destaque seletivo para eventos de alta criticidade e correção de filtro no modo API. | Baixo | **M3** |
| **P2** | **Criação das Primitivas de UI: `tabs.tsx` e `badge.tsx` (variante critical)** | Suporte ergonômico acessível padronizado e alerta visível para emergências clínicas. | Baixo | **M3** |
| **P3** | **Microcopy Terapêutico e Microcopy de Fases da IA (Doherty Threshold)** | Redução da ansiedade de tela travada e conformidade com a Resolução CFP nº 009/2024. | Baixo | **M3** |
| **P3** | **Expansão da Suíte de Testes Vitest e Validação de Build Limpo** | Blindagem técnica de não-regressão para todos os fluxos e componentes refatorados. | Médio | **M4** |

---

### 5.2 Detalhamento do Roadmap de Refatoração por Milestone

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ROADMAP DE IMPLEMENTAÇÃO AELO                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ MILESTONE 1 (Concluído)       │             │ MILESTONE 2                   │
│ Auditoria Formal de UX        │────────────▶│ Componentes Clínicos Centrais │
│ • Diagnóstico 12 Leis         │             │ • PatientProfilePage (4 abas) │
│ • Marco CFP e LGPD            │             │ • NarrativeEditor (Autosave)  │
│ • CLINICAL_UX_AUDIT.md        │             │ • PatientVault & Inspector    │
│ • Linha de Base Test/Build    │             │ • VaultApprovalModal (SHA256) │
└───────────────────────────────┘             └───────────────────────────────┘
                                                              │
                                                              ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ MILESTONE 4                   │             │ MILESTONE 3                   │
│ Verificação e Robustez        │◀────────────│ Páginas de Gestão e Layout    │
│ • Expansão Testes Vitest      │             │ • Dashboard Resiliente        │
│ • Cobertura M2 e M3           │             │ • Agenda Diária & Ciclo Vida  │
│ • 100% Sucesso Testes         │             │ • AuditPage LGPD Semântica    │
│ • Compilação Build Limpo (0)  │             │ • Header Drawer & Sidebar     │
└───────────────────────────────┘             │ • Primitivas UI (tabs, badge) │
                                              └───────────────────────────────┘
```

#### Milestone 2: Refatoração de Componentes Clínicos e Prontuário
* **`PatientProfilePage.tsx`:** Implementar particionamento em 4 abas estruturadas (`"overview"`, `"sessions"`, `"longitudinal"`, `"vault"`). Recolher textareas abertas concorrentes em acordeões com foco singular por sessão.
* **`NarrativeEditor.tsx`:** Inserir persistência contínua em `localStorage`, indicador temporal discreto de autosave, scaffolds estruturados para templates SOAP e DAP, e atalho ergonômico de envio `Ctrl+Enter`.
* **`PatientVault.tsx` e `VaultCytoscapeCanvas.tsx`:** Substituir rótulo de "Saves" por "Checkpoints Clínicos", adicionar controles de zoom flutuantes com cálculo central responsivo e incorporar legenda cromática explicativa dos nós.
* **`VaultNodeInspector.tsx`:** Conectar a citação literal à nota de prontuário de origem por meio de link interativo contíguo de explicabilidade e categorizar arestas por tipo de relação.
* **`VaultApprovalModal.tsx`:** Inserir selo visual de autenticação ética com hash SHA-256, separar ergonomicamente o botão de assinatura com salvaguarda motora e disponibilizar templates rápidos de justificativa clínica.

#### Milestone 3: Refatoração de Páginas de Gestão, Layout e Primitivas UI
* **`DashboardPage.tsx`:** Desacoplar consultas de dados (`dashboardQuery`, `agendaQuery`, `financeQuery`) para resiliência a falhas, adicionar o hero card da Próxima Sessão com contagem regressiva e isolar o card de alertas de emergência.
* **`AgendaPage.tsx`:** Instituir a Linha do Tempo Diária em blocos horários como visualização padrão, integrar o ciclo de vida clínico dos atendimentos e tornar funcional o diálogo de agendamento de nova sessão.
* **`AuditPage.tsx` e `AuditTable.tsx`:** Aplicar taxonomia visual de eventos com badges específicos para assinaturas criptográficas e acessos LGPD, além de normalizar o mapeamento de perfis (`role`) no modo API.
* **`Header.tsx` e `Sidebar.tsx`:** Conectar o botão mobile a um componente Drawer funcional, categorizar os links da barra lateral em "Clínica" e "Gestão", e exibir contadores dinâmicos Zeigarnik de pendências.
* **`components/ui/`:** Criar o componente acessível `tabs.tsx` e expandir `badge.tsx` com a variante `critical` de alto contraste.

#### Milestone 4: Suíte de Testes Vitest, Não-Regressão e Build de Produção
* **Expansão de Testes Automatizados:** Implementar testes de unidade e componentes para `NarrativeEditor` (autosave, templates, validação Zod), `PatientVault` (alternância de abas, exibição de checkpoints), `PatientProfilePage` (navegação em abas e isolamento de seções) e `AgendaPage` (ciclo de vida das sessões).
* **Validação de Não-Regressão:** Executar `npm test --prefix Frontend` assegurando 100% de sucesso em todos os testes legados e novos.
* **Compilação de Produção:** Executar `npm run build --prefix Frontend` assegurando compilação limpa com código de saída 0.

---

## 6. Conclusão da Auditoria

A presente auditoria estabelece de forma irrefutável e documentada que a plataforma AELO possui uma arquitetura de dados e serviços sólida, porém exige uma reestruturação ergonômica e cognitiva profunda para cumprir sua missão clínica. 

Ao eliminar a sobrecarga de escolhas (Hick), assegurar rastreabilidade contígua e imediata entre hipóteses da IA e prontuários originais (Proximidade), prevenir a perda acidental de anotações com autosave contínuo (Zeigarnik), fornecer conforto motor em ações críticas (Fitts) e conferir solidez ética e criptográfica ao encerramento documental (Peak-End / CFP / LGPD), o sistema se consolidará como uma referência de excelência em prontuários eletrônicos assistidos por inteligência artificial em saúde mental.

As especificações e diretrizes aqui registradas constituem o contrato técnico mandatório para as refatorações dos Milestones 2, 3 e 4.
