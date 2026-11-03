# ZAP Baseline, 2026-11-03

Os dois relatórios JSON foram produzidos com o ZAP Baseline passivo contra o frontend HTTP do Compose sintético, sem autenticação. O primeiro precede os cabeçalhos COOP, COEP e CORP; o segundo os inclui.

| Execução | FAIL | WARN | PASS |
|---|---:|---:|---:|
| Antes dos cabeçalhos | 0 | 4 categorias no CLI | 64 regras |
| Depois dos cabeçalhos | 0 | 3 categorias | 65 regras |

O primeiro JSON lista seis tipos de alerta (incluindo COOP, COEP e CORP), enquanto o resumo do CLI agrupou quatro categorias como WARN. Depois dos cabeçalhos, o JSON lista apenas `CSP: style-src unsafe-inline` (médio), `Storable and Cacheable Content` (informativo) e `Modern Web Application` (informativo). O código de saída foi 1 nas duas execuções porque o ZAP sinalizou avisos. A CSP ainda precisa de teste visual do grafo em navegador antes de remover `unsafe-inline`.

O relatório completo de implementação, causas, correções e limites está em `1 - TCC/wiki/outputs/implementacao_privacidade_sessao_carga_2026-11-03.md`.
