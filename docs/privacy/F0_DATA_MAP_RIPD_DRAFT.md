# F0-06 — Inventário dos dados e riscos de privacidade (RIPD: rascunho)

**Estado:** rascunho técnico de Design Science Research; **não** é RIPD validado, aprovação jurídica, parecer do CFP nem autorização de tratamento real.  
**Data inicial:** 17/10/2026. **Revisão técnica:** 17/11/2026, base `86050fa`, branch `validation/f0-area1-tls`. **Escopo:** schema declarado, código de armazenamento/saídas e evidências sintéticas; distinguir implementação de aceite integral. Somente dados **sintéticos** devem ser utilizados no desenvolvimento atual. A atualização não atribui responsáveis nem valida bases legais. Decisões GOV-01–GOV-10, retenção RET-01–RET-09 e roteiros estão no [pacote de governança](F0_GOVERNANCE_DECISIONS.md).

## 0. Inventário reproduzível e limites

[DATA_INVENTORY.json](../../Backend/docs/privacy/DATA_INVENTORY.json) registra **28 modelos (21 de domínio e 7 de infraestrutura), 235 campos declarados**, tipos, relações e proteção de campo. Há 21 campos de criptografia AES-GCM; um campo vetorial, um blob de sessão e o token de infraestrutura são explicitamente identificados como não protegidos por essa criptografia de campo. Senha é hash, não criptografia reversível. Os demais identificadores/metadados também não devem ser considerados anônimos por não serem narrativas.

Isso descreve metadados dos modelos, não a quantidade de registros nem o schema efetivamente implantado. Tabela instalada não prova uso/povoamento. Relações many-to-many incluem o nome da tabela de junção; não se trata de auditoria do conteúdo das tabelas ou da autorização de cada endpoint.

O gerador carrega settings isolados e proíbe abertura de conexão de banco. Comando na raiz: `Backend/.venv/Scripts/python.exe Backend/scripts/audit_data_inventory.py --check`. Para atualização revisada: substituir `--check` por `--write`; ele grava somente o arquivo fixo no repositório. Alteração de schema ou novo modelo sem classificação faz a checagem falhar. Isso não aprova bases legais, retenção ou novas saídas de rede; esses pontos continuam em revisão humana.

## 1. Objetivo e atores

O AELO-PSI apoia a administração e documentação assistida de psicoterapia; o profissional mantém controle das decisões. Antes do uso real, determinar documentalmente quem é **controlador** (clínica/instituição conforme relação real), **operadores**, responsável pelas decisões de tratamento, encarregado/canal do titular e eventual papel da universidade na pesquisa. Esta tabela não estabelece vínculo jurídico automaticamente.

| Ator | Acesso pretendido | Restrições |
| --- | --- | --- |
| Psicólogo autorizado | Registro e revisão clínica do paciente designado | Autorização individual, auditável, com sigilo |
| Estagiário autorizado | Consulta limitada sob regras de supervisão | Edição clínica suspensa até workflow de supervisão |
| Administração clínica | Cadastro operacional e equipe | Sem acesso automático à narrativa terapêutica |
| Serviço de IA | Contexto mínimo da nota autorizado pelo Django | Sem conta interativa, autenticação interna; nada de decisão autônoma |
| Equipe de operação | Infraestrutura e continuidade | Sem leitura por padrão de notas brutas; gestão de chaves segregada |
| Participante de estudo de usabilidade | Tarefas e questionários | Usar histórias sintéticas; proteger dados próprios da pesquisa |

## 2. Fluxos de dados

| ID / fonte → destino | Conteúdo e finalidade | Proteção existente / fonte no código | Lacunas / decisões |
| --- | --- | --- | --- |
| FL-01 Navegador ↔ autenticação/API | Credenciais, access token, cookie refresh, respostas e cache em memória | `authStorage.ts`, `authentication/views.py`: access em memória, refresh HttpOnly/Secure/SameSite Strict, origem, rotação/blacklist; CSP/HTTPS exercitados | XSS/dispositivo compartilhado; chave privada no IndexedDB; banco mantém `OutstandingToken.token` em TextField; GOV-06/RET-06 |
| FL-02 Django ↔ DB operacional | Usuários, clínica, código/nome do paciente, grants e agenda | `patients/access.py`, modelos de usuários/clínicas/pacientes: escopo de servidor e grants explícitos | Identificadores, vínculos e horários não cifrados por campo; GOV-01/GOV-02/RET-01 |
| FL-03 Django ↔ DB clínico | Notas, histórico, resumos e rascunhos | `encrypted_fields.py`, modelos e migrações: AES-GCM, rascunho cifrado, checks de autoria/versionamento | AAD atual é modelo/campo, sem IDs de clínica/paciente/registro; chaves no ambiente; assinatura final da nota pendente; GOV-03/GOV-04/RET-02/RET-03 |
| FL-04 Django → FastAPI → motor IA | Contexto mínimo autorizado, texto preparado, referências; síntese/extração | `services/ai/client.py`, `ai_service/main.py`: token interno e checagem de fontes; padrão Ollama local; logs de falha por tipo | Redes internas HTTP não equivalem a TLS ponta a ponta; URLs configuráveis; motor Claude externo restrito a ensaio declarado sintético; NER/semântica não homologados; GOV-02/GOV-09 |
| FL-05 DB/IA → memória e telas | Análises, métricas textuais, fontes, nós, relações, checkpoints, jobs | `ai_analysis/models.py`: campos narrativos cifrados; referências e revisão parciais | Vetor, escores, relações/contagens/tempos e fingerprints não têm a mesma proteção; derivados continuam sensíveis/linkáveis; G2/G3/G4 não liberados |
| FL-06 API → auditoria/processo | Ações, IDs, ator, horário/IP e erros operacionais | `audit_logs/services.py`: allowlist, User-Agent descartado; cadeia HMAC e triggers; detalhes clínicos fora dos metadados permitidos | Logs de processo/suporte, cobertura integral e retenção precisam de revisão; purga mantém UUID do paciente; eventos sem user não aparecem na listagem administrativa por clínica; GOV-07/RET-05 |
| FL-07 API → arquivos do destinatário | FHIR do paciente e Markdown de checkpoint | `patients/fhir.py`, `clinicalService.ts`: acesso autorizado, no-store e revisão exigida no download de checkpoint | Conteúdo exportado legível; base64 não cifra; não há eliminação remota das cópias baixadas; GOV-05/RET-07 |
| FL-08 Operação/CI → cópias, chaves e artefatos | Volumes DB, `.env`, imagens, dumps futuros, relatórios e código | Exclusões Docker; CI local arquiva apenas commit e gera dados sintéticos | Backup/restore cifrado e retenção de artefatos não homologados; verificar sincronização de pasta sob OneDrive sem presumir que esteja ativa; GOV-04/GOV-09/RET-08 |
| FL-09 Participantes → pesquisa (planejado) | SUS/UMUX-Lite, observação e eventual gravação/perfil | Protocolo previsto em F6; nenhuma coleta humana aprovada nesta entrega | Dados reais do participante são diferentes da história clínica fictícia; finalidade, custódia e situação ética pendentes; GOV-08/RET-09 |

Novas gravações do editor usam rascunho no servidor; versões antigas podem deixar texto em localStorage até o fluxo de importação/remoção. `NarrativeEditor.tsx` remove o legado após escolha de importar ou descartar e em recusas de acesso previstas; não houve inspeção do perfil real do navegador nesta entrega. A chave privada de revisão é não exportável via WebCrypto, mas isso não impede uso abusivo por script executado na mesma origem.

## 3. Categorias e finalidades a confirmar

- **Identificação de equipe:** conta, login, clínica, papel, habilitação profissional; autenticação, segregação e gestão operacional.
- **Dados operacionais do paciente:** identificador interno, nome exibido, clínica, agendamentos; cuidado administrativo.
- **Dados clínicos sensíveis:** narrativas, resumos, fontes, análises derivadas; documentação e apoio profissional (não diagnósticos autônomos).
- **Metadados de segurança:** IDs de objetos, usuário, ação, IP de conexão e dispositivo; detecção/resposta a incidentes, prestação de contas.
- **Dados de pesquisa:** respostas SUS/UMUX-Lite, observações de tarefas, perfis de participantes; estudo acadêmico separado das finalidades clínicas.

Registrar base legal concreta por atividade e art. 11 da LGPD para dados sensíveis com orientação especializada. Uma pesquisa acadêmica não confere automaticamente permissão de usar dados de saúde reais.

## 4. Matriz inicial de riscos

| ID | Evento adverso | Consequência | Tratamento exigido | Estado |
| --- | --- | --- | --- | --- |
| PRIV-01 | Leitura cruzada de pacientes ou clínicas | Violação de sigilo | Teste BOLA/IDOR, grant por paciente, revisão independente | Parcial |
| PRIV-02 | Leitura direta do banco/backup | Exposição de narrativa | Campos cifrados existentes; falta consolidar segregação de chaves, proteção dos demais dados e restauração | Parcial; F1/F5 em revisão |
| PRIV-03 | Prompt ou embedding reidentificável | Identificação indireta | Minimização, avaliação de NER/contexto e retenção | Pendente F2 |
| PRIV-04 | Token exfiltrado por XSS | Acesso indevido | Sessão curta, CSP, sanitização, política de cookies segura | Parcial |
| PRIV-05 | Log conter narrativa inadvertidamente | Vazamento secundário | Allowlist, revisão automática, retenção e controle de consulta | Parcial |
| PRIV-06 | IA apresentar inferência sem base | Erro interpretativo | Trecho citado + revisão humana + avaliação semântica | Parcial |
| PRIV-07 | Erro de backup/restore/retificação | Perda de histórico | Migrações aditivas, restauração ensaiada, versionamento | Pendente |
| PRIV-08 | Compartilhamento indevido de dados da pesquisa | Risco aos participantes | Governança CEP quando exigível, TCLE, minimização | Pendente F6 |
| PRIV-09 | Leitura de refresh token no banco/cópia | Uso indevido de sessão enquanto válida | Proteger credenciais/backups e planejar descarte de expirados; cookie HttpOnly não protege a tabela | Pendente GOV-06/RET-06 |
| PRIV-10 | Substituição de ciphertext entre registros do mesmo campo | Perda de vínculo/integridade do conteúdo | AAD atual não inclui IDs; decidir desenho e testar vínculo na F1-04 | Inspeção estática; exploração não executada |
| PRIV-11 | Download ou entrega a destinatário indevido | Cópia fora dos controles do servidor | Política de exportação, canal/destino e retenção do destinatário | Pendente GOV-05 |
| PRIV-12 | Cópia/sincronização ou destino IA não inventariado | Exposição a terceiro não autorizado | Confirmar hosts/provedores/configurações e sincronização; não enviar dados reais ao motor de teste | Pendente GOV-09; transferência real não presumida |

**Classificação:** riscos acima são de segurança/privacidade, não escores clínicos de pacientes. Probabilidade e risco residual quantitativos não foram medidos. A matriz precisa de avaliação contextual de impacto, terceiros, necessidade/proporcionalidade e responsável pelo tratamento. Não preencher scores fictícios nem interpretar cenário não explorado como vazamento comprovado.

## 5. Retenção, direitos e incidentes — decisões abertas

As decisões estão concretizadas para revisão em [GOV-01–GOV-10 e RET-01–RET-09](F0_GOVERNANCE_DECISIONS.md), incluindo responsáveis por função, evidências de fechamento, roteiro de titulares e procedimento de incidente. Isso não altera prazos nem ativa purgas. Preservar registros profissionais obrigatórios e assegurar retificação sem sobrescrita indevida.

**Próximas ações humanas:** identificar agentes/responsáveis efetivos; revisar finalidades/bases, tabela de retenção e situações de guarda/suspensão; validar terceiros, canais de titulares/incidente e situação ética do estudo. **Próximas verificações técnicas:** revisão independente F0-02, critério G0 e planos de chaves/backup/restore e integridade F1/F5. Não inserir dados de pacientes ou contatos pessoais neste documento.

## 6. Referências

- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Relatório de Impacto à Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd)
- [CFP — Posicionamento de IA e Psicologia (2025)](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/)
- [Plano Mestre](../PLANO_MESTRE_IMPLEMENTACAO.md) e [ADR-002](../architecture/ADR-002-criptografia-prontuarios.md)
- [Consulta normativa, responsáveis e limites](F0_GOVERNANCE_DECISIONS.md#8-referências-normativas-e-grau-de-confirmação), realizada em 17/11/2026; situação consolidada do CFP 001/2009 ainda pendente, sem afirmação de vigência final.
