$ErrorActionPreference = 'Stop'
$jevConfig = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '.runtime\credential.dpapi.json') | ConvertFrom-Json
$jevKeyMap = @{ typesafe='TYPESAFE_API_KEY'; openrouter='OPENROUTER_API_KEY'; vercel='AI_GATEWAY_API_KEY'; opencode='OPENCODE_API_KEY' }
if (-not $jevKeyMap.ContainsKey($jevConfig.provider)) { throw 'Provedor inválido.' }
$jevKeyName = $jevKeyMap[$jevConfig.provider]
$jevPreviousKey = [Environment]::GetEnvironmentVariable($jevKeyName, 'Process')
$jevPreviousProvider = [Environment]::GetEnvironmentVariable('JEV_PROVIDER', 'Process')
$jevSecureKey = ConvertTo-SecureString $jevConfig.encryptedKey
$jevKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($jevSecureKey)
try {
    [Environment]::SetEnvironmentVariable($jevKeyName, [Runtime.InteropServices.Marshal]::PtrToStringBSTR($jevKeyPointer), 'Process')
    [Environment]::SetEnvironmentVariable('JEV_PROVIDER', $jevConfig.provider, 'Process')
    # Do not accept an endpoint override for this credential-bearing probe.
    $jevPreviousUrl = $env:JEV_URL
    $jevPreviousBase = $env:TYPESAFE_BASE_URL
    Remove-Item Env:JEV_URL -ErrorAction SilentlyContinue
    Remove-Item Env:TYPESAFE_BASE_URL -ErrorAction SilentlyContinue
    & node (Join-Path $PSScriptRoot 'live-check.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Probe Jev falhou ou ficou inconclusivo; veja somente o relatório minimizado.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($jevKeyPointer)
    [Environment]::SetEnvironmentVariable($jevKeyName, $jevPreviousKey, 'Process')
    [Environment]::SetEnvironmentVariable('JEV_PROVIDER', $jevPreviousProvider, 'Process')
    [Environment]::SetEnvironmentVariable('JEV_URL', $jevPreviousUrl, 'Process')
    [Environment]::SetEnvironmentVariable('TYPESAFE_BASE_URL', $jevPreviousBase, 'Process')
}
