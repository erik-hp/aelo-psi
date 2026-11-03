# Revisão da organização e refatoração do AELO

**Data:** 2026-11-02  
**Referências:** `1 - TCC/wiki/tcc/projeto-completo.md` (RF02–RF05, RNF01–RNF04) e `AUDITORIA_SEGURANCA_2026-11-02.md`.  
**Escopo:** API Django/DRF, serviço FastAPI de IA, frontend React, configuração local e testes. O material em `1 - TCC/` não foi modificado.

## Diagnóstico da organização

A divisão inicial por aplicativos Django e por páginas/componentes React era adequada, mas havia três pontos de acoplamento que dificultavam a revisão:

1. Cada view clínica montava seu próprio filtro de pacientes. Algumas aceitavam grants somente de leitura como autorização de escrita; outras ignoravam o criador do paciente. A mesma regra tinha resultados diferentes conforme o endpoint.
2. `Frontend/src/services/clinicalService.ts` misturava tipos de transporte, conversão de dados, requisições e dados simulados. Falhas da API podiam produzir valores de demonstração na interface sem aviso.
3. O bootstrap, o serviço de IA e a interface continham decisões de ambiente espalhadas: seed automático com senha fixa, portas auxiliares publicadas, serviço de IA sem autenticação e conteúdo clínico persistido no navegador.

## Processo executado

### 1. Centralização das regras clínicas

Foi criado `Backend/apps/patients/access.py` com três operações: `accessible_patients`, `can_view_patient` e `can_edit_patient`. Elas consideram usuário autenticado, clínica, papel, autoria e `PatientAccess.can_edit`. As views de pacientes, sessões, notas, análises e dashboard passaram a usar essa política. Listagens agora têm ordenação estável para paginação.

As associações de paciente em sessões e notas, e a associação de sessão em notas, tornaram-se imutáveis após a criação. Uma atualização que tente transferir um prontuário para outro paciente retorna erro de validação. Escritas em notas ou sessões requerem acesso de edição; notas bloqueadas também não podem ser alteradas ou apagadas. O histórico da nota e sua atualização ocorrem em uma transação. A revisão de IA exige acesso de edição e transição única do estado pendente, com bloqueio da linha durante a gravação.

### 2. Limite entre a API e o modelo de IA

O Compose deixou de publicar PostgreSQL, Ollama e o serviço de IA no host. Apenas a API fica vinculada a `127.0.0.1:8000` no ambiente local. Um token de serviço, enviado pela API no cabeçalho `X-AI-Service-Token`, é exigido pelo endpoint de análise. O `Backend/.env.example` e a documentação operacional foram atualizados; um token aleatório foi criado no `Backend/.env` local, ignorado pelo Git, sem ser incluído neste documento.

O serviço de IA agora limita o número de notas e o tamanho do texto recebido, usa JSON válido no prompt e valida a estrutura da resposta. As fontes retornadas só são aceitas quando apontam para uma nota enviada e quando o trecho aparece nessa nota; o ID de sessão vem do contexto recebido da API. Falha do Ollama retorna erro de serviço, sem gravar uma análise genérica como resultado clínico. A chamada de rede ocorre antes da transação que persiste a análise.

### 3. Bootstrap e configuração

O seed deixou de ser executado no início do container e não possui mais senha fixa. Ele requer `AELO_SEED_ADMIN_PASSWORD` com pelo menos 12 caracteres, é destinado somente a dados sintéticos de desenvolvimento e não cria novas sessões repetidas a cada execução. A tela de login não preenche credenciais. O exemplo de API não mostra mais a antiga senha. O uso de cabeçalhos de proxy passou a depender de `DJANGO_TRUST_PROXY_HEADERS=True` em um proxy confiável.

O Django agora recusa chave de assinatura ausente, curta ou com prefixo de exemplo; o fallback de senha do PostgreSQL também foi removido. Uma chave aleatória foi colocada no `Backend/.env` local (ignorado pelo Git). A troca da chave invalida sessões e JWTs anteriormente emitidos. A senha do banco local não foi alterada automaticamente porque um volume PostgreSQL existente pode continuar usando a credencial anterior; sua rotação exige atualizar o usuário do banco e o `.env` juntos.

### 4. Fronteira entre dados reais e demonstração no frontend

`Frontend/src/services/runtime.ts` centraliza o modo de execução: builds de produção usam a API. `clinicalMappers.ts` concentra os tipos e as transformações de respostas; `clinicalService.ts` fica com as operações. Em modo API, erros deixam de ser substituídos por eventos simulados, e a página de auditoria consulta seu endpoint real e mostra erro quando ele falha. O frontend não escolhe automaticamente o primeiro paciente ao pedir uma análise.

Campos que o backend não fornece deixaram de receber valores clínicos inventados: idade, periodicidade, risco, duração e indicadores ausentes aparecem como não informados. A relevância da análise não é mais apresentada como índice de atenção; as métricas longitudinais e financeiras simuladas não são exibidas como dados reais em modo API. O rascunho clínico deixou de ser salvo em `localStorage`; o refresh token e os dados da sessão do usuário passaram a usar `sessionStorage`. Isso reduz persistência entre sessões, mas **não protege o token contra JavaScript executado na mesma origem**.

Os estados de sessão `CANCELLED` e `MISSED` agora aparecem como cancelamento e falta; antes eram rotulados como "Revisar". Os estados de análise do transporte foram alinhados aos nomes reais da API.

### 5. Auditoria e testes

`Backend/apps/audit_logs/mixins.py` registra listagens e leituras individuais de recursos clínicos. A leitura do dashboard também é registrada. O Django Admin não permite adicionar, editar ou excluir linhas de auditoria pela interface. Esses controles melhoram a rastreabilidade, mas a tabela ainda não é imutável para quem possui acesso direto ao banco.

O middleware de auditoria anterior apenas repassava a requisição sem registrar nada; ele foi removido da configuração e do código para evitar um controle de segurança aparente sem efeito.

Foram adicionados `Backend/config/settings_test.py`, `Backend/pytest.ini` e testes de integração com SQLite em memória. Eles cobrem grants de leitura e edição, isolamento entre clínicas, transferência indevida de registros, histórico de nota, revisão única da IA, auditoria de leitura, autenticação do serviço de IA, checagem de fontes e seed explícito/idempotente. Não houve alteração de modelos nem geração de migrações.

## Mudanças de comportamento para revisar

| Fluxo | Comportamento atual |
|---|---|
| Leitor de paciente tenta alterar nota/sessão/paciente | `403` |
| Usuário tenta associar nota/sessão a outro paciente | `400` |
| Análise já validada/rejeitada recebe nova revisão | `403` |
| Modelo de IA indisponível | `503`, sem resultado clínico de fallback |
| Chamada direta à IA sem token de serviço | `401` |
| Modo API sem módulo financeiro/indicador longitudinal | Estado não informado, sem dados simulados |
| Seed local | Execução manual com senha fornecida pelo operador |

## Verificação

- `python -m pytest -q`: **9 testes passaram** em SQLite em memória.
- `ruff check apps config tests services ai_service`: passou.
- `python manage.py check --settings=config.settings_test`: passou. Fora dos testes, o comando exige `DJANGO_SECRET_KEY` no ambiente.
- `npm run lint`: passou sem avisos.
- `tsc -b`: passou.
- O YAML do Compose foi analisado com PyYAML. O comando `docker compose config` e testes em containers não puderam ser executados porque Docker não está instalado neste ambiente.
- `npm run build`: passou fora do sandbox; o esbuild não consegue ler um caminho superior ao workspace dentro dele. O build emitiu aviso de bundle JavaScript de 831,05 kB.

## Pendências conhecidas

**Atualização de 2026-11-02:** as implementações posteriores e o estado atualizado das pendências estão em `IMPLEMENTACOES_PENDENTES_2026-11-02.md`. A lista abaixo registra o estado no momento desta primeira refatoração.

Esta refatoração resolve parte dos achados da auditoria anterior, mas **não torna o sistema pronto para prontuários reais**. O `.env` local ainda tem `DEBUG=True` e senha padrão do banco; a senha deve ser rotacionada antes de qualquer exposição. Faltam TLS e criptografia em repouso, trilha de auditoria com integridade verificável, política de retenção, anonimização robusta e medida da sua eficácia, assinatura digital, FHIR e RAG. O refresh token ainda é acessível a JavaScript durante a sessão. As dependências sinalizadas no `npm audit` ainda precisam de atualização avaliada e não foi executada auditoria de advisories Python. Os testes usam SQLite; o comportamento com PostgreSQL e Ollama real não foi exercitado.
