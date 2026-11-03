# Continuação das implementações do AELO

**Data:** 2026-11-02  
**Base:** `REFATORACAO_2026-11-02.md`, `AUDITORIA_SEGURANCA_2026-11-02.md` e `1 - TCC/wiki/tcc/projeto-completo.md`.  
**Escopo:** código da API Django, serviço de IA FastAPI, frontend React, migrações, configuração e testes. O conteúdo de `1 - TCC/` não foi alterado.

## Processo e mudanças

| Etapa | Implementação | Verificação |
|---|---|---|
| Dados clínicos em repouso | `EncryptedTextField` e `EncryptedJSONField` com AES-256-GCM, nonce aleatório e associação ao nome do campo. Protegem notas, histórico, resumo de sessão, resultados e fontes de IA, métricas e comentários de validação. Migrações `clinical_notes.0003`, `therapy_sessions.0003` e `ai_analysis.0005` convertem linhas existentes. | Testes leem o banco diretamente, conferem ausência de texto claro, migram texto legado e detectam alteração de ciphertext. `rotate_clinical_keys` recriptografa sob a chave principal. |
| Auditoria | Eventos recebem número sequencial, hash HMAC-SHA256 e hash anterior. `verify_audit_chain` detecta alteração e exclusão. A migração `audit_logs.0004` cria triggers de bloqueio no PostgreSQL. Comentários clínicos duplicados em metadados de auditoria antigos são removidos na migração. | Teste altera e remove eventos no SQLite e confirma que a verificação falha. As triggers PostgreSQL dependem de teste em container. |
| Interoperabilidade | `GET /api/patients/{id}/fhir/` monta Bundle FHIR R4 com `Patient`, `Encounter` e `DocumentReference`; a nota atual é exportada em base64 após autorização e o acesso é auditado. | Teste cobre recurso, conteúdo, cache `no-store`, auditoria e isolamento entre clínicas. |
| Recuperação semântica | Serviço local usa embeddings em lote do Ollama, similaridade de cosseno, nota alvo e `RAG_TOP_K` para selecionar contexto de até 20 notas. Análise sem nota útil é rejeitada e citações fora do contexto recuperado são descartadas. | Testes cobrem ordenação semântica, inclusão da nota alvo e rejeição de fonte não recuperada. API real do Ollama ainda não foi exercitada aqui. |
| Revisão humana | Psicólogo registra chave pública ECDSA P-256. A interface guarda chave privada não exportável no IndexedDB, pede confirmação explícita e assina o conteúdo, decisão e comentário. O backend verifica antes de alterar o estado; `verify_review_signatures` detecta revisões alteradas ou legadas sem assinatura. | Teste cobre assinatura válida, comentário adulterado, revisão única e detecção de resultado alterado. |
| Retenção | `purge_expired_patients` simula por padrão; com prazo aprovado e `--apply`, elimina dados de pacientes previamente excluídos e registra evento pseudônimo. | Teste confirma simulação, purga seletiva e integridade da auditoria. Nenhuma purga real foi executada. |
| Sessão web | Refresh token migrou de `sessionStorage` para cookie HttpOnly e `SameSite=Strict`; endpoints de renovação e logout exigem cabeçalho de sessão. O frontend usa cookies com credenciais e limpa tokens legados. Respostas `/api/` recebem `Cache-Control: no-store`. | Teste cobre login, ausência de refresh no JSON, renovação, rotação, logout e ausência de cache em leitura clínica. |
| HTTPS e dependências | Overlay Compose compila o frontend e usa Caddy com HTTPS automático; Django exige segredos e senha do banco não padrão no modo HTTPS. Dependências Python e npm foram atualizadas. | `pip-audit`: zero avisos conhecidos no ambiente atualizado. `npm audit`: zero avisos após atualização do Zod e override de `minimatch`. Build, lint e testes passaram. |

## Relação com os requisitos do TCC

| Requisito | Estado após esta etapa |
|---|---|
| RF02 / RNF03, prontuário e FHIR | Exportação FHIR R4 de um paciente implementada como subconjunto; falta validar com ferramenta FHIR externa e definir perfis de interoperabilidade. |
| RF03, sumarização via RAG | Recuperação semântica local e contexto controlado implementados; faltam banco vetorial persistente, avaliação RAGAS e teste com Ollama real. |
| RF04, sentimentos | Métricas estruturadas já existem no fluxo de IA; qualidade e validade clínica ainda não foram medidas. |
| RF05, revisão e assinatura | Assinatura criptográfica de conta obrigatória para novas revisões por psicólogo; não há certificado ICP-Brasil nem recuperação de chave de navegador. Revisões antigas permanecem sem assinatura. |
| RNF01, soberania | IA e embeddings usam Ollama na rede interna; falta verificar uma implantação real e os modelos baixados. |
| RNF02, segurança | Campos clínicos selecionados, tráfego web e auditoria receberam controles. Identificadores, metadados, volume e backups ainda precisam de criptografia de infraestrutura. |
| RNF04, explicabilidade | Fontes são vinculadas a notas recuperadas e trechos literais; isso não comprova fidelidade de todas as afirmações geradas. |

## Pendências materiais

1. **Privacidade clínica:** a anonimização continua baseada em padrões e no nome/código conhecido. Não há NER nem medida de recall em corpus clínico representativo; terceiros e identificadores indiretos podem permanecer. O contexto é reanonimizado antes de cada chamada de IA para aplicar as regras atuais a notas antigas.
2. **Criptografia completa:** nomes/códigos de pacientes, dados de usuários, metadados operacionais, volume PostgreSQL e backups precisam de proteção de infraestrutura. As chaves de dados e auditoria precisam de backup seguro; a rotação da chave de auditoria não foi implementada.
3. **Assinatura:** a chave privada depende do armazenamento do navegador e pode ser usada por JavaScript que execute na mesma origem. Há reset manual auditado após verificação externa de identidade, mas falta fluxo autenticado de recuperação/rotação e definição jurídica da modalidade de assinatura exigida pela clínica. O access token continua disponível a JavaScript durante a sessão.
4. **Retenção:** o prazo é deliberadamente `0` até decisão institucional. Falta política de suspensão por obrigação legal e retenção de backups; não há agendamento automático da purga.
5. **Integração real:** Docker não está instalado neste ambiente. Não houve execução do PostgreSQL, Caddy com certificado, Ollama, migrações em banco já populado ou validador FHIR externo. A configuração de produção é implementada, mas não foi homologada.

## Implantação e revisão

As migrações de dados são irreversíveis. Antes de aplicá-las a uma base existente, faça backup do banco e dos segredos, interrompa escritas e leia [OPERATIONS.md](Backend/docs/OPERATIONS.md). Execute `verify_audit_chain` e `verify_review_signatures` após migrar. Use dados sintéticos até concluir as validações acima.

**Verificação neste ambiente:** `pytest` passou com **24 testes**; `ruff`, `manage.py check`, `makemigrations --check`, ESLint, TypeScript, build Vite e leitura sintática dos arquivos Compose passaram. `pip-audit` e `npm audit` retornaram **zero avisos conhecidos** no conjunto instalado em 2026-11-02. O build emitiu aviso de bundle JavaScript grande (880,90 kB) e avisos de comentários do Zod removidos pelo Rollup. A ausência de Docker impediu executar os serviços integrados.

Referências técnicas de integração: [Ollama embeddings](https://docs.ollama.com/api/embed), [FHIR R4 DocumentReference](https://hl7.org/fhir/R4/documentreference.html) e [Caddy HTTPS automático](https://caddyserver.com/docs/automatic-https).

## Atualização posterior: Vault Cognitivo

O escopo e os números de teste acima registram a etapa anterior. Nesta etapa, o projeto ganhou modelos `VaultNode`, `VaultEdge` e `VaultCheckpoint`, migração pgvector, extração ligada a trechos literais da nota, comunidades Leiden, recuperação lexical/vetorial de relações, checkpoint Markdown com hash no payload assinado, rotas autorizadas, interface de grafo e documentação no Obsidian. A rotina de retenção inclui o novo conteúdo. Consulte [VAULT_GRAPHRAG.md](Backend/docs/VAULT_GRAPHRAG.md) para arquitetura, rotas, segurança e limites. A suíte atual tem 28 testes aprovados; PostgreSQL e Ollama reais continuam sem ensaio integrado neste ambiente.

Após localizar `1 - TCC/wiki/outputs/plano_arquitetural_vault_graphrag.md`, foram adicionados pesos e contagem de menções, síntese Ponto/Todo com citações verificadas, centralidade no checkpoint, abas de grafo e saves, renderização Markdown e revisões nos capítulos de objetivos, referencial e metodologia. A suíte atual tem **29 testes aprovados**. O plano foi preservado como fonte de projeto; diferenças de segurança e de interpretação normativa estão registradas em `Backend/docs/VAULT_GRAPHRAG.md`.
