"""Characterize what the current regex filter lets through, on synthetic sentences.

Run explicitly: python -m pytest tests/evaluate_deidentification.py -s -q

The sentences were written to exercise each category. Rates describe this small
fixture, not expected performance on real clinical text.
"""
from collections import Counter

from services.security.anonymization import UnsafeClinicalText, prepare_ai_text

PATIENT_NAME = "Marina Ferreira Lopes"
PATIENT_CODE = "SYN-042"

# (category, sentence, literal identifier that must not reach the model)
CASES = [
    ("direto", "CPF 123.456.789-09 informado na recepção.", "123.456.789-09"),
    ("direto", "Contato pelo e-mail marina.sintetica@example.com.", "marina.sintetica@example.com"),
    ("direto", "Telefone (88) 99999-1234 para retorno.", "99999-1234"),
    ("direto", "Marina Ferreira Lopes chegou no horário.", "Marina Ferreira Lopes"),
    ("direto", "Registro do paciente SYN-042 atualizado.", "SYN-042"),
    ("direto", "Mora na Rua das Acácias, 120, perto da praça.", "Rua das Acácias"),
    ("direto", "RG 12.345.678-9 anexado ao cadastro.", "12.345.678-9"),
    ("nome parcial", "Marina relatou melhora no sono.", "Marina"),
    ("nome parcial", "A Sra. Lopes pediu remarcação.", "Lopes"),
    ("nome parcial", "Dona Marina trouxe o exame.", "Marina"),
    ("terceiro", "O marido Carlos Eduardo discutiu com ela ontem.", "Carlos Eduardo"),
    ("terceiro", "Sua irmã Beatriz não fala com a família.", "Beatriz"),
    ("terceiro", "O filho Pedro começou a escola nova.", "Pedro"),
    ("terceiro", "A mãe de Joana Almeida Prado foi internada.", "Joana Almeida Prado"),
    ("terceiro", "O namorado, Rafael, voltou a beber.", "Rafael"),
    ("terceiro", "Conversou com a Dra. Helena Martins sobre a medicação.", "Helena Martins"),
    ("trabalho", "Trabalha como enfermeira no Hospital Regional de Quixadá.", "Hospital Regional de Quixadá"),
    ("trabalho", "É caixa na Farmácia Pague Menos do centro.", "Pague Menos"),
    ("trabalho", "Foi demitida da Petrobras em março.", "Petrobras"),
    ("trabalho", "Dá aulas na Escola Estadual José Martins.", "Escola Estadual José Martins"),
    ("local", "Nasceu em Quixeramobim e veio para Quixadá aos 12 anos.", "Quixeramobim"),
    ("local", "Vive no bairro Campo Velho desde criança.", "Campo Velho"),
    ("local", "Frequenta a igreja do Alto São Francisco.", "Alto São Francisco"),
    ("evento raro", "Foi a única sobrevivente do acidente do ônibus da BR-122 em 2019.", "acidente do ônibus da BR-122"),
    ("evento raro", "Ganhou o concurso municipal de redação aos 15 anos.", "concurso municipal de redação"),
    ("evento raro", "É a vereadora mais jovem da história da cidade.", "vereadora mais jovem"),
    ("data", "A cirurgia foi em 12/03/2024.", "12/03/2024"),
    ("data", "A cirurgia foi em 12 de março de 2024.", "12 de março de 2024"),
]


def outcome(sentence, identifier):
    try:
        prepared = prepare_ai_text(sentence, PATIENT_NAME, PATIENT_CODE)
    except UnsafeClinicalText:
        return "bloqueado"
    return "vazou" if identifier.casefold() in prepared.casefold() else "removido"


def test_print_deidentification_table():
    totals = {}
    for category, sentence, identifier in CASES:
        totals.setdefault(category, Counter())[outcome(sentence, identifier)] += 1
    print(f"\n{len(CASES)} frases sintéticas")
    print("categoria | removido | bloqueado | vazou")
    for category, counts in totals.items():
        print(f"{category} | {counts['removido']} | {counts['bloqueado']} | {counts['vazou']}")
