# Marco jurídico e ético brasileiro para envio de notas de psicoterapia a LLM em nuvem (situação em 6 de novembro de 2026)

**Natureza deste documento:** pesquisa, não parecer jurídico. Em cada questão, "Cited Findings" traz o texto da norma ou o fato verificado; "Inferences" traz interpretação minha, que nenhuma autoridade confirmou. O rótulo **[ADVOGADO/CFP]** marca pontos que exigem parecer profissional ou consulta formal ao Conselho. **[NÃO CONFIRMADO]** marca o que não pude verificar em fonte primária.

**Método e limites de acesso:** LGPD, Lei 13.787, Lei 14.510, Código Penal, Código de Ética do Psicólogo, Res. CFP 1/2009, Res. CFP 6/2019, Res. CD/ANPD 2/2022, 15/2024, 18/2024 e 19/2024, nota do CFP de julho e de setembro de 2025, Manual Orientativo (2025), Guia de IA (dez. 2025), texto do PL 2338 e 45 CFR 164 foram lidos diretamente (citações literais extraídas dos documentos). `atosoficiais.com.br/cfp` e a lista oficial de resoluções do CFP retornaram erro (HTTP 403 e 500), portanto **não consegui varrer exaustivamente as resoluções do CFP de 2026**. A Res. 9/2024 foi lida em republicação (Normas Brasil), não no DOU. A Res. ANPD 32/2026 foi lida em republicação (higa.me) e confirmada pela página oficial da ANPD.

---

## Mapa-síntese: requerido, proibido, indeterminado

Cenário: clínica envia excertos pseudonimizados de notas de psicoterapia a uma API de LLM estrangeira.

| Norma | Exige | Proíbe | Indeterminado |
|---|---|---|---|
| LGPD art. 5º, 12, 13 | Tratar excerto pseudonimizado como dado pessoal sensível, salvo prova de anonimização efetiva | n/a | Se o texto narrativo pode alcançar anonimização; se o dado é "pessoal" para o provedor sem a chave |
| LGPD art. 11 | Hipótese do art. 11 + "indispensável" nas do inciso II | Legítimo interesse não consta do art. 11 | Se II "f" cobre um terceiro LLM; se consentimento é obrigatório (a lei não diz isso) |
| LGPD art. 11 § 4º | Verificar se há compartilhamento "entre controladores" com vantagem econômica | Comunicação entre controladores para vantagem econômica (com exceções) | Se treino pelo provedor o torna controlador e dispara a vedação |
| LGPD art. 33 + Res. 19/2024 | Mecanismo válido + hipótese legal; SCC integrais da ANPD para destinos sem adequação; documento público de transparência | Transferência sem mecanismo | Se provedores oferecem as SCC brasileiras (não confirmado) |
| Res. 32/2026 | UE/EEE: adequação dispensa SCC | n/a | Quando o importador real está na UE, mas há subprocessamento nos EUA |
| LGPD art. 37, 39, 41, 46, 48 | Registro, instruções ao operador, encarregado, segurança, incidente | n/a | RIPD: obrigatório só se a ANPD determinar (art. 38); regulamento pendente |
| Código de Ética (CEPP) art. 9º, 14, 6º "b" | Sigilo; informar o usuário desde o início sobre meios de registro | Quebra fora do art. 10 | Se envio a operador sob contrato é "revelação" |
| Res. CFP 9/2024 art. 7º par. único | Especificar e informar recursos tecnológicos que garantem sigilo (serviços mediados por TDIC) | n/a | Se clínica presencial que usa LLM cai no art. 2º/3º |
| Guia de IA CFP (orientativo) | "Evite"; se absolutamente necessário, anonimizar, contrato, bases privadas, consentimento registrado, desativar treino | "Não insira prontuários, nomes e itens identificáveis" (orientação, não norma sancionatória autônoma) | Força disciplinar; conflito entre "não insira prontuários" e excertos |
| Código Penal art. 154 | n/a | Revelar segredo profissional sem justa causa com potencial de dano | "Revelação" a processador contratado; consentimento como justa causa |
| PL 2338/2023 | Nada: não é lei | Nada | Texto final; art. 14 VIII do texto do Senado |

**Conclusão central:** não encontrei norma brasileira vigente que proíba categoricamente enviar notas a um LLM. Tampouco há norma que autorize de modo seguro. O CFP desaconselha expressamente e pede, se inevitável, um conjunto cumulativo de salvaguardas. Pseudonimização não retira o dado da LGPD. Consentimento não é exigido pelo texto da LGPD em todos os casos, mas o CFP o trata como condição, então na prática ética ele é o caminho defensável.

---

## Correções de premissas do pedido

### Takeaway
Quatro premissas da pauta precisam de ajuste: a Nota Técnica CFP 12/2025 não trata de IA nem de TDIC como tema principal; a pseudonimização do art. 13 está definida "para os efeitos deste artigo"; o art. 11 § 4º foi reescrito em 2019; e a ANPD agora é agência.

### Cited Findings
- **Nota Técnica CFP nº 12/2025 trata de pessoas com deficiência**, não de TDIC ou IA: "Orientação às psicólogas e psicólogos para atuação junto a pessoas com deficiência". A expressão "inteligência artificial" não aparece no documento. Seu item 4.6 toca TDIC e diz ser "crucial assegurar a confidencialidade e segurança dos dados, utilizando plataformas seguras e criptografadas" e "obtendo consentimento informado [...] de maneira explícita e acessível" — [NT CFP 12/2025](https://site.cfp.org.br/wp-content/uploads/2025/09/SEI_2144880_Nota_Tecnica_12.pdf)
- Existe uma **Nota Técnica nº 12/2025/CON1/CGN/ANPD**, esta sim sobre IA: consolida contribuições da Tomada de Subsídios sobre art. 20 e IA — [ANPD, Agenda Regulatória](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1); [NT ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts-06-2024-nt-12-2025-consolidacao-das-contribuicoes.pdf/@@display-file/file)
- A ANPD virou "Agência Nacional de Proteção de Dados". O Capítulo IX da LGPD e o art. 5º VIII e XIX têm redação da Lei 15.352/2026. O art. 5º VIII agora diz "pessoa indicada pelo controlador e operador" — [LGPD compilada](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). A lei é de 25/02/2026, conversão da MP 1.317/2025 — [Câmara, Legin](https://www2.camara.leg.br/legin/fed/lei/2026/lei-15352-25-fevereiro-2026-798731-norma-pl.html). Na compilação do Planalto, as marcas de "Lei nº 15.352" estão nos arts. 5º e no capítulo institucional, não nos arts. 7º e 11 — [LGPD compilada](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

### Inferences
- Citar a NT 12/2025 como norma sobre TDIC ou IA em trabalho acadêmico seria erro. A hipótese provável é confusão com a NT ANPD de mesmo número. Se a pauta se referia a outro documento, ele não foi localizado.

### Gaps
- Não encontrei outra Nota Técnica do CFP de 2025 específica sobre TDIC. As notas 11, 18, 23, 25, 32 e 44/2025 têm páginas no site do CFP, mas não abri seus conteúdos.

---

## LGPD: pseudonimizado ainda é dado pessoal? Consentimento é obrigatório?

### Takeaway
Texto de psicoterapia pseudonimizado continua sendo, com alta segurança interpretativa, dado pessoal sensível. Consentimento **não** é obrigatório pelo texto da LGPD: é uma entre várias hipóteses. Mas as alternativas sem consentimento exigem "indispensável" e, para II "f", um sujeito restrito, e encaixam mal em um LLM de terceiro.

### Cited Findings

**Texto legal — definições** ([LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm))
- Art. 5º I: "dado pessoal: informação relacionada a pessoa natural identificada ou identificável".
- Art. 5º II: "dado pessoal sensível: dado pessoal sobre [...] dado referente à saúde ou à vida sexual [...] quando vinculado a uma pessoa natural".
- Art. 5º III: "dado anonimizado: dado relativo a titular que não possa ser identificado, considerando a utilização de meios técnicos razoáveis e disponíveis na ocasião de seu tratamento".
- Art. 5º VI e VII: controlador é "a quem competem as decisões referentes ao tratamento"; operador "realiza o tratamento de dados pessoais em nome do controlador".
- Art. 5º XI: anonimização é "utilização de meios técnicos razoáveis e disponíveis no momento do tratamento, por meio dos quais um dado perde a possibilidade de associação, direta ou indireta, a um indivíduo".

**Texto legal — anonimização e pseudonimização**
- Art. 12: "Os dados anonimizados não serão considerados dados pessoais para os fins desta Lei, salvo quando o processo de anonimização ao qual foram submetidos for revertido, utilizando exclusivamente meios próprios, ou quando, com esforços razoáveis, puder ser revertido."
- Art. 12 § 1º: o razoável considera "fatores objetivos, tais como custo e tempo necessários para reverter o processo de anonimização, de acordo com as tecnologias disponíveis, e a utilização exclusiva de meios próprios".
- Art. 12 § 2º: "Poderão ser igualmente considerados como dados pessoais [...] aqueles utilizados para formação do perfil comportamental de determinada pessoa natural, se identificada."
- Art. 13 § 4º: "Para os efeitos deste artigo, a pseudonimização é o tratamento por meio do qual um dado perde a possibilidade de associação, direta ou indireta, a um indivíduo, senão pelo uso de informação adicional mantida separadamente pelo controlador em ambiente controlado e seguro."
- Art. 13 caput: refere-se a "estudos em saúde pública" por "órgãos de pesquisa".
- Art. 13 § 2º: "não permitida, em circunstância alguma, a transferência dos dados a terceiro" (aplica-se ao órgão de pesquisa neste regime).

**ANPD sobre pseudonimização**
- Estudo técnico da ANPD: "a identificação dos titulares dos dados permanece possível a partir do acesso ao segredo de pseudonimização, mantido separadamente" — [ANPD, Estudo técnico sobre anonimização: análise jurídica](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd___analise_juridica.pdf/@@display-file/file). O mesmo estudo descreve o conceito como substituição de identificadores diretos por pseudônimos.
- Segundo resumo de escritório, o estudo preliminar diz que, quando a reversão puder ser feita com meios próprios, "potencialmente estaremos diante de mera pseudonimização"; e que ilícitos ou crimes cibernéticos são esforços irrazoáveis — [Mayer Brown](https://www.mayerbrown.com/pt/insights/publications/2024/02/anonymization-and-pseudonymization-anpd-kicks-off-public-consultation-on-preliminary-study) (secundário).
- Estado do guia: item "Anonimização e pseudonimização" segue "Em andamento"; a consulta sobre o estudo preliminar ocorreu de janeiro a março de 2024 e nenhuma fase posterior está listada — [Agenda Regulatória, tabela atualizada em 20/10/2026](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1). Ou seja, **não há guia final**.

**Texto legal — hipóteses**
- Art. 11, caput: "O tratamento de dados pessoais sensíveis somente poderá ocorrer nas seguintes hipóteses".
- Art. 11 I: "quando o titular ou seu responsável legal consentir, de forma específica e destacada, para finalidades específicas".
- Art. 11 II: "sem fornecimento de consentimento do titular, nas hipóteses em que for indispensável para:" (a) obrigação legal ou regulatória; (d) "exercício regular de direitos, inclusive em contrato e em processo judicial, administrativo e arbitral"; (e) proteção da vida; (f) "tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária" (redação da Lei 13.853/2019).
- Art. 7º IX (legítimo interesse) **não tem correspondente** no art. 11 II.
- Art. 11 § 1º: aplica-se "a qualquer tratamento de dados pessoais que revele dados pessoais sensíveis e que possa causar dano ao titular".
- Art. 11 § 4º: "É vedada a comunicação ou o uso compartilhado entre controladores de dados pessoais sensíveis referentes à saúde com objetivo de obter vantagem econômica, exceto nas hipóteses relativas a prestação de serviços de saúde, de assistência farmacêutica e de assistência à saúde, desde que observado o § 5º deste artigo, incluídos os serviços auxiliares de diagnose e terapia, em benefício dos interesses dos titulares de dados, e para permitir: I - a portabilidade de dados quando solicitada pelo titular; ou II - as transações financeiras e administrativas resultantes do uso e da prestação dos serviços de que trata este parágrafo."
- Art. 7º § 5º: controlador que obteve consentimento e precisa "comunicar ou compartilhar dados pessoais com outros controladores deverá obter consentimento específico do titular para esse fim".
- Art. 7º § 6º: dispensa de consentimento "não desobriga os agentes de tratamento das demais obrigações".
- Art. 6º I, II, III, VI, VII, X: finalidade, adequação, necessidade ("limitação do tratamento ao mínimo necessário"), transparência, segurança, responsabilização.
- Art. 20: direito de revisão de "decisões tomadas unicamente com base em tratamento automatizado de dados pessoais que afetem seus interesses". Parâmetros interpretativos do art. 20 estão na agenda da ANPD, não editados — [Agenda](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1).

**Papel de cada agente**
- Guia ANPD: "não são controladoras as pessoas naturais que atuam como profissionais subordinados a uma pessoa jurídica"; pessoa natural pode ser controladora quando age "de forma independente e em nome próprio", caso dos "profissionais liberais (como advogados, contadores e médicos)" — [ANPD, Guia de Agentes v2](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/Segunda_Versao_do_Guia_de_Agentes_de_Tratamento_retificada.pdf/@@display-file/file). Psicólogos não são citados nominalmente.
- Mesmo Guia: "o suboperador é aquele contratado pelo operador para auxiliá-lo [...]. A relação direta do suboperador é com o operador e não com o controlador."
- Radar Tecnológico nº 3 (ANPD, nov. 2024): trata o compartilhamento pelo usuário via prompt como etapa própria e afirma que atribuir responsabilidade ao usuário "não parece ser suficiente" — [ANPD, Radar IA Generativa](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/radar_tecnologico_ia_generativa_anpd.pdf). Segundo o FPF, o estudo indica que usuários que compartilham dados de terceiros por prompt podem ser considerados agentes de tratamento, e não é orientação legal formal — [FPF](https://fpf.org/blog/brazils-anpd-preliminary-study-on-generative-ai-highlights-the-dual-nature-of-data-protection-law-balancing-rights-with-technological-innovation/).

### Inferences
- **Pseudonimizado continua pessoal.** A LGPD só exclui dados "anonimizados" (art. 12). Pseudonimizado não está excluído em nenhum dispositivo. Como a própria definição pressupõe chave "mantida separadamente pelo controlador", a clínica pode reverter por meios próprios, o que já é a ressalva do art. 12. A extensão do § 4º do art. 13 para fora de pesquisa em saúde pública é **analogia**; o texto diz "para os efeitos deste artigo".
- **Ponto aberto:** para o provedor, sem a chave, o dado é pessoal? O art. 12 fala em "meios próprios", e isso daria um argumento relativo. Não encontrei posição da ANPD. Prudente: não depender dele, porque a clínica, controladora, segue tratando dado pessoal ao transmitir. **[ADVOGADO]**
- **Texto narrativo é pior que tabela.** Nota de psicoterapia traz parentes, empregador, lugares, eventos raros. A remoção de identificadores diretos pode não bastar para o teste do art. 5º III e art. 12. NER não garante anonimato, o que coincide com o AGENTS.md do projeto. Recomenda-se presumir pseudonimização, nunca anonimização, salvo avaliação documentada de reidentificação.
- **Consentimento não é universalmente obrigatório na LGPD:** o art. 11 oferece alternativas, sem hierarquia textual.
  - **II "f" (tutela da saúde):** o tratamento pelo psicólogo ou serviço de saúde tem base plausível. O envio a um LLM exige demonstrar que é "indispensável". Se a ferramenta é conveniência (resumir nota), a indispensabilidade é fraca, porque o cuidado existe sem ela. Além disso, "exclusivamente, em procedimento realizado por profissionais de saúde": o argumento favorável é que o operador age em nome do controlador; o contrário é que um fornecedor de IA não é profissional de saúde. Não localizei posição oficial. **[ADVOGADO]**
  - **II "a" (obrigação legal):** cobre registrar o prontuário (Res. CFP 1/2009), não enviá-lo a um LLM.
  - **II "d" (exercício de direitos em contrato):** não parece aderente a uma funcionalidade de produto.
  - **Legítimo interesse:** indisponível para dado sensível, por ausência no art. 11.
  - **Síntese:** o consentimento específico e destacado é a via mais defensável, por dois motivos somados: fragilidade das demais e exigência ética do CFP. Mas ele tem problemas: assimetria paciente-terapeuta afeta "livre" (art. 5º XII); é revogável "a qualquer momento [...] por procedimento gratuito e facilitado" (art. 8º § 5º); é nulo se as informações forem enganosas ou não apresentadas previamente com transparência (art. 9º § 1º); e condicionar o atendimento a ele colide com o Guia do CFP, que afirma o direito de recusa "sem que isso gere qualquer prejuízo ao seu acesso aos serviços psicológicos". Assim, o sistema precisa funcionar integralmente sem o LLM para quem recusar.
- **Art. 11 § 4º:** vale "entre controladores". Provedor como **operador** puro, sem uso próprio, tende a ficar fora. Se o provedor usa o dado para treino ou melhoria própria, age por finalidade própria, tende a ser controlador, e o § 4º pode incidir (há "vantagem econômica"). Daí desativar treino é requisito jurídico, não só boa prática. Não há decisão da ANPD; o tema "compartilhamento com fins econômicos" está na agenda de dados de saúde. **[ADVOGADO]**
- **Papéis no cenário:** clínica PJ = controladora; psicólogo empregado ou subordinado = não é agente (mas segue responsável ética e penalmente); psicólogo autônomo em consultório próprio = controlador por analogia ao Guia; provedor = operador se seguir instruções (art. 39), controlador se definir finalidades; subprocessadores do provedor = suboperadores.
- **Art. 20:** só incide em decisão **unicamente** automatizada; rascunho revisado por humano tende a ficar fora. Coerente com a regra do projeto sobre revisão humana.

### Gaps
- Nenhuma manifestação da ANPD específica sobre pseudonimização de texto clínico ou prompts em saúde.
- Sem decisão ou guia sobre a extensão de "tutela da saúde" a fornecedores de tecnologia. A agenda indica que esse será o tema do regulamento de saúde.

---

## ANPD: transferência internacional, adequação, pequeno porte, RIPD, IA e regulação 2025-2026

### Takeaway
Envio a API nos EUA exige hipótese legal **e** mecanismo; a via usual são as cláusulas-padrão da ANPD, integrais e sem alteração (prazo de adaptação encerrado em 23/08/2025). Para UE/EEE, há adequação desde janeiro de 2026. Nenhum regulamento de dados de saúde ou IA foi editado: ambos seguem pendentes em 20/10/2026.

### Cited Findings

**Transferência: LGPD**
- Art. 5º XV: "transferência de dados pessoais para país estrangeiro ou organismo internacional do qual o país seja membro".
- Art. 33: "somente é permitida nos seguintes casos": I adequação; II garantias (cláusulas específicas, padrão, normas corporativas globais, selos); IV proteção da vida; VIII "quando o titular tiver fornecido o seu consentimento específico e em destaque para a transferência, com informação prévia sobre o caráter internacional da operação, distinguindo claramente esta de outras finalidades"; IX "quando necessário para atender as hipóteses previstas nos incisos II, V e VI do art. 7º" — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- Art. 36: alterações nas garantias "deverão ser comunicadas à autoridade nacional".

**Transferência: Res. CD/ANPD 19/2024** ([DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-19-de-23-de-agosto-de-2024-580095396))
- Art. 2º par. único da Resolução: agentes que usam cláusulas contratuais "deverão incorporar as cláusulas-padrão contratuais aprovadas pela ANPD [...] no prazo de até 12 (doze) meses". O prazo acabou em 23/08/2025 — [Lefosse](https://lefosse.com/noticias/alerta/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/).
- Regulamento, art. 3º: exportador é "agente de tratamento, localizado no território nacional ou em país estrangeiro, que transfere dados pessoais para importador"; transferência é operação pela qual um agente "transmite, compartilha ou disponibiliza acesso a dados pessoais a outro agente de tratamento".
- Art. 3º V e art. 6º: coleta internacional (direta do titular pelo agente no exterior) "não caracteriza transferência internacional de dados".
- Art. 4º: "Cabe ao controlador verificar" se a operação caracteriza transferência, se submete-se à lei nacional e se "está amparada em hipótese legal e em mecanismo de transferência internacional válidos". § 1º: operador presta auxílio.
- Art. 9º: exige cumulativamente "uma das hipóteses legais previstas no art. 7º ou no art. 11" e um mecanismo válido. Par. único: limite "ao mínimo necessário".
- Art. 16: validade "pressupõe a adoção integral e sem alteração do texto disponibilizado no Anexo II".
- Art. 17: controlador disponibiliza a íntegra das cláusulas se solicitado, em 15 dias; § 2º: deve "publicar em sua página na Internet documento [...] em língua portuguesa, em linguagem simples" com forma, duração, finalidade, país de destino, contatos, uso compartilhado, responsabilidades, segurança, direitos.
- Art. 7º par. único do Regulamento: aplicação "independe do meio utilizado para sua realização, do país de sede dos agentes de tratamento ou do país onde estejam localizados os dados".
- O presidente da ANPD disse que quem não adotou SCC pode estar conforme por outro mecanismo do art. 33, mas quem depende delas pode ser fiscalizado — [Migalhas](https://www.migalhas.com.br/quentes/449475/envio-de-dados-ao-exterior-esta-no-radar-fiscalizatorio-da-anpd) (secundário).

**Adequação**
- Res. CD/ANPD 32/2026, de 26/01/2026: "Fica reconhecida a União Europeia como organismo internacional que proporciona grau de proteção de dados pessoais adequado", alcançando "todos os Estados membros da União Europeia, os três países da Associação Europeia de Livre Comércio - AELC que integram o Espaço Econômico Europeu - EEE (Islândia, Liechtenstein e Noruega), bem como as instituições, órgãos e agências da União Europeia"; exclui fins exclusivos de segurança pública, defesa etc.; monitoramento contínuo — [texto reproduzido em higa.me](https://higa.me/notas/normas/resolucao-anpd-32). Republicação indica DOU de 27/01/2026; uma notícia diz 26/01.
- Página oficial da ANPD lista **somente a União Europeia**; adequação concedida por outros países não vale no Brasil — [ANPD, Transferência Internacional](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados).
- **Estados Unidos:** não listados. Via usual: SCC — [Confidata](https://confidata.com.br/blog/transferencia-internacional-dados-atualizacao-anpd-2026) (secundário, comercial).
- A reciprocidade pela UE é referida por escritório — [Cescon Barrieu](https://cesconbarrieu.com.br/decisao-de-adequacao-reciproca-entre-brasil-e-uniao-europeia-implicacoes-para-fluxos-transfronteiricos-de-dados/).

**Pequeno porte e encarregado**
- Res. 2/2022, art. 3º: não se beneficiam os agentes que "realizem tratamento de alto risco para os titulares, ressalvada a hipótese prevista no art. 8º", ou que excedam receita do art. 3º, II da LC 123 — [DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019).
- Art. 4º: alto risco exige "cumulativamente a pelo menos um critério geral e um critério específico". Gerais: larga escala; ou tratamento que "possa afetar significativamente interesses e direitos fundamentais". Específicos: "uso de tecnologias emergentes ou inovadoras"; decisões unicamente automatizadas; "utilização de dados pessoais sensíveis ou de dados pessoais de crianças, de adolescentes e de idosos".
- Art. 2º I inclui "pessoas naturais [...] assumindo obrigações típicas de controlador ou de operador".
- Art. 11: pequeno porte "não são obrigados a indicar o encarregado". Art. 11 § 1º: quem não indicar "deve disponibilizar um canal de comunicação com o titular de dados".
- LGPD art. 41: "O controlador deverá indicar encarregado". Res. 18/2024 art. 3º: indicação "por ato formal"; art. 6º: facultativa para operadores — [DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074). Atenção à tensão com a nova redação do art. 5º VIII ("controlador e operador"), posterior à resolução.

**RIPD, incidente, segurança**
- LGPD art. 38: "A autoridade nacional poderá determinar ao controlador que elabore relatório de impacto". Não há regra geral automática. Item RIPD está em "elaboração interna", sem consulta — [Agenda](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1).
- Art. 46 caput e § 2º (segurança desde a concepção); art. 49. Art. 37 registro das operações; art. 39 instruções ao operador.
- Art. 48 e Res. 15/2024: comunicar ANPD e titular, em ambos os casos "no prazo de três dias úteis" (arts. 6º e 9º) — [DOU](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024). Art. 5º trata do incidente relevante; secundários informam prazo em dobro para pequeno porte — [Cnb/SP e outros](https://cnbsp.org.br/2024/06/03/artigo-implementacao-da-comunicacao-de-incidente-de-seguranca-sobre-a-otica-da-resolucao-cd-anpd-15-por-luiz-henrique-de-cristo/).

**Regulação em aberto (tabela da ANPD atualizada em 20/10/2026)**
- **Dados de saúde (item 12):** "em fase de elaboração interna", sem consulta, sem documentos — [Agenda](https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1). Resumo da Res. CD/ANPD 31/2025 cita compartilhamento com fins econômicos, conceitos, bases legais e especificidades setoriais, Fase 2 — [okai.com.br](https://okai.com.br/documento/2025-12-24/resolucao-cd-anpd-nº-31-de-22-de-dezembro-de-2025) (secundário).
- **IA (item 6):** tomada de subsídios concluída (nov. 2024 a jan. 2025), contribuições consolidadas (NT 12/2025), sem regulamento.
- **Biometria (item 4):** subsídios concluídos.
- Radar nº 3 data de 29/11/2024; a versão em inglês teve notícia em 2026 — [ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-releases-english-version); FPF fala em dezembro de 2024, divergência não resolvida.

### Inferences
- **Fluxo clínica → API = transferência internacional, em regra.** A clínica (agente) transmite ao provedor (agente) no exterior. Não é "coleta internacional", pois o paciente não fornece direto ao provedor. Se o paciente usa o chatbot por conta própria, o enquadramento muda.
- **API em região brasileira de nuvem:** se o provedor processa no Brasil, pode não haver transferência, mas subprocessamento e acesso remoto do exterior podem configurá-la ("disponibiliza acesso"). Exige verificação contratual. **[ADVOGADO]**
- **UE:** se o importador é entidade na UE/EEE, art. 33 I basta; mas a hipótese do art. 11 continua exigida (Regulamento art. 9º), e transferências posteriores para EUA precisam de análise. Adequação não resolve base legal nem sigilo.
- **Consentimento como mecanismo (art. 33 VIII)** é possível para destino não adequado, mas tem que ser separado e específico sobre o caráter internacional. Pode conviver com SCC.
- **Art. 33 IX** remete a art. 7º II, V, VI, não ao VIII (tutela da saúde). Logo a base "tutela da saúde" não é, sozinha, mecanismo de transferência.
- **Clínica pequena provavelmente é "alto risco":** dados sensíveis (critério específico) + potencial de afetar direitos, ou tecnologia emergente, mais critério geral "afetar significativamente". Isso pode retirar os benefícios da Res. 2/2022, incluindo dispensa de encarregado e prazos em dobro. Decidir caso a caso. **[ADVOGADO]**
- **RIPD:** obrigatoriedade formal só por determinação, mas para este cenário é a evidência natural de art. 6º X. Recomendável como prática, não como obrigação textual.
- **Dificuldade prática das SCC:** o Regulamento exige adoção integral e sem alteração, o que é difícil com termos padronizados de fornecedor global.

### Gaps
- **Não localizei confirmação de que OpenAI, Anthropic, Google ou outros ofereçam as SCC da ANPD.** Existe DPA da OpenAI em português ([OpenAI](https://openai.com/pt-BR/policies/data-processing-addendum/)), mas não verifiquei se incorpora as SCC brasileiras. Isso é decisivo e deve ser verificado no contrato vigente de cada fornecedor. **[NÃO CONFIRMADO]**
- Sem texto final de regulamento de saúde ou IA. Qualquer projeção é especulação.
- Não encontrei decisões da ANPD sobre transferência para provedor de LLM em saúde.

---

## CFP: o que vigora, o que se proíbe e o que deve ser informado ao paciente

### Takeaway
Nenhuma resolução do CFP encontrada proíbe enviar notas a IA ou a terceiros; não localizei resolução específica de IA, com a ressalva da varredura incompleta. A orientação mais direta é o Guia de dez. 2025: "Evite. [...] Não insira prontuários, nomes e itens identificáveis". As fontes vinculantes são o Código de Ética (art. 9º, 14, 6º "b"), Res. 1/2009, Res. 6/2019 e Res. 9/2024.

### Cited Findings

**Normas vinculantes**
- CEPP art. 9º: "É dever do psicólogo respeitar o sigilo profissional a fim de proteger, por meio da confidencialidade, a intimidade das pessoas, grupos ou organizações, a que tenha acesso no exercício profissional." — [Código de Ética](https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf)
- Art. 10: "excetuando-se os casos previstos em lei, o psicólogo poderá decidir pela quebra de sigilo, baseando sua decisão na busca do menor prejuízo"; par. único: "restringir-se a prestar as informações estritamente necessárias".
- Art. 14: "A utilização de quaisquer meios de registro e observação da prática psicológica obedecerá às normas deste Código e a legislação profissional vigente, devendo o usuário ou beneficiário, desde o início, ser informado."
- Art. 6º "b" (relação com não psicólogos): "Compartilhará somente informações relevantes para qualificar o serviço prestado, resguardando o caráter confidencial das comunicações, assinalando a responsabilidade, de quem as receber, de preservar o sigilo."
- Art. 1º "e", "f": acordos que respeitem direitos; informações sobre o trabalho. Art. 13: criança e adolescente, comunicar aos responsáveis "o estritamente essencial".
- Art. 16 (pesquisa e tecnologias): avaliar riscos; "Garantirá o anonimato"; consentimento livre e esclarecido.
- Art. 21: advertência, multa, censura pública, suspensão até 30 dias, cassação.
- **Res. 1/2009:** art. 1º § 1º: registro "tem caráter sigiloso"; art. 4º: guarda "de responsabilidade do psicólogo e/ou da instituição"; § 1º: mínimo de 5 anos; § 2º: "local que garanta sigilo e privacidade"; art. 5º II: "acesso integral" do usuário ao prontuário; art. 6º: serviço multiprofissional em prontuário único — [Res. 1/2009](https://site.cfp.org.br/wp-content/uploads/2009/04/resolucao2009_01.pdf).
- **Vigência da Res. 1/2009:** o Manual Orientativo publicado pelo CFP em nov. 2025 a trata como vigente ("atualizada para a Resolução CFP nº. 05/2010"); a Res. 6/2019 remete a ela "ou outras que venham a alterá-la" — [Manual](https://site.cfp.org.br/wp-content/uploads/2025/11/Manual_Orientativo.pdf); [Res. 6/2019](https://site.cfp.org.br/wp-content/uploads/2019/09/Resolu%C3%A7%C3%A3o-CFP-n-06-2019-comentada.pdf). A Res. 5/2010 renumerou incisos do art. 2º (antigo VI virou V e antigo V virou VI) — [LegisWeb](https://www.legisweb.com.br/legislacao/?id=112145). Busca não achou revogação em 2026.
- **Res. 6/2019:** revogou Res. 15/1996, 7/2003 e 4/2019, cuida de documentos escritos; art. 15: guarda de "todo o material que os fundamentaram, sejam eles em forma física ou digital" por cinco anos, responsabilidade do psicólogo "em conjunto com a instituição". Não revogou a 1/2009.
- **Res. 9/2024** ([texto em Normas Brasil](https://www.normasbrasil.com.br/norma/resolucao-9-2024_462577.html)):
  - Art. 2º: atividade que "envolva emprego eventual ou frequente das TDICs para as comunicações entre as partes envolvidas no serviço, incluindo [...] emprego de métodos e técnicas psicológicas dependentes de servidores remotos, entre outras".
  - Art. 3º II: "registro e guarda de informações, considerando a responsabilidade ética no manuseio de dados sensíveis e suas implicações com o sigilo profissional"; IV: "zelo pelo aspecto ético sendo responsável por dados e informações sensíveis".
  - Art. 3º § 1º: é da profissional "avaliar a viabilidade e adequação das TDICs".
  - Art. 4º I: avaliar "as condições contextuais e tecnológicas de confidencialidade e privacidade das informações".
  - Art. 4º V: considerar produções científicas e éticas.
  - Art. 7º II: contrato abarca "os recursos tecnológicos que serão utilizados, bem como as especificidades destes".
  - Art. 7º par. único: "A psicóloga estará obrigada a especificar quais são os recursos tecnológicos utilizados para garantir o sigilo das informações e informar o cliente sobre isso."
  - Art. 8º: deve cumprir as demais normas de guarda e registro.
  - **Não menciona inteligência artificial** nem LGPD por nome no texto lido.

**Orientações (não são resoluções)**
- **Nota de 03/07/2025 (posicionamento):** data via [CRP-RS](https://crprs.org.br/noticias/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica). Texto: "transcrição automática de sessões, análise de linguagem emocional e [...] sugestão de hipóteses diagnósticas [...] devem ocorrer sempre sob supervisão crítica"; o uso, "inclusive aquelas desenvolvidas por terceiros, não isenta psicólogas e psicólogos de sua responsabilidade ética e técnica"; "qualquer coleta, análise ou processamento de dados psicológicos com apoio de IA esteja sempre precedido de consentimento livre, informado, transparente" — [CFP](https://site.cfp.org.br/cfp-divulga-posicionamento-sobre-inteligencia-artificial-no-contexto-da-pratica-psicologica/).
- **Nota nº 5/2025 (05/09/2025):** sobre o programa "e-Saúde Mental no SUS"; cita que na Austrália hospitais foram orientados "a suspender o uso do ChatGPT em prontuários"; "Supervisão humana obrigatória"; cita Anvisa RDC 657/2022 para software diagnóstico; diz "não se opõe ao uso de tecnologias e inovação" — [Nota 5/2025](https://site.cfp.org.br/wp-content/uploads/2025/09/SEI_CFP-2402857-Nota.pdf).
- **Manual Orientativo (2025), questão 16:** "Sim, é possível, desde que resguardados os cuidados éticos, técnicos e legais e de sigilo profissional"; IA pode auxiliar "organização, redação e padronização"; "O conteúdo clínico (interpretações, conclusões, hipóteses diagnósticas) deve ser sempre elaborado exclusivamente pela psicóloga"; "evitando inserir informações sensíveis em sistemas de IA, sem respaldo legal ou ético"; "O CFP determina que a responsabilidade sobre qualquer documento psicológico é integralmente da profissional" — [Manual](https://site.cfp.org.br/wp-content/uploads/2025/11/Manual_Orientativo.pdf).
- **Guia "Inteligência Artificial na Psicologia" (dez. 2025)** ([Guia](https://site.cfp.org.br/wp-content/uploads/2025/12/Cartilha_IA_A5-1.pdf)):
  - Q9: "Posso inserir dados de pacientes/clientes/usuários? Evite. Se for absolutamente necessário, anonimize rigorosamente, use soluções com contratos de confidencialidade e bases privadas e registre o consentimento do atendido. Não insira prontuários, nomes e itens identificáveis e desative treinamento com seus dados."
  - Psicoterapia: "O uso de IA para gravar e transcrever material de atendimento precisa ser realizado com o consentimento informado do atendido e em plataformas que o profissional conheça as condições de privacidade e armazenamento dos dados."
  - Prontuários: "seu uso no apoio na sistematização de prontuários e organização de dados clínicos, necessita da devida preocupação com o armazenamento e sigilo dos dados."
  - Exemplo 4: nuvem "sem contrato específico de confidencialidade e sem garantia de que esses dados não serão utilizados para treinar modelos"; "O uso não informado de gravações pode configurar quebra de sigilo e infração ética, além de infringir a LGPD ao tratar dados sensíveis sem base legal adequada. [...] o consentimento deve ser prévio, específico e registrado".
  - Art. 18 CEPP: lido pelo Guia como vedando "a disponibilização de dados em plataformas que possibilitem usos indevidos, sem controle profissional".
  - Q8: uso ético "como ferramenta de apoio com supervisão técnica, registro crítico do uso e sem violar sigilo/consentimento".
  - Q10: rascunho possível com "revisão integral, autoria assumida e transparência de que foi ferramenta de apoio".
  - "não devem ser usados assistentes virtuais, chatbots, avatares ou robôs para condução autônoma de psicoterapia".
  - Recusa e revogação: "O paciente/cliente/usuário tem o direito de recusar o uso da ferramenta de IA, sem que isso gere qualquer prejuízo ao seu acesso aos serviços psicológicos com o profissional. Assim como tem o direito de revogar (cancelar) seu consentimento a qualquer momento, de forma fácil, gratuita e sem necessidade de justificativa."

**Regional**
- Nenhuma orientação de CRP específica sobre IA ou ChatGPT em prontuário foi localizada. Material do CRP-SP sobre prontuários trata do tema geral: em psicoterapia na saúde, o registro deve ser em prontuário, de livre acesso ao usuário — [CRP-SP](https://www.crpsp.org/uploads/impresso/352768/mhZhz_GAn7HfQOARLu3d6SGnhRGBdGSr.pdf). O CRP-RS apenas reproduz a nota do CFP.

**Afirmações conflitantes**
- Revista Interactive afirma que uma "resolução de 2026" sobre perícia traz "capítulos específicos sobre o uso de inteligência artificial na triagem de dados psicológicos", sem número nem data — [Revista Interactive](https://revistainteractive.com/nova-resolucao-do-cfp-2026-pericia-e-saude-mental/). **[NÃO CONFIRMADO]**: não corroborada; fonte de baixa confiabilidade.
- Blogs comerciais afirmam não haver resolução específica de IA até meados de 2026 — [PsiNota AI](https://psinotaai.com/blog/resolucao-cfp-09-2024-ia-psicologia) (fornecedor, conflito de interesse). Uma fonte diz que a Res. 9/2024 seria a primeira norma sobre IA clínica; o texto não sustenta isso.

### Inferences
- **Nada proíbe por nome.** Mas "Não insira prontuários" é a posição institucional do órgão que julga a falta ética. Enviar excertos de prontuário a LLM, mesmo pseudonimizados, contraria a leitura mais direta. O Guia distingue "anonimize rigorosamente" de pseudonimizar. Um CRP pode entender que a pseudonimização não atende ao Guia.
- **O Guia não é norma sancionatória por si**, mas pode orientar a interpretação do art. 9º do CEPP em processo ético. Não se deve tratá-lo como opcional. **[CFP]**
- **Hierarquia prática das orientações:** a Nota de 2025 fala em consentimento "sempre" para processamento de dados psicológicos com IA. Isto é mais estrito que a LGPD.
- **Art. 14 do CEPP:** "meios de registro" cobre plausivelmente ferramenta de IA que participa do registro. Dever: informar desde o início.
- **O que informar ao paciente (composição mínima, inferida):** uso de IA e finalidade; ferramenta/fornecedor e país de destino; que dados vão; limites e riscos, inclusive de erro; retenção e treino; recursos de sigilo; direito de recusar e revogar sem prejuízo ao atendimento (Guia); segurança; revisão humana. Fontes: CEPP art. 14; Res. 9/2024 art. 7º; LGPD arts. 6º VI, 9º (finalidade, forma e duração, controlador, contatos), 33 VIII; Res. 19/2024 art. 17; Guia.
- **Alcance da Res. 9/2024:** a redação cobre "comunicações entre as partes", mas art. 3º II ("registro e guarda de informações") e o Guia, que a usa como base, sugerem alcance para além do atendimento remoto. Clínica presencial que só usa LLM para notas é caso incerto. Por segurança, seguir o art. 7º par. único. **[CFP]**
- **Psicóloga em instituição:** o Guia exige independência técnica ante pressão institucional. A decisão da clínica não exime a profissional.
- **Conteúdo clínico:** Manual reserva interpretação, conclusões e hipóteses à psicóloga. Sistema que gera hipótese ou "risco" por LLM colide com isso, e com AGENTS.md.
- **Prontuário e nota "assinada":** o texto gerado por IA e armazenado pode integrar o registro e ser acessível ao paciente (Res. 1/2009 art. 5º II). Prompts e saídas exigem política de guarda definida.

### Gaps
- **Varredura de resoluções do CFP de 2026 incompleta** (atosoficiais 403; lista CFP 500). Não posso garantir a inexistência de norma de 2026. Verificar antes de publicar: `site.cfp.org.br` e DOU. **[NÃO CONFIRMADO]**
- Sem texto oficial da Res. 5/2010; escopo conhecido por nota de LegisWeb.
- Não achei processo ético público sobre IA em prontuário. Os processos éticos costumam ser sigilosos, então ausência de achado não prova ausência de casos.
- Recomenda-se consulta formal à Comissão de Orientação e Fiscalização do CRP.

---

## Lei 13.787/2018, Lei 14.510/2022 e o prazo de guarda

### Takeaway
A Lei 13.787 rege sistemas de prontuário e remete à LGPD, sem tratar de IA. A Lei 14.510 traz princípios para telessaúde, incluindo consentimento e confidencialidade. Há uma leitura do CFP que estende a guarda de 5 para 20 anos em serviços de saúde.

### Cited Findings
- Lei 13.787 art. 1º: "A digitalização e a utilização de sistemas informatizados para a guarda, o armazenamento e o manuseio de prontuário de paciente são regidas por esta Lei e pela Lei nº 13.709" — [Lei 13.787](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm).
- Art. 2º: assegurar "a integridade, a autenticidade e a confidencialidade do documento digital".
- Art. 4º: meios de armazenamento "deverão protegê-los do acesso, do uso, da alteração, da reprodução e da destruição não autorizados".
- Art. 6º: "Decorrido o prazo mínimo de 20 (vinte) anos a partir do último registro, os prontuários [...] poderão ser eliminados." § 5º: aplica-se a documentos "gerados e mantidos originalmente de forma eletrônica".
- Manual do CFP: registro em geral, 5 anos; "os prontuários em saúde (psicológico ou multiprofissional) devem ser guardados por até 20 anos"; "Nos casos de estabelecimentos que prestam serviços em saúde [...] este prazo se estende para 20 anos"; 5 anos não servem de parâmetro para crianças e adolescentes — [Manual](https://site.cfp.org.br/wp-content/uploads/2025/11/Manual_Orientativo.pdf).
- Lei 14.510 (altera a Lei 8.080): art. 26-A inclui "consentimento livre e informado do paciente" e "confidencialidade dos dados"; art. 26-B fala em "transmissão segura de dados"; art. 26-D dá aos conselhos federais a normatização ética; art. 26-G I: "consentimento livre e esclarecido do paciente, ou de seu representante legal, e sob responsabilidade do profissional de saúde" — [Lei 14.510](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14510.htm).

### Inferences
- A Lei 13.787 alcança o prontuário em sistema da clínica. Enviar excerto a LLM é "manuseio" ou "uso", protegido do não autorizado pelo art. 4º, mas a lei não diz quem autoriza. Ela não veda nuvem.
- Lei 14.510 aplica-se a serviço a distância. Clínica presencial não é alcançada diretamente; ainda assim mostra padrão legal.
- Divergência textual: o Manual diz "até 20 anos"; a lei diz "mínimo de 20 anos" para poder eliminar. Citar a lei. Definição de prazo para consultório autônomo merece confirmação. **[CFP]**
- Logs e prompts contendo excertos podem herdar a regra de guarda ou conflitar com minimização: índices e logs são derivados (coerente com AGENTS.md), mas a política precisa constar da análise.

### Gaps
- Regulamentos da Lei 13.787 sobre sistema de gerenciamento eletrônico não verificados.

---

## Regulação de IA: PL 2338/2023 em novembro de 2026

### Takeaway
**Não é lei.** A Câmara não votou o texto: situação "Aguardando Parecer do(a) Relator(a) na Comissão Especial", com última movimentação em 27/10/2026. Nenhuma obrigação decorre dele hoje.

### Cited Findings
- Ficha da Câmara: "Aguardando Parecer do(a) Relator(a) na Comissão Especial sobre Inteligência Artificial (PL 2338/23)"; relator Dep. Aguinaldo Ribeiro, designado em 20/05/2025; últimos lançamentos em 26 e 27/10/2026 são apensações — [Câmara](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262) (lidos os primeiros 100 mil caracteres da página).
- Monitor com execução em 06/11/2026: votações de 19/05, 27/05 e 09/06/2026 não ocorreram; em 24/08/2026 o relator anunciou votação depois das eleições de outubro; "37 proposições apensadas" — [LCF Monitor](https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/) (secundário).
- Aprovado no Senado em 10/12/2024 — [Brasil de Fato](https://www.brasildefato.com.br/2024/12/10/senado-aprova-pl-da-inteligencia-artificial).
- Texto do Senado, art. 14: "Considera-se de alto risco o sistema de IA empregado para as seguintes finalidades e contextos de usos [...]: VIII – aplicações na área da saúde para auxiliar diagnósticos e procedimentos médicos, quando houver risco relevante à integridade física e mental das pessoas". XI inclui "sistemas de identificação e autenticação biométrica para o reconhecimento de emoções". Parágrafo único: "Não se considera uso de alto risco aquele no qual o sistema de IA é utilizado como tecnologia intermediária que não influencie ou determine resultado ou decisão ou quando desempenha uma tarefa processual restrita." — [Texto PL 2338](https://legis.senado.leg.br/sdleg-getter/documento?dm=9881643&ts=1734000000000&disposition=inline). Texto recuperado por URL de documento do Senado com 35 páginas; **é preciso confirmar que é a redação final** enviada à Câmara. **[NÃO CONFIRMADO quanto à versão]**
- A nota do CFP lembra que o PL "ainda não consolidou diretrizes setoriais específicas para a saúde mental" — [Nota 5/2025](https://site.cfp.org.br/wp-content/uploads/2025/09/SEI_CFP-2402857-Nota.pdf).
- Anvisa RDC 657/2022: softwares diagnósticos ou de apoio como SaMD, segundo a mesma Nota.

### Inferences
- Assistente de rascunho sem efeito sobre decisão poderia cair na exceção do par. único; recurso que sugere hipóteses ou risco clínico tenderia ao inciso VIII, ainda que "procedimentos médicos" não se ajuste perfeitamente à psicologia. Especulativo: o texto pode mudar na Câmara e voltar ao Senado.
- Não redigir requisitos como se o PL fosse vigente. No TCC, citar como proposição. Software com finalidade diagnóstica ou de risco pode cair na regulação da Anvisa (fora do escopo do projeto, que veda essa finalidade).

### Gaps
- Sem parecer do relator público localizado. Situação pode mudar: reverificar na data de entrega.

---

## Responsabilidade do psicólogo e da clínica; casos de fiscalização

### Takeaway
Há três esferas cumuláveis: ética (CFP/CRP), civil/administrativa de dados (LGPD) e penal (CP art. 154). Não encontrei caso público da ANPD ou do CFP sobre ChatGPT ou LLM em prontuário. Há fiscalização em saúde, mas por incidentes clássicos.

### Cited Findings
- LGPD art. 42: controlador ou operador que causar dano "em violação à legislação de proteção de dados pessoais, é obrigado a repará-lo"; § 1º I: operador responde solidariamente quando descumprir a lei ou "não tiver seguido as instruções lícitas do controlador"; § 1º II: controladores envolvidos respondem solidariamente; § 2º: inversão do ônus; § 4º: regresso — [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).
- Art. 52: advertência; multa até 2% do faturamento, limite de R$ 50 milhões por infração; publicização; bloqueio; eliminação; suspensão; proibição.
- Código Penal art. 154: "Revelar alguém, sem justa causa, segredo, de que tem ciência em razão de função, ministério, ofício ou profissão, e cuja revelação possa produzir dano a outrem: Pena - detenção, de três meses a um ano, ou multa". Par. único: "Somente se procede mediante representação." — [CP](https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm). O texto compilado ainda mostra o valor antigo da multa, com remissão à Lei 7.209/1984.
- CEPP art. 21: penalidades disciplinares; Nota CFP de 2025: uso de terceiros "não isenta".
- **STJ, AREsp 2.130.619-SP** (2ª Turma, 07/03/2023): vazamento de dados pessoais comuns não gera dano moral presumido; decisão não aborda diretamente dados sensíveis — [Informativo 766](https://informativos.trilhante.com.br/informativos/informativo-766-stj/stj-aresp-2130619-sp); [Capital Aberto](https://capitalaberto.com.br/legislacao-mercados/2023/04/stj-decide-sobre-dano-em-vazamento-de-dados). Fonte com erro de data existe; conferir íntegra.
- **ANPD em saúde:** instaurou processo de sanção contra ISAC (jul. 2026), incidente com cerca de 500 mil pacientes, inclusive prontuários; é instauração, não condenação — [Conexão TO](https://conexaoto.com.br/2026/07/09/anpd-instaura-processo-de-sancao-contra-o-isac-por-falha-na-protecao-de-dados-de-500-mil-pacientes). Concluiu processo contra Prefeitura de Feira de Santana por exposição de dados de saúde de 1.241 pessoas — [Cescon Barrieu](https://cesconbarrieu.com.br/anpd-conclui-processo-contra-prefeitura-de-feira-de-santana-por-exposicao-de-dados-de-saude-de-1-241-pessoas/).
- Secundários dizem que dados de saúde estão entre os focos de fiscalização 2026-2027, com números divergentes (75 ou 10 ações), citando Res. CD/ANPD 30/2025 — [Confidata](https://confidata.com.br/saude); [LexLegal](https://lexlegal.com.br/anpd-amplia-fiscalizacao-sobre-dados-de-saude-e-biometria/). Divergência não resolvida. **[NÃO CONFIRMADO]**

### Inferences
- **Penal:** "justa causa" e "revelação" a processador contratado são discutíveis. Consentimento informado tende a afastar a justa causa em aberto; pseudonimização reduz, mas não elimina, o argumento. Art. 11 § 4º e treino pelo provedor agravariam. **[ADVOGADO]**
- **Clínica:** como controladora, responde na LGPD e possivelmente como fornecedora de serviço sob o CDC (responsabilidade objetiva do fornecedor, com regime subjetivo para profissional liberal no art. 14 § 4º). Esse último ponto não foi verificado em fonte nesta pesquisa. **[ADVOGADO]**
- **Psicólogo subordinado:** pelo Guia, não é agente LGPD, mas segue com dever de sigilo e responsabilidade ética. A esfera ética é pessoal.
- **Dano:** notas de psicoterapia são de altíssima intimidade, o que enfraquece a aplicação do AREsp 2.130.619 por analogia.
- **Provedor:** responde por art. 42 se descumprir instruções, mas executar judicialmente fornecedor estrangeiro é difícil; a responsabilização prática recai na clínica.
- **Fiscalização:** ausência de caso não significa risco baixo. O regulamento de saúde ainda está por vir, e a ANPD agora é agência.

### Gaps
- Sem jurisprudência localizada sobre psicólogo, IA e sigilo. Busca nos TJs e STJ não foi feita.
- Não localizei CRP com orientação ou processo divulgado sobre ChatGPT em prontuário.
- Regime exato do CDC para clínica/psicólogo não confirmado por fonte; responsabilidade objetiva ou subjetiva na LGPD segue debatida — [artigo Unitins](https://revista.unitins.br/index.php/humanidadeseinovacao/article/view/6328/5167).

---

## Comparação: HIPAA e notas de psicoterapia (contexto apenas)

### Takeaway
O direito dos EUA dá proteção reforçada às "psychotherapy notes" separadas do prontuário, exigindo autorização específica para a maioria dos usos. O Brasil não tem categoria equivalente: protege pela combinação de sigilo, dado sensível e prontuário, e o paciente tem acesso integral ao prontuário.

### Cited Findings
- 45 CFR 164.501: "notes recorded (in any medium) by a health care provider who is a mental health professional documenting or analyzing the contents of conversation during a private counseling session [...] and that are separated from the rest of the individual's medical record"; exclui medicação, horários, modalidades, resultados de testes e resumos de diagnóstico, estado funcional, plano, sintomas, prognóstico, progresso — [Cornell LII](https://www.law.cornell.edu/cfr/text/45/164.501).
- 45 CFR 164.508(a)(2): "a covered entity must obtain an authorization for any use or disclosure of psychotherapy notes, except" uso pelo autor para tratamento, treinamento supervisionado, defesa em ação do paciente e situações legais listadas — [Cornell LII](https://www.law.cornell.edu/cfr/text/45/164.508).
- 164.508(b)(3)(ii): autorização para notas só combina com autorização também sobre notas.
- HHS: autorização requerida mesmo para divulgação a outro provedor, em regra — [HHS FAQ](https://www.hhs.gov/hipaa/for-professionals/faq/546/does-hipaa-permit-a-covered-entity-to-disclose-psychotherapy-notes/index.html) (página bloqueada ao download direto; conteúdo por resumo de busca).

### Inferences
- A separação das "psychotherapy notes" não existe no Brasil. A Res. 1/2009 art. 1º prevê registro documental quando não puder ser mantido como prontuário por restrição de compartilhamento, e o art. 2º V/VI prevê pasta exclusiva para instrumentos, o que é analogia limitada.
- HIPAA não se aplica a clínica brasileira. Não importar os conceitos (por exemplo, BAA) como se satisfizessem LGPD ou SCC da ANPD.

### Gaps
- Não analisei como provedores tratam notas de psicoterapia sob BAA. Se relevante, é tema de outro bloco.

---

## Itens que exigem advogado ou o CFP antes de qualquer afirmação no TCC ou em produção

1. Se II "f" cobre processador de LLM (art. 11). **[ADVOGADO]**
2. Se a pseudonimização satisfaz o "anonimize rigorosamente" do Guia, e se excertos são "prontuários" para o item Q9. **[CFP/CRP, consulta formal]**
3. Se consentimento do paciente é válido na relação terapêutica e como desenhar recusa sem prejuízo. **[ADVOGADO + CFP]**
4. Aplicação do art. 11 § 4º se houver retenção ou treino. **[ADVOGADO]**
5. Viabilidade de SCC integrais com o fornecedor concreto. **[ADVOGADO]**
6. Enquadramento em alto risco na Res. 2/2022 e necessidade de encarregado. **[ADVOGADO]**
7. Se envio a operador é "revelação" (CP art. 154). **[ADVOGADO]**
8. Status das resoluções do CFP de 2026. **[VERIFICAÇÃO MANUAL]**

**Compatibilidade com o projeto (inferência):** o AGENTS.md mantém a stack com Ollama até ADR aprovada, determina dados sintéticos em desenvolvimento e demonstração e condiciona pacientes reais a governança e revisão ética e jurídica. Enviar notas reais a LLM em nuvem seria mudança de escopo, exigindo ADR e essa revisão. Testar com dados sintéticos não aciona o art. 5º I, porque não há titular real, desde que sejam de fato sintéticos.
