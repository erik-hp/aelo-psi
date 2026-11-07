# ADR-004 — Uso de modelos de IA externos

**Status:** proposta, aguardando decisão do autor e do orientador. Depende de parecer jurídico e profissional.
**Data:** 06/11/2026.
**Relaciona-se a:** RNF-03, restrições 7, 8 e 10 do Plano Mestre, F0-06, F5-04.
**Evidências:** [relatório de pesquisa](../research/recuperacao-lod-e-ia-em-nuvem.md), `Backend/tests/evaluate_deidentification.py`.

> Este documento organiza fatos técnicos e normativos para decisão. Não é parecer jurídico nem declaração de conformidade. Termos de fornecedores mudam: reconferir na data da decisão.

## Pergunta

É possível trocar ou complementar o Ollama por modelos de fronteira em nuvem para processar notas de psicoterapia?

## Decisão proposta

**Manter o Ollama como único destino de conteúdo clínico.** Nenhum dado clínico, mesmo pseudonimizado, é enviado a provedor externo. Modelos externos só podem ser usados com **dados exclusivamente sintéticos**, em avaliação científica isolada do produto. Nenhum código de envio externo foi implementado.

Tecnicamente é viável. O bloqueio atual é de governança, segurança e norma profissional, não de capacidade.

## Fundamentos

1. **Pseudonimizado continua sendo dado pessoal sensível.** A LGPD exclui apenas o dado anonimizado (art. 12), e a clínica mantém a chave de reversão.
2. **O consentimento não é, pelo texto, uma exigência universal da LGPD**, mas é a base mais defensável neste fluxo. O art. 11, II, "f" exige indispensabilidade e procedimento por profissionais ou serviços de saúde, o que se ajusta mal a um terceiro. A interpretação exige advogado.
3. **Transferência internacional exige mecanismo próprio** além da base legal (Res. CD/ANPD 19/2024). A Res. CD/ANPD 32/2026 reconhece UE/EEE, e os EUA não constam como adequados na página consultada. As cláusulas-padrão da ANPD precisam ser adotadas sem alteração. Foram confirmadas publicamente apenas no Google Cloud.
4. **A orientação profissional é contrária.** O Guia de IA do CFP (dez/2025) orienta: "Evite. Se for absolutamente necessário, anonimize rigorosamente [...] registre o consentimento [...] Não insira prontuários, nomes e itens identificáveis e desative treinamento". É orientação, não resolução, mas vem do órgão que julga a ética profissional.
5. **O paciente pode recusar sem perder atendimento**, segundo o mesmo guia. O produto precisa funcionar integralmente sem LLM externo.
6. **Não foi confirmada inferência no Brasil para modelo de fronteira** com cobrança por uso. Modelos atuais costumam estar em rota global.
7. **ZDR não equivale a nenhuma retenção.** Costuma depender de aprovação, tem exceções, e há retenção de conteúdo sinalizado ou por ordem judicial. Essas exceções tendem a alcançar justamente conteúdo de crise, inferência a ser testada.
8. **O filtro atual não é suficiente.** Em 28 frases sintéticas, identificadores diretos foram removidos ou bloqueados em 7 de 7 casos, mas 19 dos 28 identificadores vazaram no total: nomes parciais, terceiros, trabalho, locais e eventos raros. Esse fixture não estima a taxa real. Mesmo sistemas ajustados deixam escapar identificadores, e o melhor resultado brasileiro localizado tem F1 de 0,13 a 0,23 para organização, local e hospital.
9. **Reidentificação é agravada por LLMs.** Em texto clínico, relato raro, parentesco e cidade pequena identificam sem nenhum nome.
10. **Janela maior não dispensa recuperação.** `gemini-3.1-pro-preview` e `gpt-5.5` têm cerca de 1 milhão de tokens, mas estudos mostram perda de desempenho com histórico longo e irrelevante.

## Condições cumulativas para reabrir a decisão

1. Parecer jurídico sobre base legal, papéis e transferência internacional.
2. Posição do CFP ou parecer profissional, considerando o Guia de IA.
3. RIPD concluído e validado.
4. Consentimento específico, revogável e com recusa sem prejuízo; funcionamento completo com IA externa desligada.
5. Contrato com cláusulas-padrão da ANPD, sem treinamento, com retenção e acesso humano definidos por escrito.
6. Inferência em região e rota comprovadas.
7. NER com recall medido por categoria, em corpus sintético em português, e revisão humana de cada envio.
8. Bloqueio por padrão, auditoria sem conteúdo e chaves de reversão apenas no ambiente da clínica.
9. Critérios de saída e plano de incidentes com o fornecedor.
10. ADR aprovada e atualização explícita de plano, matriz e TCC.

## Alternativas

| Alternativa | Avaliação |
| --- | --- |
| Manter Ollama e configurar contexto corretamente | **Recomendada.** Ainda não extraímos o limite local: sem configuração, o padrão é 4.096 tokens em CPU ou abaixo de cerca de 23 GiB de VRAM. |
| Recuperar melhor antes de aumentar o contexto | **Recomendada**, ver ADR-003. |
| Nuvem com dados sintéticos para comparação científica | **Aceitável**, sem conteúdo real e como braço separado de avaliação. |
| Servidor próprio com GPU | Mantém os dados sob controle da clínica, com custo e operação próprios. Não gera conformidade automática. |
| Pseudonimizar e enviar excertos | Rejeitada por ora, pelos fundamentos 3, 4, 7 e 8. |

## Uso já realizado

Em 06/11/2026, 20 notas totalmente sintéticas foram enviadas ao Claude em avaliação isolada, por decisão do autor e dentro da alternativa aceitável acima. Nenhum dado real foi enviado, e o sistema continua sem qualquer rota de envio externo.

## Consequências

O projeto preserva a hipótese H2 do TCC e evita depender de fornecedor. Em troca, aceita a capacidade do hardware local e precisa medir latência e qualidade reais. Execução local também não é conformidade automática: criptografia, acesso, backup e RIPD continuam necessários.
