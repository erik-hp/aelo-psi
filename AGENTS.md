# Instruções permanentes de trabalho — AELO-PSI TCC2

> **Aplicação:** todo colaborador, assistente de código e futuras sessões de trabalho. Leia antes de editar. Este arquivo não substitui revisão humana, política de segurança nem exigências do orientador.

## Fonte de verdade (ordem de consulta)

1. `docs/PLANO_MESTRE_IMPLEMENTACAO.md`: escopo aprovado, etapas F0–F7, dependências, gates e definição de pronto.
2. `docs/MATRIZ_REQUISITOS.md`: requisitos/IDs e vínculo com testes/evidências.
3. `docs/REGISTRO_EXECUCAO.md`: situação **comprovada** e próxima tarefa.
4. `docs/architecture/ADR-001-memoria-terapeutica-longitudinal.md`: desenho de memória terapêutica, provado apenas quando testado.
5. `README.md`: visão de produto, estado e execução local.
6. Código, testes, migrações e logs de CI na branch relevante são a verdade sobre o que existe. Se discordarem da documentação, corrigir a documentação ou o código antes de declarar pronto.

## Algoritmo obrigatório de início de qualquer trabalho

1. Confirmar branch, último commit, mudanças não mescladas, PRs abertos e documentação.
2. Identificar **uma tarefa** na fase mais baixa cujo gate ainda não foi atingido; mapear IDs na matriz.
3. Inspecionar os arquivos reais antes de propor alterações; não assumir que mock é produção.
4. Declarar escopo, plano mínimo, dependências, testes, risco e artefatos a atualizar.
5. Criar branch e PR só quando a mudança for grande, arriscada ou precisar de revisão separada, e apagar a branch após o merge. Ajustes pequenos podem ir direto em `main`, com os testes pertinentes aprovados. Não apagar código sem necessidade.
6. Rodar testes/build/lint/checks pertinentes; **nunca** declarar resultado executado quando foi somente revisão estática.
7. Registrar commit/PR, resultado, limitações, decisão e próximo item no `docs/REGISTRO_EXECUCAO.md`.
8. Se não houver acesso de execução, deixar a tarefa `EM REVISÃO` ou `BLOQUEADO`, com comando de verificação, não `CONCLUÍDO`.

## Invariantes técnicos e éticos

- Toda operação de leitura/escrita/listagem deve impor escopo de **clínica + paciente + profissional autorizado + ação**, no back-end. Admin operacional não tem autorização implícita para ler prontuários.
- Dados de saúde são sensíveis: criptografar com chaves bem geridas; minimizar, não logar conteúdo e não expor contextos, embeddings ou arquivos clínicos.
- Nota clínica assinada não é alterada silenciosamente; usar retificação e registrar autor/data/motivo.
- Nenhuma IA pode diagnosticar, tomar decisão clínica autônoma ou classificar risco; toda sugestão vem com evidência e revisão humana.
- Falha do Ollama/RAG é **falha explícita**. Proibido preencher resultado real com respostas, probabilidades, risco ou escores fictícios.
- Não alegar que RAG elimina alucinação, que NER garante anonimato ou que processamento local significa conformidade automática com LGPD.
- Conectar notas longitudinalmente por fontes/versionamento; índices e resumos são **derivados e reconstruíveis**, nunca substitutos de registros.
- Nenhuma recuperação entre pacientes e clínicas; bloquear por padrão e testar tentativas adversariais.
- Usar dados **sintéticos** para desenvolvimento/demonstração. Pacientes reais exigem governança, autorização e revisão ética/jurídica efetivas.
- Não alterar stack por preferência: manter Django/DRF, React/Vite/TypeScript, FastAPI, PostgreSQL/pgvector e Ollama até ADR aprovada.
- Métrica de valência é textual/exploratória, nunca sinônimo de humor real, prognóstico, risco clínico ou diagnóstico.

## Padrões de implementação

- Código legível e modular por domínio; contratos tipados, nomenclatura coerente, validação na fronteira, migrações explícitas e alterações compatíveis.
- Toda tarefa tem teste de sucesso, falha, não autorizado e regressão; não introduzir mock em produção.
- Interface: WCAG 2.2 AA como objetivo, estados de erro/sem dados/carregamento, navegação teclado e consentimento contextual quando necessário.
- API documentada; front-end não substitui autorização de servidor. Não usar defaults inseguros nem senhas embutidas em bootstrap de produção.
- Scripts reproduzíveis, dados de teste sintéticos, ambiente isolado, variáveis `.env.example` sem credenciais verdadeiras.
- Segurança/privacidade têm precedência sobre funcionalidades. Verificar o status jurídico-normativo de referências CFP/LGPD antes de escrever alegações.

## Controle de desvio

Nova funcionalidade não especificada deve ser tratada como solicitação de mudança: motivação, impacto no objetivo científico, escopo, risco, decisões, ADR e eventual atualização explícita do plano. Sem decisão, documentar em backlog e **não implementar**. Não inventar metas ou resultados quantitativos.

**Próxima tarefa padrão ao criar este arquivo:** F0-01, seguida de F0-02 e F0-03, conforme gate G0. 
