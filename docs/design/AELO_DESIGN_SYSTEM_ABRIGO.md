# Design system AELO: Abrigo (proposta)

**Estado:** migração em andamento (22/11/2026). Já aplicados no código: tokens, fontes, marca, menu, cabeçalho, Login e Hoje. As demais telas só herdam cor, fonte e forma. `docs/design/AELO_DESIGN_SYSTEM.md` (Continuidade) fica como histórico até a migração terminar. Detalhes em `docs/REGISTRO_EXECUCAO.md`.

**Nada aqui foi testado com usuários.** O contraste dos pares abaixo foi calculado por script (WCAG 2.x), o que não comprova conformidade geral, uso em leitor de tela nem em navegador real.

Protótipo navegável de todas as telas: `docs/design/prototipos/aelo-abrigo-prototipos.html`.

## Ideia central

Um consultório, não um hospital. A interface é o lugar onde a pessoa profissional escreve, revisa e assina, e a IA só ajuda em silêncio. O símbolo é um **arco** (porta/abrigo) com um ponto de cor quente.

Tema: *acolhedor + sereno + caderno de consultório.*

## Princípios

1. **Calma sem perder densidade.** Menos ruído, mas toda informação necessária continua a um clique. Nunca baixar contraste para "suavizar".
2. **O dia manda.** A tela inicial responde "o que faço agora?" (próxima sessão, pendências), não "quantas métricas existem?".
3. **Duas vozes.** O que a pessoa escreveu (registro clínico) é serifa de texto (Source Serif 4). O que o sistema diz é sans (Atkinson). A IA sempre aparece em caixa tracejada, rotulada como sugestão local, e nada entra no registro sem aceite.
4. **Honestidade visível.** Limites do produto aparecem em banner informativo ("dados de demonstração", "hash não comprova conformidade"). Texto de interface nunca alega segurança ou conformidade sem evidência.
5. **Uma ação principal por contexto.** Um botão primário por região.
6. **Movimento só em resposta a ação.** Sem animação espontânea; `prefers-reduced-motion` sempre respeitado.

## Cor

Neutros quentes (papel), primária oliva, acento argila. Argila é só acento (contagem, indicador de hoje, marcador de pendência), **nunca** ação principal, para não se confundir com erro.

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo | `#FAF5EC` Papel | `#1B1713` |
| Superfície | `#FFFDF8` | `#25201B` |
| Rebaixado | `#F1E9DB` Linho | `#15120F` |
| Texto | `#2A2018` | `#F3EBDD` |
| Texto secundário | `#5B4C3F` | `#CFC3B2` |
| Texto terciário | `#6B5A4C` | `#B5A794` |
| Primária (ação, foco) | `#35523F` Oliva | `#A9CBA0` |
| Sobre primária | `#FFFDF8` | `#16200F` |
| Acento | `#A4482B` Argila | `#E8A27C` |
| Borda de campo/controle | `#8A7A6A` | `#8F8272` |
| Divisória | `#E4D9C6` | `#3A322A` |

Status (texto sobre fundo suave): sucesso `#2F6B45/#DFEDE2`, alerta `#8A5A00/#F7E9C8`, erro `#A92B1F/#F8E1DC`, informação `#2C5F7A/#DCEAF1`. No escuro: `#9BD4AB/#213528`, `#F0C36A/#3F3317`, `#FFA89C/#43221E`, `#9CCBE4/#1F3340`.

**Contraste medido:** todos os pares de texto acima passam de 4,5:1 nos dois temas (menor valor: acento sobre fundo suave, 4,71:1 no claro). Bordas de controle passam de 3:1. Estado nunca depende só de cor: chips sempre têm texto e, quando faz sentido, ícone.

## Tipografia

| Uso | Fonte | Observação |
| --- | --- | --- |
| Títulos de página, números de destaque, horários | **Fraunces** (variável, opsz/SOFT) | Nova. Licença OFL. Só em títulos e números grandes. |
| Interface (menus, formulários, tabelas, botões) | **Atkinson Hyperlegible Next** | Já no projeto. |
| Registro clínico e trechos de nota | **Source Serif 4** | Já no projeto. Até 68 caracteres por linha, 17 px, entrelinha 1,75. |

Fontes continuam **hospedadas no próprio site** (exigência da CSP). Dependência nova: `@fontsource-variable/fraunces`.

Escala: título de página 2,0 a 2,9 rem (fluido), título de seção 1,3 rem, corpo 16 px, apoio 14,5 px. Mínimo de 14 px em qualquer texto.

## Forma e profundidade

- Painéis: raio 20 px, borda de 1 px e **sombra suave quente** (a de Continuidade era zero).
- Controles: raio 12 px, altura mínima 44 px (alvo de toque).
- Status: pílula completa. Etiquetas (tags): raio 8 px.
- Ícones: traço de 1,75 px, **um único conjunto**.

## Marca

Arco com recorte interior e ponto argila. Versões: símbolo isolado, símbolo + "AELO" em Fraunces. Os arquivos em `Frontend/public/brand/` precisam ser redesenhados na implementação; o protótipo usa SVG inline.

## Padrões

| Padrão | Uso | Observação |
| --- | --- | --- |
| **Hoje** | Início | Próxima sessão em destaque, dia em lista, "Para fechar o dia", "Sugestões para revisar". Sem cartões de métrica. |
| **Mestre-detalhe** | Pacientes | Lista enxuta à esquerda, resumo à direita; em telas estreitas empilha. |
| **Linha de sessões** | Perfil do paciente, histórico | Linha vertical com pontos: argila = hoje, oliva = assinada. Só para sequência de sessões. |
| **Papel** | Editor | Superfície de escrita larga com seções SOAP/DAP; painel lateral com contexto e sugestões. |
| **Caixa de sugestão** | Qualquer saída de IA | Borda tracejada, rótulo "Sugestão da IA local", botões "Inserir"/"Descartar". |
| **Banner de limite** | Módulos incompletos, avisos de integridade | Fundo informativo, texto direto, sem alarme. |
| **Tabela simples** | Financeiro, Auditoria, Usuários | Cabeçalho discreto, linhas com chips de situação. |

## O que evitar

- Cor literal em componentes. Mude o significado do token.
- Cor como único sinal de estado.
- Argila como cor de botão principal.
- Vidro fosco, gradientes vistosos, ilustração decorativa de "bem-estar".
- Cartões idênticos para dados que cabem em lista.
- Rótulos de perfil em inglês ou códigos internos ("PSYCHOLOGIST") na interface.
- Mais de um sinal para a mesma pendência.

## Migração (quando confirmada)

1. **Decisão registrada:** o autor autorizou deixar de depender do BoardUI nas telas. Isso exige atualizar `Frontend/AGENTS.md` (hoje manda usar BoardUI e tokens BoardUI) antes de mexer em código. Segurança e invariantes do `AGENTS.md` da raiz **não mudam**.
2. Tokens: reescrever `src/styles/aelo-tokens.css` com os valores acima, mantendo os nomes semânticos que os componentes já usam. Atualizar `aelo-tokens.test.ts` para os novos pares.
3. Componentes `components/ui/*` primeiro (botão, campo, selo, painel), depois layout (rail, cabeçalho), depois páginas.
4. Ordem das páginas: Login, Hoje, Pacientes, Perfil, Editor, Agenda, e por fim Financeiro, Auditoria, Usuários, Configurações.
5. Cada etapa precisa passar `npm run lint`, `npm test` e `npm run build`; testes de layout (`layout-coverage`, `page-navigation`) vão exigir atualização consciente, não remoção.
6. Verificação visual real em navegador com o servidor de desenvolvimento antes de declarar pronto.

## Pendências e riscos

- Renomear a página "Dashboard" para "Hoje" muda rota e testes (`DashboardPage.test.tsx`). Proposta: manter a rota `/dashboard`, trocar só o rótulo.
- Fraunces é nova dependência de fonte; precisa aprovação por causa da CSP e do tamanho do bundle.
- O protótipo usa dados sintéticos do `mockData.ts` e não substitui teste com psicólogos reais.
