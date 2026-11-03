# ADR-002 — Criptografia dos prontuários e migração segura

**Estado:** PROPOSTA; implementação depende de F1-04 e validação da F0. **Não está em produção.**

## Objetivo
Proteger texto bruto, texto desidentificado e versões históricas de notas, resumos de sessões, respostas e evidências derivadas de IA. A criptografia do banco/disco por si só não protege contra leitura direta por administradores do banco ou backups.

## Opção recomendada
Criptografia autenticada por campo usando AES-256-GCM, com chaves de dados por domínio/registro sob envelope encryption (KEK por ambiente sob KMS/Vault ou mecanismo com segregação operacional equivalente). AAD vincula `clinic_id`, `patient_id`, `entity_id`, `field` e versão do esquema. Cada gravação usa nonce único, chave identificada e versão criptográfica; nunca registrar chaves nem plaintext em logs, backup ou testes.

O algoritmo não substitui autorização objeto-a-objeto, isolamento de rede, TLS, autenticação, proteção de memória de processos nem governança de chaves. Dados indexados e embeddings requerem avaliação específica porque continuam sensíveis.

## Fases de implantação (sem destruir conteúdo original)
1. Confirmar inventário de campos e vínculos; definir responsável pelas chaves, recuperação de desastre, rotação e política de retenção.
2. Implementar serviço de criptografia com testes de autenticidade (bit alterado deve falhar), rotação e indisponibilidade de chave (falha fechada).
3. Adicionar colunas cifradas nullable e metadados de versão por migração sem apagar colunas originais. Não mudar API pública nesse passo.
4. Backfill em lotes, transacional, idempotente e rastreado por ID, sem imprimir texto em logs; validar contagem/checksum e restauração com dados sintéticos.
5. Fazer dual-read durante janela controlada, depois escrita somente cifrada; auditar diferenças e testar rollback compatível. Sob nenhuma circunstância usar plaintext como fallback em produção após corte.
6. Somente após confirmação de integridade e backup cifrado, remover legado em migração separada e documentar como tratar cópias históricas/backups.
7. Rodar testes de isolamentos, performance, falha de chave e restore; registrar decisões e evidências. Nenhuma migração de dado real sem avaliação legal e operacional.

## Campos inicialmente mapeados
- `ClinicalNote.raw_text`, `ClinicalNote.anonymized_text`.
- `ClinicalNoteHistory.raw_text`, `ClinicalNoteHistory.anonymized_text`.
- `TherapySession.summary`.
- `AIAnalysis.longitudinal_evolution`, `AIAnalysis.raw_response`, demais campos narrativos/JSON.
- `AISource.excerpt`, `HumanValidation.comment`.
- Registros derivados futuros MTLI, snapshots e chunks; vetores exigem tratamento como dados pessoais.

## Critérios para iniciar
F0 com proteção de acesso, logs minimizados e pipeline testado; revisão arquitetural da modelagem; organização do gerenciamento de chaves; fixtures sintéticas; migrações e plano de recuperação aprovados. **Não implementar por substituição simples de TextField nem tentar esconder plaintext com base64.**

## Critérios de aceite
- Nenhuma leitura/escrita de paciente não autorizado; falhas de integridade e chave encerram o processo sem retornar dados.
- Conteúdo nunca aparece em logs, variáveis de CI ou arquivos versionados.
- Testes garantem compatibilidade, rotação, backup/restore e reindexação derivada.
- Nenhuma alegação de conformidade LGPD automática; riscos residuais e responsáveis registrados.

Relação: [Plano Mestre](../PLANO_MESTRE_IMPLEMENTACAO.md), [ADR-001](ADR-001-memoria-terapeutica-longitudinal.md).
