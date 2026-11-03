# Dataset sintético para o avaliador TCC II

`./tcc2_evidence_synthetic.json` contém somente narrativas inventadas para testar um **avaliador**, nunca prontuários reais ou resultados do AELO em produção.

Esquema `schema_version: 1`:

- `notes`: lista de `{id, patient_id, version, text}`. IDs globais devem ser únicos.
- `cases`: lista de `{id, patient_id, gold_note_ids, retrieved_note_ids, claims}`.
- Cada `claim` inclui `source: {note_id, version, excerpt}`; a descrição da afirmação (`text`) **não é validada semanticamente**.
- `gold_note_ids` contém somente notas do paciente do caso; `retrieved_note_ids` mantém a ordem do ranking para `Recall@k`.
- O denominador de Recall@k é o total de fontes gold; o de validade de citações é o total de afirmações. Sem denominador, o resultado é `null` (não `100%`).
- A validade literal apenas verifica proprietário da nota, versão e presença exata do trecho. **Não é um escore de Faithfulness/RAGAS**.

Uso dentro de `Backend`:

```bash
python services/metrics/evidence_benchmark.py --input tests/fixtures/tcc2_evidence_synthetic.json --k 5 --strict
python -m pytest tests/test_tcc2_evidence_benchmark.py -q
```

`--strict` retorna código 2 se houver referência desconhecida, outro paciente recuperado ou citação inválida. Nenhum texto narrativo é incluído no relatório. A ferramenta não impõe que um modelo seja executado e não realiza avaliação ética de uso clínico.
