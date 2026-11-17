# F0-06 — Decisões de governança, retenção e incidentes

**Versão técnica: 17/11/2026. Estado: EM REVISÃO.** Escopo atual: desenvolvimento/demonstração com histórias sintéticas. Nenhuma clínica real, controlador, operador, encarregado, base legal de prontuário real ou aprovação de pesquisa foi designada por este documento. As funções abaixo são propostas para revisão, não nomeações.

Fontes técnicas: [inventário de schema](../../Backend/docs/privacy/DATA_INVENTORY.json), [mapa/RIPD](F0_DATA_MAP_RIPD_DRAFT.md), código na branch `validation/f0-area1-tls`, base `86050fa`. Não copiar credenciais, nomes de pacientes, contatos pessoais ou documentos de identidade para estes arquivos.

## 1. Decisões com responsável e evidência exigida

| ID | Decisão concreta a registrar | Função que deve decidir/revisar | Evidência para fechar | Situação |
| --- | --- | --- | --- | --- |
| GOV-01 | Separar protótipo sintético, estudo com participantes e eventual operação clínica; identificar instituição e quem decide finalidades/meios em cada contexto | Responsável institucional com orientação de privacidade | Registro de contexto, partes e papéis; delimitação contratual quando aplicável | Apenas escopo sintético vigente; papéis jurídicos reais PENDENTES |
| GOV-02 | Justificar finalidade, necessidade, dados mínimos e hipótese legal por atividade, diferenciando saúde, autenticação, auditoria e pesquisa | Controlador a identificar, revisão jurídica/privacidade | Matriz aprovada e justificativas vinculadas aos fluxos | PENDENTE; nenhuma base automaticamente selecionada |
| GOV-03 | Aprovar tabela RET-01–RET-09, guarda, exceções, bloqueio por obrigação e descarte de cópias | Controlador/gestão documental e responsável profissional | Política assinada, procedimento de suspensão e ensaio sintético | PENDENTE; não ativar purga clínica por conveniência |
| GOV-04 | Definir custodiante de chaves, recuperação, rotação e segregação; decidir vínculo criptográfico ao registro | Operação e segurança com responsável institucional | Desenho, backup/restauração e teste de troca entre registros | PENDENTE; AAD atual não contém IDs de clínica/paciente/registro |
| GOV-05 | Definir quem exporta, para qual destinatário/finalidade e como protege cópias locais | Responsável clínico e privacidade | Fluxo de entrega autenticada, registro de autorização e destino restrito | PENDENTE; arquivos baixados não ficam sob controle de retenção do servidor |
| GOV-06 | Aprovar concessões, supervisão, desligamento, acesso emergencial e revisão independente | Responsável profissional e administração autorizada | Matriz de ações revisada; revisão por pessoa distinta da implementação | PENDENTE; papel ADMIN não dá acesso clínico implícito |
| GOV-07 | Nomear coordenação de incidente, canal de titulares e substitutos, e acordar escalonamento | Controlador/encarregado ou canal aplicável e segurança | Contatos em registro restrito, procedimento aprovado e exercício | PENDENTE; não inventar nomes/canais nem enviar comunicação nesta etapa |
| GOV-08 | Definir participantes, dados de questionários/gravações, consentimento e situação ética aplicável | Pesquisador responsável, instituição/orientação e instância ética aplicável | Protocolo e aprovações/justificativas efetivas antes da coleta | PENDENTE; histórias fictícias não tornam anônimas as respostas de pessoas reais |
| GOV-09 | Inventariar terceiros, sincronização, dispositivos, provedores e transferências, incluindo configurações de IA | Instituição, operação e privacidade | Destinos, contratos/condições, regiões e limites documentados | PENDENTE; modo Claude só autorizado para ensaio sintético |
| GOV-10 | Decidir eventual mudança do contexto sintético para dados reais | Responsáveis institucional, profissional, privacidade e segurança | Gates aplicáveis, revisão técnica e decisão de contexto documentada | NÃO AUTORIZADA no estado atual |

O autor pode preparar a engenharia e o estudo; isso não o torna automaticamente controlador ou operador de uma clínica. A conta ADMIN, o autor de uma nota, o serviço FastAPI e o encarregado são papéis diferentes. Identidades e contatos efetivos devem ficar em registro restrito, com referência aqui apenas ao identificador da decisão.

## 2. Matriz proposta de responsabilidades

| Atividade | Quem executaria | Quem responderia pela decisão | Consulta necessária | Regra técnica atual |
| --- | --- | --- | --- | --- |
| Finalidade/base de tratamento real | Equipe de privacidade | Controlador a identificar | Jurídico e responsável profissional | Não concedida por um checkbox ou configuração |
| Cadastro de equipe e diretório | Administração da clínica | Gestão institucional autorizada | Responsável profissional | Escopo de clínica; sem leitura automática de narrativa |
| Conceder/revogar acesso clínico | Profissional autorizado; administração apenas no bootstrap previsto | Responsável pela equipe clínica | Privacidade/segurança para política | Grants explícitos; estagiário não escreve conteúdo clínico |
| Revisar nota/IA | Profissional com acesso ao paciente | Responsável profissional | Supervisão quando aplicável | Revisão de IA existente não equivale a assinatura final da nota |
| Backup, chaves e restauração | Operação autorizada | Responsável institucional | Segurança e gestão documental | Código de rotação existe; segregação/restore integral não homologados |
| Direitos do titular e incidente | Canal designado e equipe de resposta | Controlador a identificar | Encarregado/privacidade, jurídico e profissional | Nenhum canal real foi configurado por esta entrega |
| Dados da pesquisa | Pesquisador autorizado | Instituição/pesquisador conforme protocolo real | Orientação e instância ética aplicável | Sem coleta humana aprovada por este documento |

## 3. Finalidades e bases: ficha de decisão

| Atividade/fluxos | Finalidade delimitada | Minimização a justificar | Situação da base legal |
| --- | --- | --- | --- |
| Contas, grants e sessão (FL-01/FL-02) | Autenticação e autorização por clínica/paciente/ação | Identificação de equipe e informações necessárias ao vínculo | PENDENTE para cenário real; documentar hipótese aplicável |
| Agenda e prontuário (FL-02/FL-03) | Organização operacional e registro profissional | Narrativa e metadados necessários; evitar terceiros identificáveis sem necessidade | PENDENTE; saúde exige análise específica, não apenas consentimento genérico |
| IA/derivados (FL-04/FL-05) | Apoio documental rastreável com revisão humana | Contexto autorizado mínimo; fonte/versionamento; sem decisão autônoma | PENDENTE; finalidade assistiva não legitima qualquer compartilhamento |
| Auditoria/segurança (FL-06) | Rastrear ações e investigar usos indevidos | IDs, ação e metadados permitidos; sem texto livre clínico | PENDENTE; definir necessidade, acesso e retenção |
| Exportação/backup (FL-07/FL-08) | Portabilidade autorizada e continuidade | Apenas escopo autorizado e cópias necessárias | PENDENTE; entrega a terceiro depende de avaliação própria |
| Pesquisa com pessoas (FL-09) | Avaliar tarefas/usabilidade conforme protocolo | Dados dos participantes separados do prontuário fictício | PENDENTE; justificar a atividade e a situação ética antes da coleta |

Referência para essa análise: [LGPD em versão atualizada na Câmara](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html), em especial arts. 5º, 7º, 11, 16, 18, 37, 38 e 46–48. A menção a artigos não seleciona uma hipótese legal para o projeto. O [guia da ANPD sobre fins acadêmicos/pesquisa](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-tratamento-de-dados-pessoais-para-fins-academicos-e-para-a-realizacao-de-estudos-e-pesquisas) é referência para GOV-08; não foi presumido que o TCC ou seu autor se enquadrem automaticamente como órgão de pesquisa.

## 4. Retenção: código existente versus política a aprovar

| ID | Conjunto/cópia | Comportamento comprovável no código | Decisão que falta |
| --- | --- | --- | --- |
| RET-01 | Contas, clínica, pacientes, vínculos e permissões | Diretório, status e soft-delete; exclusão de paciente pela API desabilitada; arquivar não elimina notas | Prazos por finalidade, desligamento e suspensão; não tratar soft-delete como descarte |
| RET-02 | Sessões/notas/histórico/IA/Vault/jobs | `CLINICAL_RETENTION_DAYS=0` impede o comando de purga. Valor positivo seleciona pacientes soft-deleted pelo tempo desde `deleted_at`; dry-run por padrão, `--apply` destrutivo | Prazo/documento profissional, hold legal, versões e derivados; a rotina não implementa seleção de prazo por classe nem prova limpeza de backups |
| RET-03 | Rascunhos no servidor | `expires_at` renovado por 30 dias a cada atualização; GET ignora expirados; remoção física exige `purge_expired_drafts` ou operação prevista | Aprovar esse prazo operacional e agendamento; 30 dias não é prazo legal de guarda de prontuário |
| RET-04 | Chave pública e evidência de assinatura | Chave pública/fingerprint e assinatura ficam no banco; privada não exportável no IndexedDB do navegador | Recuperação, desligamento, guarda e dispositivo compartilhado; apagar chave local pode impedir novas assinaturas, não apaga revisão histórica |
| RET-05 | Auditoria/cadeia e registros de incidente | Auditoria é append-only no PostgreSQL, sem rotina geral de expiração; eventos de purga mantêm UUID do paciente e contagens | Retenção por classe e acesso; não chamar o UUID de dado anônimo; registro de incidente tem avaliação normativa própria |
| RET-06 | Refresh tokens, blacklist e sessões de infraestrutura | Expiração JWT não significa eliminação da tabela; `OutstandingToken.token` é `TextField`; tabela de sessão instalada não prova uso no fluxo JWT | Descarte de tokens expirados e proteção de banco/backups; não executar limpeza sem planejamento |
| RET-07 | Downloads FHIR/Markdown e anexos recebidos | Resposta autorizada pode gerar conteúdo legível fora do servidor; base64 FHIR não é criptografia | Destinatário, entrega, cópias, prazo e descarte sob responsabilidade definida |
| RET-08 | Dumps, snapshots, mídia, `.env`, logs e artefatos de validação | Não há prova de backup/restore cifrado integral; CI local retém relatórios sintéticos e imagens para auditoria | Política de cópias e chaves, prazo de artefatos, restore e descarte coordenado; conferir sincronização/provedores |
| RET-09 | Dados de participantes de pesquisa | Não há coleta aprovada ou repositório de questionários/gravações implementado nesta entrega | Plano do estudo, custódia, acesso, prazo e descarte próprios antes de coletar |

Não se altera prazo, scheduler, banco ou rotina de purga nesta tarefa. O prazo de 365 dias em teste sintético é parâmetro de fixture, não política recomendada. As regras finais de retenção precisam ser compatíveis com obrigações profissionais e legais verificadas por responsáveis competentes.

## 5. Solicitações de titulares: roteiro para aprovar

1. Receber no canal GOV-07, gerar identificador e validar identidade de modo proporcional por equipe designada; não registrar documentos completos ou narrativa no Git/log de suporte.
2. Classificar solicitação e finalidade: informação, acesso, correção, exportação, bloqueio/eliminação ou revisão pertinente. Levantar registros/derivados/cópias e autorizações sem conceder acesso clínico ao administrador por conveniência.
3. Encaminhar ao responsável da decisão; verificar deveres de guarda e efeitos sobre terceiros. Retificação preserva origem/histórico; pedido de eliminação não é ordem automática para `--apply`.
4. Registrar decisão fundamentada e comunicação em canal restrito, com evidência mínima e prazos aplicáveis confirmados. Acompanhar a execução em cópias e derivados sob controle da instituição.

Esse roteiro não cria API, portal, canal de atendimento ou assinatura final de nota.

## 6. Incidente: roteiro operacional em revisão

**Gatilhos:** acesso cruzado, credencial exposta, exportação ao destinatário errado, perda de dispositivo, falha de integridade ou envio de conteúdo a destino não autorizado. Falha explícita de modelo sem exposição não é automaticamente incidente comunicável.

1. Registrar ciência, horário/fuso, serviço/versão e identificador do caso em canal restrito. Preservar evidências minimizadas; não publicar tokens, prontuários ou dumps em issue/chat.
2. Coordenador a designar aciona operação e responsável institucional. Conter a exposição preservando evidências e continuidade: suspender rotas/credenciais afetadas conforme autorização operacional. Não apagar logs ou rotacionar a chave HMAC sem plano que preserve verificação histórica.
3. Levantar categorias/quantidade de dados e titulares possivelmente afetados, escopo entre clínicas, duração, destinatários, chaves e cópias; distinguir confirmado de hipótese. Privacidade e responsável profissional avaliam os efeitos.
4. Operador informa controlador sem demora injustificada; o controlador decide comunicação e documenta a avaliação. A [orientação da ANPD para incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis) informa prazo geral de três dias úteis para comunicações devidas, com ressalva de legislação específica. Enquadramento, termo inicial e eventuais regras diferenciadas devem ser confirmados, sem aguardar uma investigação completa para iniciar o encaminhamento.
5. Corrigir causa, verificar contenção, restaurar de cópia validada quando necessário e reexecutar autorização/integridade; obter decisão responsável de retomada. Registrar acompanhamento, medidas e revisão posterior em armazenamento restrito.

**Exercício a executar após designação dos responsáveis:** INC-SINT-01, exportação fictícia ao destinatário errado. Usar só identificadores e texto sintéticos; ensaiar ciência, preservação, avaliação, decisão e retomada, sem notificar titulares/ANPD ou terceiros reais. Esta entrega prepara o roteiro; não afirma que esse exercício foi realizado. A ANPD informa guarda do registro de incidentes por pelo menos cinco anos no RCIS; confirmar aplicação em RET-05. O `AuditLog` técnico não substitui automaticamente esse registro de avaliação/decisão, conforme [ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca).

## 7. Terceiros, destinos e limites técnicos

- Padrão do produto: Django → FastAPI → Ollama local. URLs de serviço são configuráveis; isso não constitui allowlist de destino. Inventariar hosts reais antes da implantação.
- `AI_ENGINE=claude-cli` tem autorização restrita a ensaio declarado sintético; é processamento externo, mesmo usando CLI local. A flag não verifica semanticamente que o texto é fictício. Não autoriza enviar dados clínicos reais.
- O workspace informado está em caminho sob OneDrive. Isso **não comprova sincronização ativa**; confirmar se repositório, `.env`, relatórios ou downloads são copiados, para quais contas/regiões e com quais controles. Não inferir que o conteúdo do volume Docker acompanha a pasta do repositório.
- GitHub armazena código/fixtures; Docker/registries e npm/PyPI distribuem dependências; não se presume envio de prontuários a esses serviços pelo pipeline. Logs/artefatos só devem conter os dados sintéticos previstos, com revisão antes de compartilhar.
- Browser: access token em memória, refresh HttpOnly/Secure, chave privada no IndexedDB e possíveis rascunhos legados de versões antigas até migração/remoção. Isso exige governança do dispositivo; XSS pode usar a sessão/chave mesmo sem exportar a chave privada.

## 8. Referências normativas e grau de confirmação

Consulta em 17/11/2026. Registrar novas verificações antes de alegações finais ou mudança de contexto.

| Referência primária | O que foi confirmado | Limite desta consulta |
| --- | --- | --- |
| [LGPD atualizada — Câmara](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html) | Texto legal disponível para analisar finalidades, saúde, agentes, direitos e segurança | Não define sozinha a hipótese legal de uma instituição não identificada |
| [ANPD — índice de regulamentações](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/) | Resoluções 15/2024 (incidentes) e 18/2024 (encarregado) listadas como vigentes | Aplicação/exceções dependem do contexto; indicação de encarregado não é autorização para tratamento |
| [ANPD — RIPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd) | Orientação identifica o controlador como responsável pela elaboração do RIPD | Este pacote permanece subsídio técnico em revisão, sem aprovação institucional |
| [CFP — registro documental 001/2009, PDF original](https://site.cfp.org.br/wp-content/uploads/2009/04/resolucao2009_01.pdf) | Original localizado no domínio oficial; referência histórica de guarda documental | Situação consolidada/alterações ainda requer confirmação; portal de resoluções retornou erro nesta consulta. Não fixado prazo clínico com base apenas no PDF antigo |
| [CFP — posicionamento sobre IA, 2025](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/) | Nota oficial com supervisão crítica e responsabilidade profissional | Não foi tratada como aprovação do produto ou norma específica da arquitetura |

CFP 09/2024, mencionado no projeto, trata de TDICs, conforme [orientação do CRPRS](https://www.crprs.org.br/noticias/fique-atenta-o-a-nova-resolucao-para-atendimento-on-line); não é usado aqui como proibição específica de diagnóstico por IA. Não se substituem normas de Psicologia por normas do CFM ou por material de terceiros. A consulta não prova ausência de alterações normativas posteriores não localizadas.

## 9. Como registrar revisão humana sem fabricar aprovação

Para cada GOV, registrar em documento restrito: contexto, decisão, justificativa, responsável competente, data, evidência/parecer, condições e prazo de revisão. No repositório, guardar apenas referência não sensível e estado. Nenhuma linha PENDENTE deve virar APROVADO por execução de teste, preenchimento automático ou ausência de resposta.

O pacote técnico pode ser revisado agora. Antes de mudar o contexto para pacientes reais ou coleta humana, as decisões correspondentes e gates devem existir efetivamente. Nenhum dado real é necessário para concluir os testes e a documentação técnica desta etapa.
