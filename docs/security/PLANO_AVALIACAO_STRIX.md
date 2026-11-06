# Avaliação futura do Strix e preparação da versão estável

**06/11/2026 — PLANEJADO, NÃO EXECUTADO.** Vínculo: OP-00/OP-10, F0-02/F0-04/F0-05, F1-05, F5-03 e RNF-02/RNF-03/RNF-08. Complementa o [plano operacional](../PLANO_OPERACIONAL_CLINICA.md); **G0 permanece bloqueado**.

## Ferramenta identificada e limites da pesquisa

Projeto encontrado: [usestrix/strix no GitHub](https://github.com/usestrix/strix). O mantenedor o descreve como teste de segurança com agentes de IA, análise dinâmica, provas de conceito, relatórios e sugestões de correção; há modalidade local e serviço gerenciado. São capacidades declaradas pelo projeto, **não desempenho comprovado no AELO**. Não assumir ausência de falsos positivos/negativos ou cobertura equivalente à de um pentester humano.

Fontes primárias consultadas em 06/11/2026: [introdução](https://docs.strix.ai/), [CLI](https://docs.strix.ai/usage/cli), [configuração](https://docs.strix.ai/advanced/configuration) e [provedores](https://docs.strix.ai/llm-providers/overview). A ferramenta e sua interface podem mudar; fixar release/commit, imagem e documentação antes do ensaio. Não foram instalados pacote/skills, conectados provedores ou executados testes ativos nesta rodada.

Constatações relevantes da documentação: a CLI oferece alvos de diretório/URL/contrato de API, profundidade de teste e instruções por arquivo. **Diretório local é montado com escrita**, e bases declaradas no contrato podem entrar no escopo. Opções de orçamento/turnos e limiar de falhas existem, com limitações. Conferir comportamento na versão fixada e não apontar a ferramenta ao checkout habitual. [Referência CLI](https://docs.strix.ai/usage/cli).

## O que significa o marco de 80%

O usuário solicita avaliação quando aproximadamente 80% das funcionalidades estiverem prontas e auditáveis. Converter isso em marco verificável, sem alegar percentual atual:

`progresso funcional = unidades de aceite concluídas com evidência / unidades de aceite do escopo de release aprovado × 100`.

Antes de medir, congelar a lista de funcionalidades e seus critérios, incluindo caminhos de erro e acesso negado. Usar unidades equivalentes, sem contar subtarefas cosméticas como funcionalidades; alterações do denominador têm decisão e data. Backlog opcional não aprovado (portal/convênios etc.) fica fora do denominador, mas superfícies expostas entram no escopo técnico de segurança. **Não calcular porcentagem a partir de telas existentes, linhas de código ou uma opinião sobre aparência.**

O patamar de 80% aciona a preparação/revisão de escopo do ensaio ampliado, não aprovação de release. Além do percentual, são pré-condições:

- Fluxos principais executáveis no ambiente auditável e APIs/rotas inventariadas, com versões/configuração e evidência de testes.
- Todos os controles críticos necessários ao ensaio prontos: isolamento entre clínicas/pacientes, credenciais sintéticas individuais, revogação, segredos fora do material, backup e restauração comprovados.
- Escopo escrito: proprietário, hosts/portas/rotas permitidos, contas/papéis, período, técnicas permitidas/proibidas, limites de tráfego/custo, responsável, parada e recuperação.
- Ambiente isolado, descartável e sem pacientes reais ou integração viva de pagamentos, comunicação, Receita, nuvem ou fornecedores.

Segurança continua desde F0: lint, dependências, segredos, testes de autorização e revisão humana não aguardam 80%. Uma falha conhecida de isolamento/assinatura não pode ser adiada para o Strix. Não há percentual atual comprovado nem autorização de teste contra produção neste documento.

## Plano do ensaio proposto para o AELO

As restrições abaixo são decisões propostas para o projeto, não garantias oferecidas pelo Strix.

| Etapa | Procedimento e verificação |
| --- | --- |
| 1. Qualificação | Verificar manutenção, licença, release/commit, dependências, imagem e avisos de segurança. Ler método de instalação e compatibilidade Windows/WSL/Docker da versão escolhida; não executar instalador remoto sem inspeção. Registrar origem/hashes e caminho de remoção. |
| 2. Cópia descartável | Criar checkout/cópia dedicada no commit candidato, sem `.env`, banco, dumps, artefatos clínicos ou credenciais Git/CI. Montar só o necessário, sem pasta pessoal ou Docker socket do host para o agente. Verificar permissões reais do sandbox e mudanças que ele consegue realizar. |
| 3. Ambiente sintético | Pilha separada com duas clínicas, usuários e pacientes sintéticos; papéis existentes e grants distintos. Incluir papéis futuros apenas se implementados. Snapshot cifrado/restauração isolada antes do ensaio; não reutilizar o banco local de trabalho. |
| 4. Dados e modelo | Escolher execução local/gerenciada e provedor por decisão registrada. CLI local com LLM remoto pode enviar código, contexto e respostas ao provedor. Modelo local exige verificar endpoints, telemetria e tráfego; não presume privacidade nem equivalência de qualidade. Revisar retenção/processamento e limites de custo. |
| 5. Perímetro efetivo | Fixar lista permitida de destinos e bloquear saída indevida em rede/proxy/firewall; restrição em prompt não é barreira suficiente. Sanitizar `servers`, links e credenciais de OpenAPI/Postman. Bloquear terceiros, redes internas não autorizadas e metadados de nuvem. Comprovar conectividade sandbox→alvo sem ampliar publicação de portas. |
| 6. Contas e segredos | Contas efêmeras por clínica/papel, privilégios mínimos, reset e revogação ao fim. Chaves do provedor fora do código; credenciais sintéticas entregues por mecanismo privado da versão, sem linha de comando/histórico ou relatório público. Inspecionar arquivos locais de configuração, pois podem persistir valores. |
| 7. Piloto monitorado | Começar por escopo pequeno; definir orçamento, duração, limite externo de execução/tráfego e procedimento de interrupção. Excluir destruição, negação de serviço, persistência e testes de engenharia social. Interromper ao sair do escopo, achar dado inesperado ou tornar serviço instável. Limites de gasto do agente não substituem limite do provedor. |
| 8. Testes ampliados | Após piloto, exercitar os cenários priorizados abaixo; registrar áreas alcançadas e não alcançadas, contas usadas, autenticação efetiva, falhas e limitações. Rodada anônima e autenticada são diferentes. Relatório vazio pode significar falha de autenticação/cobertura. |
| 9. Triagem | Reproduzir achado no ambiente sintético, minimizar PoC, confirmar causa/impacto, classificar severidade e relacionar requisito/teste/PR. Não aplicar auto-fix nem fazer merge automático; revisar diffs e regressões. |
| 10. Reteste/encerramento | Reexecutar caso corrigido e testes adjacentes; revogar credenciais, revisar mudanças na cópia, recolher artefatos privados, eliminar ambiente conforme política e registrar resultado/limites. Atualizar risco residual e decisão humana de release. |

Não instalar integrações cloud/MCP ou disponibilizar a ferramenta na CI por padrão. Se adotadas depois do piloto, especificar escopo, permissões, proteção de secrets em PRs externos e artefatos restritos. Revisão de segurança da própria ferramenta antecede acesso ao repositório privado.

## Cenários prioritários

| Superfície | Perguntas de teste no ambiente autorizado |
| --- | --- |
| Identidade/sessão | Login, refresh/cookies/origem, logout/revogação, recuperação e escalonamento de papel; anônimo e usuário inativo. |
| Autorização por objeto | Clínica A não lê/lista/edita/exporta dados de B; profissional sem grant e admin operacional não obtêm prontuário; acesso revogado deixa de funcionar. |
| Relações e dados derivados | Troca de paciente/sessão/autor em payload/filtro; notas/anexos/downloads, busca, cache, logs e filas não escapam do escopo. |
| Integridade documental | Nota assinada não pode ser alterada/deletada; retificação e versão antiga não contornam política; revisão de IA não equivale a assinatura da nota. |
| Navegador/API | XSS, entradas inválidas, injeção, CORS/CSRF conforme arquitetura, cabeçalhos, erro excessivamente informativo, upload privado quando existir. |
| Lógica operacional | Concorrência de agenda, repetição de transação, manipulação de valores/estornos e bypass de fluxo quando implementados. |
| Configuração | Exposição de portas/admin/DEBUG/segredos, backup e artefatos; SSRF/saída só nos limites e recursos sintéticos autorizados. |

Usar o [OWASP WSTG](https://owasp.org/projects/web-security-testing-guide) para métodos e o [ASVS](https://asvs.owasp.org/) para controles, fixando versão/IDs. A referência disponível consultada indica WSTG 4.2 estável e ASVS 5.0.0; confirmar na execução. O mapeamento mede cobertura, não atribui certificação OWASP.

## Uso da CLI: preparação, não execução nesta rodada

Depois de fixar e qualificar a instalação, consultar `strix --help` e comparar com a documentação da release. Exemplo ilustrativo para **cópia descartável sintética**, somente após escopo e isolamento efetivos:

```text
strix --target ./checkout-descartavel --scan-mode quick --instruction-file ./escopo-sintetico.md
```

Esse exemplo não define por si só orçamento, duração, rede ou segurança. Antes de executar, completar as opções disponíveis de orçamento/turnos, mecanismo externo de parada e alvos exatos na ficha de execução. Para teste dinâmico, acrescentar apenas o endereço autorizado acessível ao sandbox e contrato sanitizado, conferindo flags da versão. Não copiar URL de produção, token ou senha para exemplos versionados.

Conteúdo de `escopo-sintetico.md`: identificador da autorização, commit e alvos, exclusões, papéis/casos, técnicas permitidas/proibidas, limites, contato e condições de parada. Instruções orientam o agente; o perímetro continua imposto externamente. Nenhum arquivo com credenciais foi criado nesta rodada.

Na integração futura, interpretar **status final, cobertura e artefatos**, além do exit code. Segundo a CLI, modo interativo pode sair com 0 mesmo com achados; headless e limiar mudam o significado do código. Uma execução parada por orçamento/turnos/erro ou cobertura incompleta é **INCONCLUSIVA**, nunca aprovação. [CLI, status e limites](https://docs.strix.ai/usage/cli).

## Evidências e decisão de versão estável

Ficha mínima: `SEC-STRIX-ID | commit AELO | release/commit/imagem Strix | modelo/provedor/configuração sem segredos | escopo/autorização | contas sintéticas | datas | limites | status/cobertura | achados revisados | testes/PRs | reteste | riscos residuais | revisor`.

Relatórios e PoCs podem conter tokens, rotas e vulnerabilidades exploráveis. Guardar bruto em local privado com acesso/prazo definidos; versionar apenas relatório minimizado e referências sem segredos, dados clínicos ou exploit público desnecessário. Não publicar automaticamente `strix_runs`, dumps, screenshots ou links de acesso ao viewer.

Critérios de saída propostos: cobertura crítica comprovada; nenhum achado crítico/alto confirmado aberto na superfície de release; nenhum vazamento, bypass de autorização ou quebra de integridade documental sem solução, independentemente do rótulo de severidade; demais riscos triados com responsável e decisão; correções retestadas; regressão/CI, restauração e homologação UX aprovadas com limites explícitos. Resultado inconclusivo exige completar/repetir, não reduzir o escopo silenciosamente.

O marco de 80% inicia auditoria, não significa que 80% basta para operação. A versão estável exige todos os critérios obrigatórios do recorte aprovado e gates pertinentes; os 20% restantes devem estar concluídos ou formalmente fora do release, sem superfícies inseguras expostas. Segurança clínica/jurídica, avaliação humana e revisão independente não são substituídas pela ferramenta.

**Status atual:** ferramenta identificada e documentação consultada; adequação técnica, instalação, piloto, pentest e eficácia no AELO ainda NÃO VERIFICADOS. Não foi calculado progresso de 80%, nem declarada versão estável.
