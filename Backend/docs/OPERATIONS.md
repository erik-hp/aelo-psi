# Operação do AELO

## Preparação e migração

Para o frontend Vite conectado à API, use `VITE_API_URL=http://localhost:8000/api` e `VITE_USE_API=true` em `Frontend/.env`. A porta `18080` pertence exclusivamente à pilha sintética de segurança (`docker-compose.security.yml`) e só responde enquanto `api_security` estiver ativo. Após mudar `.env`, confirme que o Vite serviu a nova configuração ou reinicie `npm run dev`.

O Compose principal publica a API em `127.0.0.1:8000`. Execute `docker compose up -d --build migrate` e `docker compose up -d --build --no-deps api` para testar autenticação sem iniciar o Ollama. Isso não habilita análise de IA nem o worker. Nenhuma conta de demonstração é criada automaticamente. Cadastre uma conta profissional em clínica ativa, com senha forte; o login aceita o e-mail exato cadastrado ou o nome de usuário. As credenciais `aelo123` pertencem apenas ao modo demonstrativo do frontend (`VITE_USE_API=false`).

1. Copie `.env.example` para `.env`. Defina `DJANGO_SECRET_KEY`, `AI_SERVICE_TOKEN`, `AUDIT_LOG_HMAC_KEY` e `POSTGRES_PASSWORD` com segredos aleatórios independentes. Gere `CLINICAL_DATA_KEYS` como base64 de **32 bytes aleatórios**, por exemplo: `python -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`. Guarde as chaves fora do repositório e no mesmo plano de backup do banco. O `.env` local foi preparado para testes; não o reutilize em produção.
2. Antes de atualizar uma instalação com dados, interrompa escritas, faça backup do PostgreSQL e das chaves e reserve uma janela para migrações. As migrações `clinical_notes.0003`, `therapy_sessions.0003` e `ai_analysis.0005` convertem texto existente para AES-256-GCM. `audit_logs.0003` sela eventos antigos com HMAC; `audit_logs.0004` instala bloqueios de alteração e exclusão no PostgreSQL. As migrações de dados são irreversíveis por segurança; restauração exige backup.
3. Execute `docker compose up --build`. O serviço de migração aplica as migrações antes da API. Para dados sintéticos isolados, crie manualmente um superusuário, associe-o a uma clínica e execute `docker compose exec -e AELO_ALLOW_SYNTHETIC_SEED=1 api python manage.py seed_initial_data --admin-username <usuario>`. O comando não cria usuários nem senhas.
4. Baixe os modelos locais antes da primeira análise: `docker compose exec ollama ollama pull llama3.1` e `docker compose exec ollama ollama pull embeddinggemma`, ajustando os nomes se `OLLAMA_MODEL` ou `OLLAMA_EMBED_MODEL` forem diferentes. A recuperação semântica usa `/api/embed` do Ollama e restringe a geração a notas selecionadas do mesmo paciente.

O Compose local vincula somente a API a `127.0.0.1:8000`. PostgreSQL, serviço de IA e Ollama ficam na rede interna do Compose. O frontend local deve usar o mesmo nome de host da API (`localhost` ou `127.0.0.1`) para o cookie de sessão com `SameSite=Strict` funcionar entre portas.

## HTTPS de produção

Configure um domínio real em `AELO_DOMAIN`, DNS para o servidor e portas 80/443. Atualize a senha do PostgreSQL existente no banco e no `.env` antes de usar o overlay. Então execute `docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build`. O overlay compila o frontend com API na mesma origem, usa Caddy para HTTPS e força `DEBUG=False`, cookies seguros, redirecionamento HTTPS e HSTS. Django recusa o modo HTTPS com a senha padrão do banco ou sem os segredos essenciais. O [Caddy documenta a emissão automática de HTTPS](https://caddyserver.com/docs/automatic-https).

Não habilite `DJANGO_TRUST_PROXY_HEADERS` quando a API estiver acessível por um proxy que não controle os cabeçalhos encaminhados. O overlay mantém a porta 8000 acessível somente no host local. Em modo HTTPS, a inicialização recusa segredos reutilizados entre Django, auditoria, IA e chaves clínicas; origens CORS/CSRF configuradas devem ser HTTPS exatas, sem credenciais ou curingas. O Caddy aplica HSTS de um ano às respostas HTTPS e consolida os cabeçalhos depois da resposta do upstream. Subdomínios e preload não são habilitados automaticamente.

Em 16/11/2026 foi executado um ensaio HTTPS com CA local descartável, validação de certificado/hostname, proxy e sessão. Certificados públicos, DNS e o Compose de produção ainda precisam de teste no servidor Linux alvo. Imagens locais anteriores podem conter `.git-backup-before-monorepo`: as exclusões de build foram corrigidas, mas imagens antigas devem ser reconstruídas antes de qualquer implantação. Nenhum arquivo desse backup foi publicado ou apagado nesta validação.

### Reproduzir a validação HTTPS sintética

Na pasta `Backend`, execute `docker compose -p aelo-tls-validation -f docker-compose.tls-test.yml run --build --rm tls_smoke`. A pilha usa banco temporário, contas e chaves sintéticas explícitas, o mesmo Caddyfile de produção e uma CA local que não é instalada no host. Não publica portas. Ao terminar, execute `docker compose -p aelo-tls-validation -f docker-compose.tls-test.yml down --volumes` para remover somente essa pilha e sua CA de teste. O relatório de [validação F0 da área 1](../../docs/validation/F0_AREA1_2026-11-16.md) distingue esses testes da implantação final.

## Auditoria, assinaturas e chaves

- `docker compose exec api python manage.py verify_audit_chain` verifica sequência, HMAC e cabeçalho da cadeia. O `AUDIT_LOG_HMAC_KEY` deve permanecer separado do banco e ser preservado em backup; trocá-lo invalida a verificação de eventos antigos. As triggers de bloqueio foram exercitadas nos testes PostgreSQL/pgvector; uma operação de produção ainda requer verificação no servidor alvo.
- `docker compose exec api python manage.py verify_review_signatures` confere assinaturas ECDSA P-256, conteúdo e decisão de cada revisão. Revisões anteriores à migração aparecem como não assinadas. A chave privada do psicólogo é criada pelo navegador, não é exportável e fica no IndexedDB daquele perfil. Após verificar a identidade do profissional fora do sistema, o operador pode executar `python manage.py reset_signing_key <username>` para simular e `python manage.py reset_signing_key <username> --apply` para permitir novo registro no navegador. Revisões anteriores preservam cópia da chave pública. Este mecanismo é assinatura criptográfica de conta, sem certificação ICP-Brasil.
- Para girar a chave dos campos clínicos, coloque uma nova chave **primeiro** em `CLINICAL_DATA_KEYS`, mantendo a antiga depois da vírgula. Execute `python manage.py rotate_clinical_keys` para simular e `python manage.py rotate_clinical_keys --apply` para recriptografar e verificar todos os registros. Só remova a chave antiga após a verificação e backup. A chave de auditoria usa processo separado e não é alterada por esse comando.

## Retenção

`CLINICAL_RETENTION_DAYS=0` desabilita a purga. Após a clínica aprovar um prazo aplicável, configure um inteiro positivo. `python manage.py purge_expired_patients` mostra apenas a quantidade elegível. `python manage.py purge_expired_patients --apply` remove permanentemente pacientes previamente excluídos há mais que o prazo e seus registros de sessão, nota e análise, preservando um evento pseudônimo na auditoria. A rotina não é agendada automaticamente. Antes de programá-la, defina também procedimentos de suspensão por obrigação legal e de retenção de backups.

Os rascunhos clínicos criptografados expiram 30 dias após a última atualização. Execute `python manage.py purge_expired_drafts` diariamente em tarefa operacional; a aplicação não agenda esse comando. Em atualização do frontend, rascunhos antigos no navegador são oferecidos para importação confirmada somente após autenticação e acesso ao paciente. Não copie dados clínicos para logs durante suporte à migração.

## Verificação sintética de privacidade e carga

`docker compose -p aelo-security-local -f docker-compose.security.yml run --build --rm security_smoke` sobe PostgreSQL temporário, cria grafos sintéticos de 100/200 nós e executa verificações HTTP com identidades sintéticas. Depois, `docker compose -p aelo-security-local -f docker-compose.security.yml run --rm -e VUS=10 -e DURATION=30s load_security` testa o roteiro k6; para a medição prolongada, use `DURATION=15m` e repita com `VUS=1`, `5` e `10`. Execute o smoke e cada carga **sequencialmente**, pois compartilham rascunhos sintéticos. Encerre com `docker compose -p aelo-security-local -f docker-compose.security.yml down`. O nome do projeto isola a pilha do Compose principal. A pilha usa segredos de teste fixos e não deve receber tráfego ou dados reais. O resultado de cada rodada deve ser registrado no Cérebro, com duração, usuários, p95, falhas e tamanho do grafo.

Para a inspeção dinâmica passiva, execute o [ZAP Baseline](https://www.zaproxy.org/docs/docker/baseline-scan/) somente contra o frontend sintético, na rede desse projeto: `docker run --rm --network aelo-security-local_default ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://web-security:8080 -m 1 -s`. O código 1 indica avisos do scanner, que precisam de triagem; ele não equivale a ausência de falhas de segurança. O baseline não autentica usuário nem testa o fluxo do Ollama. O relatório de 2026-11-03 e sua triagem estão em `Backend/security-reports/` e no Cérebro.

Em produção (`DJANGO_DEBUG=False`), `/admin/` não é publicado: a interface administrativa padrão do Django não aplica o isolamento de clínica do AELO. Gestão de usuários usa a API, limitada à clínica do administrador autenticado.

## Limites atuais

A criptografia de aplicação cobre notas, histórico, resumo de sessão e conteúdo de IA. Identificadores de paciente/usuário, metadados operacionais, backups e o volume PostgreSQL ainda dependem de criptografia do host ou armazenamento. A anonimização é baseada em padrões e nome/código conhecido; não implementa NER validado. O exportador FHIR R4 produz `Patient`, `Encounter` e `DocumentReference` de um único paciente autorizado, ainda sem validação externa de conformidade. A recuperação semântica calcula embeddings em lotes de até 20 notas e não mantém um banco vetorial. Nenhum desses pontos autoriza prontuários reais sem validação clínica, jurídica e operacional adicional.
# Worker de análise e Vault

As rotas de solicitação de análise e checkpoint retornam HTTP 202 com `job_id`. Após migrar o banco, execute `python manage.py process_vault_jobs` em um processo separado da API. `--once` processa no máximo um job e é útil para diagnóstico. Em Compose, o serviço `migrate` conclui antes de `api` e `vault-worker`. A API pode aceitar jobs sem o worker, mas eles permanecerão `PENDING` até que ele seja iniciado. Consulte `EXECUCAO_GUIA_TRANSICAO.md` para status e comandos de validação.

## Qualidade e segurança contínuas

O workflow `.github/workflows/quality-security.yml` executa testes PostgreSQL/pgvector, lint, Bandit, auditorias Python e npm, varredura de segredos, build do frontend e verificação de imagens sem root e da sintaxe Caddy. Ele começa a valer quando os arquivos forem adicionados ao repositório e executados no GitHub; o arquivo local não prova uma execução remota. A documentação de evidências e riscos residuais está no Cérebro em `1 - TCC/wiki/outputs/diario_execucao_seguranca_refatoracao_2026-11-03.md`.
