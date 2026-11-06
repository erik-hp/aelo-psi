param([ValidateSet('typesafe','openrouter','vercel','opencode')][string]$Provider)
$ErrorActionPreference = 'Stop'
if (-not $Provider) {
    $Provider = Read-Host 'Provedor (typesafe, openrouter, vercel ou opencode)'
    if ($Provider -notin @('typesafe','openrouter','vercel','opencode')) { throw 'Provedor inválido.' }
}
$jevSecret = Read-Host 'Chave Jev (entrada oculta; não envie no chat)' -AsSecureString
if ($jevSecret.Length -eq 0) { throw 'Nenhuma chave informada.' }
$jevRuntime = Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force -Path $jevRuntime | Out-Null
$jevCipher = ConvertFrom-SecureString -SecureString $jevSecret
@{ provider = $Provider; encryptedKey = $jevCipher } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $jevRuntime 'credential.dpapi.json') -Encoding UTF8
Write-Output 'Configuração local salva com DPAPI do usuário Windows. Chave não exibida. Ainda não houve chamada ao provedor.'
