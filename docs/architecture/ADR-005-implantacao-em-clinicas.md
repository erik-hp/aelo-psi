# ADR-005 — Implantação em clínicas: programa instalado e servidor interno

**Status:** proposta. O público-alvo (clínicas) foi definido pelo autor em 07/11/2026; a arquitetura aguarda decisão do autor e do orientador.
**Data:** 07/11/2026.
**Relaciona-se a:** RF-01, RNF-01, RNF-02, RNF-03, ADR-002, ADR-004, F5-03. **G0 continua BLOQUEADO.**

> Nada desta ADR foi implementado. Nenhum controle aqui descrito existe hoje, salvo quando indicado, e a escolha não garante conformidade com a LGPD ou com normas do CFP.

## Contexto

O autor avalia que uma plataforma web seria mal recebida por clínicas, por receio de segurança, e quer mais controle interno, inclusive diante de vírus nos computadores dos profissionais. Essa recepção ainda é hipótese: precisa ser ouvida de psicólogos.

O público são clínicas com equipe: vários profissionais, grants por paciente, administração sem acesso clínico e auditoria. O prontuário precisa ser compartilhado com controle de acesso, o que exige um ponto central de autorização.

## Modelo de ameaças

| Ameaça | Situação com esta decisão |
| --- | --- |
| Ataque pela internet | **Reduzida:** o sistema deixa de ser público |
| Terceiro de nuvem | **Reduzida:** dados ficam no servidor da clínica |
| Vírus em um computador | **Limitada, não eliminada:** alcança o que aquela conta abre, sem acesso direto ao banco |
| Ransomware em um computador | **Limitada:** o banco fica fora da estação; depende de backup isolado |
| Notebook roubado | **Reduzida:** nenhum prontuário guardado na estação |
| Invasão do servidor da clínica | **Risco concentrado:** é o ativo mais crítico |
| Administrador de TI ou interno mal-intencionado | **Permanece:** exige separação de chaves e auditoria |
| Vírus com privilégio de administrador | **Permanece:** captura tela e digitação do que for aberto |
| Falha ou perda do servidor | **Nova responsabilidade da clínica:** sem operador externo |

## Decisão proposta

1. **Dados, autorização, chaves e IA ficam só no servidor interno da clínica.** Django, PostgreSQL/pgvector, worker, serviço de IA e Ollama permanecem como núcleo.
2. **O programa instalado é apenas cliente:** reaproveita a interface React e não grava prontuário em disco, nem cache clínico.
3. **Sem exposição à internet.** Acesso pela rede interna; acesso remoto, se existir, por VPN da clínica.
4. **TLS interno e identidade do servidor verificada pelo cliente.**
5. **Sem envio de conteúdo clínico a terceiros,** como já define a ADR-004.
6. **O núcleo não será reescrito.** Trocar a linguagem não traz ganho de segurança; o ganho vem de onde dados e chaves ficam.

### Tecnologia do programa

Tauri é a candidata inicial, por empacotar a interface existente com instalador menor; Electron é a alternativa. A escolha depende de teste em Windows, atualização assinada e compatibilidade com a CSP. Enquanto isso, a mesma interface segue utilizável em navegador na rede interna.

## Controles necessários

| Controle | Objetivo | Estado atual |
| --- | --- | --- |
| Login com chave física FIDO2/WebAuthn | Dificultar roubo de senha e de sessão | Não existe |
| Sessões curtas e bloqueio por inatividade | Reduzir janela de uso indevido | Parcial: token curto, sem bloqueio |
| Alerta de acesso em massa | Detectar conta comprometida | Não existe; a auditoria fornece a base |
| Limite de leituras por sessão | Reduzir volume exposto | Não existe |
| Chaves fora do banco e do disco de dados | Proteger cópias e backups | Parcial: chaves em ambiente; falta cofre ou módulo de hardware |
| Backup cifrado, isolado e com restauração testada | Resistir a ransomware e perda | Não existe; pendente em F5-03 |
| Atualização assinada do programa | Evitar instalador adulterado | Não existe |
| Guia de endurecimento da estação | Antivírus, disco cifrado, usuário sem administrador | Não existe |
| Criptografia em repouso e auditoria encadeada | Proteger banco e histórico | Implementadas; ver ADR-002 e registro |

## Alternativas

| Alternativa | Avaliação |
| --- | --- |
| Programa totalmente local em cada computador | Rejeitada para clínicas: sem prontuário compartilhado, com dados e chaves em cada estação |
| Reescrever o núcleo em outra tecnologia | Rejeitada: alto custo, sem ganho de segurança próprio |
| Web em nuvem de terceiros | Rejeitada: é a objeção que motivou esta ADR, e conflita com a ADR-004 |
| Web apenas na rede interna, sem programa | **Etapa intermediária aceitável:** mesma proteção de dados; falta medir a aceitação |

## Consequências

**Positivas:** retira o sistema da internet, mantém o trabalho já feito e torna a segurança explicável à clínica: os dados não saem dela.

**Negativas:** cada clínica precisa de um servidor, de energia e rede confiáveis e de alguém responsável por atualização, backup e incidentes. O servidor precisa de capacidade para IA local: em CPU, `llama3.1` levou cerca de 43 s por nota em teste sintético e não atingiu qualidade suficiente. A clínica assume deveres de controlador que um fornecedor de nuvem poderia apoiar. Atualizar várias instalações é mais difícil que atualizar um site.

## Próximos passos

1. Ouvir psicólogos e gestores de clínica: o que preocupa, e quem cuidaria do servidor.
2. Conversar com o orientador sobre o impacto no título e no escopo do TCC2, que hoje citam plataforma web.
3. Definir o perfil mínimo do servidor junto da escolha do modelo local.
4. Provar o conceito: servidor na rede interna com TLS, e um instalador Windows do cliente.
5. Decidir a ordem dos controles depois de G0.

## Critérios para aprovar

- Recepção validada com público real.
- Decisão registrada do autor e do orientador.
- Prova de conceito funcionando com dados sintéticos.
- Responsável por operação e backup definido no modelo de implantação.
