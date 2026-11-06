# Piloto Jev — ferramentas de desenvolvimento

**06/11/2026 — EM REVISÃO; teste do provedor e benchmark de economia pendentes de credencial.** F0-01/F0-05, RNF-08. Experimento isolado autorizado pelo autor; não integra o produto clínico, não muda stack ou gates e não envia prontuários. Base `ebac1a4`, branch `chore/piloto-jev`.

## Preparado e verificado

- Node `v24.14.1`, npm `11.17.0`, Codex CLI `0.167.0` disponíveis.
- Gateway comunitário [vinilana/jev-gateway](https://github.com/vinilana/jev-gateway), versão npm **0.5.1**, fixada no package/lock desta pasta. Instalação com `--ignore-scripts`, sem instalação global ou alteração de configuração do Codex, Frontend ou Backend.
- Tarball inspecionado antes de executar; SHA-256 `E1266A1674C1A2792F1FC09BB4223714BE0EFCA9AECC4835084D0751D795E714`; integridade npm `sha512-C3ahe2yy/1MVNbsCUBQELbAZaMeMWIoQaIeTnZvHKdqAUsJcjrr7Yeq/BgOZ7w3EAIBKNs+Z0elI819NzUaBvw==`. Hash identifica o artefato, não certifica sua segurança.
- `npm.cmd test`: **5 aprovados**, com provedor/upstream simulados e nenhuma chamada de rede. Verificam baseline sem Jev, escolha simulada, falha do provedor, baixa confiança e negação sem autenticação. Falha do provedor deixa o pedido seguir ao modelo principal; isso não conta como Jev funcionando.
- `npm.cmd audit --omit=optional`: **0 vulnerabilidades conhecidas reportadas** nesta instalação; não equivale a auditoria completa de código.
- Parsing dos dois scripts PowerShell e roundtrip DPAPI com valor exclusivamente sintético aprovados. `node --check live-check.mjs` aprovado. `git check-ignore` confirma credenciais, artefatos e dependências locais ignorados.
- A tentativa do probe sem credencial terminou com `JEV_LIVE_NOT_RUN`, antes da chamada à API. Não encontrada chave nos nomes documentados em ambiente de processo/usuário nem configuração anterior do gateway. **Nenhuma decisão real, economia ou compatibilidade ponta a ponta Codex↔gateway foi comprovada.**

## Configurar sem enviar chave no chat

Obter chave no provedor escolhido: [TypeSafe](https://console.typesafe.ai/), [OpenRouter](https://openrouter.ai/settings/keys), [Vercel AI Gateway](https://vercel.com/dashboard/ai-gateway/api-keys) ou OpenCode conforme a documentação da versão. A conta do Codex não substitui essa credencial. Consultar disponibilidade, modelo, preço e limites no provedor; não comprar crédito automaticamente.

Na raiz do projeto, em um PowerShell **operado pelo usuário**, executar:

```powershell
.\experiments\jev-pilot\configure.ps1
```

O script solicita provedor e chave com `Read-Host -AsSecureString`. Não colocar a chave nos argumentos, mensagem do chat, `.env` da aplicação ou repositório. Armazena somente ciphertext DPAPI do usuário Windows em `.runtime/credential.dpapi.json`, ignorado pelo Git. Não modifica variáveis persistentes ou arquivos pessoais do Codex. DPAPI depende do contexto Windows e não impede acesso por processos do mesmo usuário; não compartilhar a pasta de runtime.

Se a política local bloquear scripts, usar o mecanismo de aprovação/assinatura permitido pela máquina; não alterar permanentemente ExecutionPolicy como requisito do piloto.

## Probe real, pequeno e delimitado

Após configurar:

```powershell
.\experiments\jev-pilot\live-check.ps1
```

O launcher descriptografa somente para o processo/filho e restaura o ambiente ao fim. O probe usa exclusivamente três textos sintéticos embutidos, duas ferramentas fictícias e os endpoints da tabela da versão fixada; não aceita override de endpoint. Não lê o projeto, conversa, auth do Codex ou banco. Não executa as ferramentas escolhidas.

São no máximo três chamadas lógicas de seleção, com uma tentativa extra por chamada nas falhas que o gateway considera transitórias. Não há fallback automático para modelo pago do OpenCode. Modelo default é o da versão/provedor; o modelo efetivamente retornado é registrado quando disponível. Chamadas podem consumir crédito; o total monetário não é calculado por este probe. Estabelecer também limite de gasto na conta do provedor.

Relatório minimizado em `.runtime/live-result.json`: provedor/modelo, respostas esperadas/escolhidas, confiança, tokens de entrada informados, latência e completude. Não grava chave, texto de erro bruto ou material clínico. Falha/baixa qualidade não vira sucesso; probe inconclusivo impede alegar economia. Conferir que escolhas foram realmente recebidas de Jev, não apenas que `/health` está saudável.

## Comparação Codex com/sem Jev — etapa seguinte, ainda não executada

Depois de validar credencial/probe, revisar autenticação, execução e opções locais do Codex CLI contra o gateway 0.5.1. A integração deve ocorrer em **nova execução isolada**, não por alterar a conversa em andamento ou o cadastro global.

Protocolo prévio à medição:

1. Fixtures sintéticas iguais em cópias separadas; casos pequenos de correção de filtro/estado e componente/formulário, sem notas reais, contas ou segredos. Requisitos e verificadores independentes definidos antes da execução, incluindo falha/negação/regressão aplicáveis.
2. Mesmo modelo/versão, nível de raciocínio, instruções, ferramentas, permissões e limite de tempo nas duas condições. Fixar versões das ferramentas e do modelo Jev; registrar cache e limitações da assinatura.
3. Baseline com roteamento desligado e condição com roteamento ligado, alternando ordem e repetindo casos. Resultado só conta quando os testes independentes passam; incluir tentativas falhas/retrabalho no custo total.
4. Medir input, cache, output/raciocínio, chamadas Jev/tokens, latência/tempo total e sucesso. Registrar fonte de cada contador, custo observado/estimado e preços/data. Tokens da assinatura não são conversão automática em reais ou dinheiro economizado.
5. Comparar custo **por tarefa correta**, não só tokens por chamada. Gateway que erra, cai em passthrough ou reduz correção não demonstra ganho. Amostra pequena é piloto, sem generalização estatística ao projeto inteiro.

Critério proposto de adoção: ganho medido em tarefas representativas sem regressão de qualidade/segurança, custo adicional e manutenção aceitáveis, possibilidade de desligar e retomar o fluxo normal. Caso contrário, não adotar. Código encaminhado ao modelo Jev/provedor deve ser previamente autorizado e minimizado.

## Reproduzir e limites

```powershell
cd experiments\jev-pilot
npm.cmd ci --ignore-scripts --no-fund
npm.cmd test
```

`package-lock.json` fixa dependências. `.runtime` e `node_modules` não são versionados; não há serviço em background iniciado por estes scripts. Os testes locais usam simulação explícita e não medem capacidade do modelo. O teste DPAPI realizado em memória não comprova todas as políticas de ACL/backup da estação.

Fontes consultadas: [modelo Jev/TypeSafe](https://docs.typesafe.ai/introduction), [gateway e benchmark do mantenedor](https://github.com/vinilana/jev-gateway). O gateway é projeto independente, não integração oficial do Codex ou da TypeSafe. Não há mudança no uso clínico de IA ou na decisão de manter Ollama no produto.
