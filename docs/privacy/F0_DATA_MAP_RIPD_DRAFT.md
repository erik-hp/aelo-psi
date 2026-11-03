# F0-06 — Inventário inicial dos dados e riscos de privacidade (RIPD: rascunho)

**Estado:** rascunho técnico de Design Science Research; **não** é RIPD validado, aprovação jurídica, parecer do CFP nem autorização de tratamento real.  
**Data:** 17/10/2026. **Escopo:** módulos presentes na `main` após o PR #2 e arquitetura pretendida MTLI; distinguir implementação de proposta. Somente dados **sintéticos** devem ser utilizados no desenvolvimento atual.

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

| Fonte → destino | Conteúdo | Proteção existente | Lacunas/gates |
| --- | --- | --- | --- |
| Navegador → API Django | Identidade, senha/token, cadastro, notas, agenda | JWT, auth no servidor, escopo por paciente, HTTPS a configurar | Token JWT em storage de sessão ainda é acessível em XSS; política CSP e cookies HttpOnly avaliar |
| Django → PostgreSQL | Dados de usuários, pacientes, sessões, notas, versões | Banco relacional; permissão aplicada no ORM de APIs | **Notas em plaintext**, backup cifrado e chaves pendentes ADR-002 |
| Django → FastAPI → Ollama | Identificadores e trechos desidentificados para síntese | Serviço local, token interno, checagem de fonte | NER não comprovado; contexto narrativo ainda identificável; avaliação de prompt injection pendente |
| Django → AuditLog | Quem consultou/alterou qual objeto, horário/IP | Metadados por allowlist e eventos READ/LIST | Integridade contra alteração, retenção, segregação e exportações pendentes |
| Browser → interfaces gráficas | Gráficos/indicadores e sínteses | Métricas simuladas removidas do modo API | Resultados por IA não são diagnóstico; UX de incerteza e validação pendentes |
| Memória MTLI futura | Chunks, embeddings, vínculos, snapshots | ADR-001 proposta | **Não implementada**: requer G0/G1, segurança e consentimentos/bases aplicáveis |

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
| PRIV-02 | Leitura direta do banco/backup | Exposição de narrativa | Envelope encryption, segredo KMS/Vault, restauração | Pendente F1 |
| PRIV-03 | Prompt ou embedding reidentificável | Identificação indireta | Minimização, avaliação de NER/contexto e retenção | Pendente F2 |
| PRIV-04 | Token exfiltrado por XSS | Acesso indevido | Sessão curta, CSP, sanitização, política de cookies segura | Parcial |
| PRIV-05 | Log conter narrativa inadvertidamente | Vazamento secundário | Allowlist, revisão automática, retenção e controle de consulta | Parcial |
| PRIV-06 | IA apresentar inferência sem base | Erro interpretativo | Trecho citado + revisão humana + avaliação semântica | Parcial |
| PRIV-07 | Erro de backup/restore/retificação | Perda de histórico | Migrações aditivas, restauração ensaiada, versionamento | Pendente |
| PRIV-08 | Compartilhamento indevido de dados da pesquisa | Risco aos participantes | Governança CEP quando exigível, TCLE, minimização | Pendente F6 |

**Classificação:** a matriz ainda precisa de escalas consistentes de probabilidade/impacto, inventário completo de terceiros, critérios de necessidade/proporcionalidade e responsável por tratamento. Não preencher scores fictícios.

## 5. Retenção, direitos e incidentes — decisões abertas

Definir prazos e exceções considerando sigilo, regras do CFP e obrigações documentais, com validação jurídica. Preservar registros profissionais obrigatórios e assegurar retificação sem sobrescrita indevida. Documentar solicitação de acesso/retificação, resposta a titulares, procedimento de incidente com comunicação quando exigida e restauração auditável.

**Próximas ações:** atribuir responsáveis por controle/operador; revisão jurídica de base/finalidade; inventário de todos os campos e exportações; análise de terceiros/infra, ameaças e RTO/RPO; avaliação das exigências éticas de pesquisa. Não inserir pessoas identificáveis neste documento.

## 6. Referências

- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — Relatório de Impacto à Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd)
- [CFP — Posicionamento de IA e Psicologia (2025)](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/)
- [Plano Mestre](../PLANO_MESTRE_IMPLEMENTACAO.md) e [ADR-002](../architecture/ADR-002-criptografia-prontuarios.md)
