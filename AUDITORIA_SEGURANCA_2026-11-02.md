# Auditoria de código e segurança — AELO / TCC

> **Registro anterior à refatoração:** parte dos achados abaixo foi tratada em `REFATORACAO_2026-11-02.md`. Consulte esse documento para o estado atual e as pendências.

**Data:** 2026-11-02. **Escopo:** código de `Backend/` e `Frontend/` (186 arquivos listados), configuração de execução, dependências, autenticação, autorização, dados clínicos, IA e trilhas de auditoria. A referência de requisitos é `1 - TCC/wiki/tcc/projeto-completo.md`, especialmente RF02–RF05 e RNF01–RNF04. A análise foi estática; não houve teste de intrusão em serviço implantado nem acesso a dados reais.

## Resultado executivo

O protótipo **não está pronto para receber prontuários reais nem para ser exposto em rede**. Há credenciais padrão, configuração local insegura, serviço de IA sem autenticação exposto pelo Compose, falhas de autorização para alteração de registros clínicos e ausência dos controles de sigilo e rastreabilidade previstos no TCC. A severidade considera o impacto potencial sobre dados de saúde; a exploração em uma instalação concreta depende de sua configuração de rede e de usuários.

## Achados prioritários

| ID | Severidade | Evidência e impacto | Correção recomendada |
|---|---|---|---|
| S01 | **Crítica** | `Backend/apps/clinics/management/commands/seed_initial_data.py:16-28` cria superusuário `admin` com senha fixa, e `Backend/docker-compose.yml:24` executa o seed na inicialização da API. `Frontend/src/components/forms/LoginForm.tsx:24` preenche a mesma senha. Qualquer instalação nova com essa configuração pode permitir tomada completa do sistema. | Remover o seed do caminho de inicialização, exigir senha aleatória única via provisionamento seguro, eliminar senha da interface e trocar credenciais das instâncias já iniciadas. |
| S02 | **Crítica** | `Backend/ai_service/main.py:89-96` aceita `POST /analysis` sem autenticação, tamanho máximo de entrada ou limitação de chamadas. `Backend/docker-compose.yml:35-36` publica a porta 8001 em todas as interfaces; `Backend/docker-compose.yml:42-43` também publica o Ollama. Um cliente com acesso à porta pode enviar texto diretamente ao modelo, contornar o controle de acesso/auditoria da API e consumir recursos. | Não publicar IA/Ollama no host; restringir a rede interna e autenticar a chamada entre serviços. Impor limites de corpo, contexto, tempo e concorrência. |
| S03 | **Alta** | `Backend/.env` local contém `DJANGO_DEBUG=True`, `DJANGO_SECRET_KEY` de exemplo de 9 caracteres e senha padrão `aelo` para PostgreSQL (valores sensíveis não reproduzidos aqui). `Backend/config/settings.py:7,70` mantém defaults inseguros; `Backend/docker-compose.yml:9` publica o banco na porta 5432. O arquivo `.env` está ignorado pelo Git, mas a instalação local está insegura. | Falhar na inicialização se segredo/senha não forem fortes; desligar debug, trocar segredos e senha do banco, limitar porta do banco ao loopback ou à rede interna. |
| S04 | **Alta** | `Backend/apps/therapy_sessions/views.py:12-28` usa apenas acesso de leitura ao paciente no queryset para autorizar `PATCH/PUT/DELETE` de sessões. `Backend/apps/clinical_notes/views.py:14-29,31-52` permite criar, alterar e apagar notas a qualquer usuário com `PatientAccess`, mesmo se `can_edit=False`; o serializer devolve `raw_text` (`Backend/apps/clinical_notes/serializers.py:7-21`). Um estagiário com acesso somente de leitura pode modificar ou excluir registros clínicos. | Aplicar autorização por ação a cada recurso, verificando `can_edit`, papel, clínica e vínculo profissional. Usar a mesma política em listagem, criação, alteração e exclusão. |
| S05 | **Alta** | `Backend/apps/patients/permissions.py:21` retorna verdadeiro para qualquer psicólogo da clínica ao editar paciente obtido por grant, mesmo com `can_edit=False`. A função de `PatientAccess.can_edit` fica sem efeito para esse papel. | Exigir grant de edição ou autoria, com regra explícita e testada. |
| S06 | **Alta** | `Backend/apps/clinical_notes/views.py:40-47` recalcula a anonimização com identificadores do paciente antigo, enquanto `ClinicalNoteSerializer` aceita mudança de `patient` (`Backend/apps/clinical_notes/serializers.py:9-21`). Em uma atualização que troca o paciente, o texto pode ficar associado ao prontuário errado e ainda conter o nome do novo paciente. | Tornar a associação paciente/nota imutável ou validar a mudança e anonimizar com o paciente final dentro de uma transação. |
| S07 | **Alta** | `Frontend/src/components/forms/NarrativeEditor.tsx:33-35` grava nota clínica em `localStorage` sem criptografia nem expiração. `Frontend/src/services/authStorage.ts:8-11` guarda refresh token no mesmo armazenamento, acessível a JavaScript da origem. Um script executado nessa origem pode ler notas e token. | Não persistir texto clínico em armazenamento do navegador; usar rascunhos no servidor com controle de acesso. Preferir refresh token em cookie `HttpOnly`, `Secure` e `SameSite`, com proteção CSRF apropriada. |
| S08 | **Alta** | `Backend/services/security/anonymization.py:4-20` usa regex para email, CPF, telefone e o nome/código exatos do paciente. Não cobre outros nomes, endereços, datas, locais ou variantes. `Backend/apps/ai_analysis/services.py:16-26` envia esse texto ao serviço de IA. A promessa do TCC de remoção de PII via NER e taxa de anonimização não está implementada. | Tratar como pseudonimização parcial; criar testes com corpus sintético de PII, incorporar detector adequado e bloquear o envio quando a checagem falhar. |
| S09 | **Alta** | `Backend/apps/audit_logs/middleware.py:1-7` é um pass-through; só há logs explícitos para algumas mutações e login. Leituras de prontuário, sessões e análises não são registradas. `Backend/apps/audit_logs/models.py:6-21` usa tabela comum sem garantia de imutabilidade; o admin não impede exclusão. A trilha de todos os acessos exigida por RNF02 não existe. | Auditar leituras e exportações sensíveis, preservar ator/objetivo/entidade e armazenar em mecanismo append-only ou com integridade verificável e retenção controlada. |
| S10 | **Alta** | `Backend/config/settings.py:138-141` confia em `X-Forwarded-Proto` sem configuração de proxy confiável e não habilita redirecionamento HTTPS, HSTS, `SESSION_COOKIE_SECURE` nem `CSRF_COOKIE_SECURE`. `Frontend/.env.example:1` usa HTTP. `manage.py check --deploy` emitiu W004, W008, W009, W012 e W016. | Terminar TLS num proxy controlado, restringir cabeçalhos encaminhados e configurar os parâmetros de produção. Não encaminhar dados clínicos em HTTP. |
| S11 | **Média** | `Backend/apps/ai_analysis/views.py:67-87` permite que um psicólogo ou admin valide/rejeite repetidamente a mesma análise sem exigir estado pendente, vínculo de responsabilidade, justificativa ou assinatura. `HumanValidation` registra somente usuário e decisão. RF05 exige revisão e assinatura digital, que não está implementada. | Exigir transição única de estado, identidade clínica autorizada, registro de aceite e assinatura verificável; preservar versões e justificativa. |
| S12 | **Média** | `Backend/ai_service/main.py:90-96` retorna uma análise genérica quando Ollama falha. `Backend/apps/ai_analysis/services.py:30-69` persiste a resposta como análise pendente normal, sem estado de erro. Isso pode apresentar um resultado de fallback como se fosse análise baseada no histórico. | Retornar falha explícita e não criar análise clínica quando o modelo não respondeu; registrar causa técnica separadamente. |
| S13 | **Média** | `Frontend/src/pages/AuditPage.tsx:1-17` sempre usa eventos simulados. `Frontend/src/services/clinicalService.ts:142-162` usa dados simulados se a chamada ao audit log falhar. A interface pode mostrar uma trilha aparentemente válida quando não existe evidência real. | Exibir estado de erro/indisponibilidade e consultar somente o endpoint auditado para a página de auditoria. |
| S14 | **Média** | `Backend/requirements/base.txt` e `Backend/requirements/ai.txt` usam intervalos amplos sem lockfile ou hashes. O Compose usa imagens `ollama/ollama:latest` e `postgres:16-alpine` sem digest. Rebuilds não reproduzem exatamente as mesmas versões. | Fixar versões e digests, gerar lockfiles e executar auditoria de dependências em CI. |

## Dependências JavaScript

`npm audit --json` com consulta online ao registro npm encontrou **27 pacotes sinalizados**: 12 altos e 15 moderados, sem críticos. `npm audit --omit=dev --json` reduziu a árvore de produção para **6 pacotes**: 5 altos e 1 moderado (`axios`, `follow-redirects`, `form-data`, `react-router`, `react-router-dom`, `zod`). São contagens de pacotes afetados, não de falhas distintas nem prova de explorabilidade neste aplicativo. Versões diretas instaladas: axios 1.16.1, react-router-dom 7.16.0, zod 3.25.76 e Vite 6.4.2. A relevância de cada aviso deve ser verificada contra os recursos realmente usados; avisos de SSR/servidor do React Router podem não se aplicar à SPA atual.

Exemplos de avisos oficiais: [Axios](https://github.com/advisories/GHSA-vh66-26gq-q6x8), [React Router](https://github.com/advisories/GHSA-chx6-hx7r-mcp5) e [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

## Lacunas frente ao texto do TCC

- **RNF01/RNF02:** o modelo roda em serviço local, porém as portas publicadas permitem acesso de rede; não há criptografia de campos clínicos em repouso, TLS configurado no Compose nem backup local criptografado demonstrável.
- **RF02/RNF03:** não há camada de exportação/representação HL7-FHIR para `Patient`, `Observation` e `DocumentReference`.
- **RF03/RNF04:** `build_context` seleciona as notas mais recentes, sem embeddings, banco vetorial ou recuperação semântica; as fontes retornadas pelo modelo não são verificadas contra as notas enviadas.
- **RF05:** a validação humana existe como alteração de status, sem assinatura digital.
- O texto de arquitetura descreve backend FastAPI, mas a API principal implementada é Django/DRF; FastAPI existe somente para o serviço de IA.

## Verificações e limites

- `npm run lint`: passou.
- `npm run build`: passou fora do sandbox, com aviso de bundle JavaScript de 833,91 kB. Dentro do sandbox, o Vite não pôde ler um diretório acima do projeto.
- `python manage.py check --deploy`: executou com 5 alertas de segurança citados acima.
- `python -m compileall -q apps config services ai_service`: passou.
- `python -m pytest -q`: **nenhum teste encontrado**. Não há suíte que cubra autorização por paciente, clínica e papel.
- Não foi executada auditoria de advisories para dependências Python: `pip-audit`, Bandit e Semgrep não estão instalados. Também não houve teste dinâmico, verificação de portas efetivamente expostas nem inspeção do banco em execução.
- O `agent-orchestrator` detectou 1940 skills, mas seu match indicou skills de outros domínios; a varredura de código acima foi feita diretamente. O registro de skills foi atualizado fora do repositório após autorização.

## Ordem de correção

1. Desligar seed automático e rotacionar credenciais/segredos; retirar IA, Ollama e banco das portas públicas.
2. Corrigir autorização em pacientes, sessões e notas; criar testes com usuário de leitura, estagiário, psicólogo de outra clínica e admin.
3. Remover rascunho clínico e refresh token de `localStorage`; configurar TLS e cookies seguros.
4. Implementar auditoria de leitura e integridade, política de anonimização verificável e falhas explícitas da IA.
5. Atualizar dependências afetadas, fixar versões e acrescentar verificações de segurança em CI.
6. Implementar e avaliar separadamente os requisitos ainda ausentes de FHIR, RAG, criptografia em repouso e assinatura digital.
