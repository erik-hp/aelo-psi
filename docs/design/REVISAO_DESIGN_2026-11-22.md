# Revisão de design: telas principais do AELO-PSI

**Data:** 2026-11-22 · **Nível de maturidade:** L2 (design system "Continuidade" sobre BoardUI) · **Método:** leitura do código das telas, de `aelo-tokens.css` e do `AGENTS.md` do Frontend, mais pesquisa externa.

**Limite desta revisão:** não renderizei o app real (o servidor de desenvolvimento roda em VM sem acesso ao navegador). Os achados vêm do código e do conteúdo das telas. Nada foi testado com usuários.

## O que funciona (manter o princípio, não o estilo)

1. **Separação entre voz do registro e voz da ferramenta** (`aelo-record` serifado, resto sans). É a melhor decisão do sistema atual e continua no novo.
2. **Tokens semânticos com teste de contraste automático** (`aelo-tokens.test.ts`). Continua obrigatório.
3. **Textos honestos**: Auditoria avisa que hash não comprova conformidade; Financeiro avisa que não está integrado. Isso vira padrão de "banner de limite".
4. **Fonte Atkinson Hyperlegible** para a interface: boa escolha de legibilidade.

## Achados

| # | Sev. | Onde | Problema | Esforço | Correção |
|---|------|------|----------|---------|----------|
| 1 | P1 | Dashboard | Hierarquia fraca: 3 botões no cabeçalho + 3 cartões de métrica + hero competem; o que o profissional precisa fazer agora não é o ponto focal. | M | Reorganizar como "Hoje": próxima sessão em destaque, dia em lista, pendências separadas. |
| 2 | P1 | Visual geral | Identidade genérica: neutros frios + verde-água + cartões iguais. Lê como template, não como consultório. Pesquisa de mercado e de UX para saúde mental aponta o frio/cirúrgico como o clichê a evitar. | L | Paleta quente (papel, oliva, argila), serifa expressiva nos títulos. |
| 3 | P1 | Pacientes | Cada paciente é um bloco com 8 informações (idade, terapeuta, duração, periodicidade, próxima sessão, contagens, carga %, tags). Lista longa vira muro de texto. | M | Lista enxuta + painel de resumo ao lado (mestre-detalhe). |
| 4 | P1 | Sidebar | "Pendências de evolução" aparece no menu, no badge da Agenda e no dashboard: três sinais para o mesmo fato. | S | Um badge no menu, o detalhe só em "Hoje". |
| 5 | P1 [cross-dim] | Código | 23 arquivos usam `lucide-react`, 8 usam `@remixicon`, e as regras do BoardUI exigem Remix. Há também `cn` de `@/lib/utils` ao lado de `cx`. Inconsistência visual e de manutenção. | M | Um único conjunto de ícones no novo sistema. |
| 6 | P2 | Perfil do paciente | 482 linhas numa página só; análises, histórico e métricas empilhados. Sessões, que são o núcleo, ficam enterradas. | M | Abas: Sessões, Análises assistivas, Indicadores. |
| 7 | P2 | Editor | Descrição do cabeçalho técnica ("scaffolds estruturados (SOAP/DAP)"). A área de escrita não parece papel; sugestão da IA e conteúdo do autor não se distinguem à primeira vista. | S | Superfície "papel", sugestão em caixa tracejada, assinatura desabilitada até revisão. |
| 8 | P2 | Cópia | Termos internos vazando para a interface: "PSYCHOLOGIST" no filtro de Auditoria; "Efeito Zeigarnik" em comentários de componente de UI; "Hero Card". | S | Rótulos em português, comentários fora do JSX visível. |
| 9 | P2 | Forma | Raio 14 px, sem sombra e bordas de mesma cor em todas as camadas: tudo no mesmo plano. | S | Profundidade leve e raios maiores nos painéis. |
| 10 | P3 | Agenda | 918 linhas e três modais; a lista do dia e a ação mais comum (abrir editor) têm o mesmo peso dos menus secundários. | M | Faixa de dias + lista com uma ação principal por linha. |

## Comparação com o que a pesquisa indica

- Um artigo de 2026 na Smashing Magazine defende paleta terrosa, sem neon, e **sem animação súbita** em produtos de saúde mental.
- O mesmo debate ressalva que **moda de UI não deve guiar** esse tipo de produto. Por isso o novo sistema evita glassmorfismo e gradientes chamativos que as vitrines de "mental wellness" usam.
- A agência por trás da rebranding da Talkspace afirma que o visual padrão do setor é "frio" e que terapia deve ser "suave". Fonte de apoio ao achado 2, não prova de que o público do AELO prefere isso.

**Ressalva importante:** os usuários do AELO são psicólogos trabalhando, não pacientes em crise. "Acolhedor" aqui significa menos ruído e mais calma na rotina, nunca contraste baixo ou densidade perdida.

## Veredito

Direção atual: **funcional e honesta, mas sem personalidade e com hierarquia confusa** nas telas de maior uso. O problema principal é de **composição das telas** (achados 1, 3, 6), mais do que de cor.
