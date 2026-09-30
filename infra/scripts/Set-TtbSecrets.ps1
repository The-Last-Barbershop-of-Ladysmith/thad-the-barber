<#
.SYNOPSIS
Adds or replaces the sensitive values in one environment's Key Vault (issue #9).

.DESCRIPTION
Bicep creates the vaults, the CORS origin secrets and the session-JWT signing key, but never the sensitive values:
you add those here, after the first deploy. Each value is read as a SecureString, written to a temp file for
`az keyvault secret set --file`, and the file is deleted straight away. Leave a prompt blank to keep the current value.
Requires the Azure CLI, `az login`, and Key Vault Secrets Officer on the vault (set TTB_ADMIN_OBJECT_ID before deploying).

.EXAMPLE
./infra/scripts/Set-TtbSecrets.ps1 -Environment dev

.EXAMPLE
./infra/scripts/Set-TtbSecrets.ps1 -Environment test -Name Square--RefreshToken
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('dev', 'test', 'prod')]
    [string] $Environment,

    # Set only these secrets instead of prompting for all of them.
    [string[]] $Name
)

$ErrorActionPreference = 'Stop'

# Key Vault names map to .NET configuration keys ('--' becomes ':').
$secrets = [ordered]@{
    'Square--ApplicationSecret'   = 'Square application secret (OAuth)'
    'Square--RefreshToken'        = 'Square OAuth refresh token (the API rotates it after this)'
    'Square--WebhookSignatureKey' = 'Square webhook signature key'
    'ManageLink--HmacKey'         = 'Manage-link HMAC key (e.g. 64 random bytes, base64)'
    'Recaptcha--ApiKey'           = 'reCAPTCHA API key for server-side verification'
    'Google--ClientSecret'        = 'Google OAuth client secret (reviews)'
    'Google--RefreshToken'        = 'Google OAuth refresh token (reviews)'
}

if ($Name) {
    $unknown = $Name | Where-Object { -not $secrets.Contains($_) }
    if ($unknown) {
        throw "Unknown secret name(s): $($unknown -join ', '). Known: $($secrets.Keys -join ', ')"
    }
}

$resourceGroup = if ($Environment -eq 'prod') { 'rg-ttb-prod' } else { 'rg-ttb-nonprod' }
$vault = az keyvault list --resource-group $resourceGroup --query "[?starts_with(name, 'kv-ttb-$Environment-')].name | [0]" --output tsv
if (-not $vault) {
    throw "No kv-ttb-$Environment-* vault in $resourceGroup. Deploy infra/main.bicep first."
}
Write-Host "Vault: $vault"

foreach ($secretName in $secrets.Keys) {
    if ($Name -and $secretName -notin $Name) {
        continue
    }

    $secure = Read-Host -AsSecureString "$secretName - $($secrets[$secretName]) (blank = keep)"
    $plain = [Net.NetworkCredential]::new('', $secure).Password
    if (-not $plain) {
        Write-Host "  kept"
        continue
    }

    $file = New-TemporaryFile
    try {
        [IO.File]::WriteAllText($file.FullName, $plain)
        az keyvault secret set --vault-name $vault --name $secretName --file $file.FullName --encoding utf-8 --output none
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to set $secretName."
        }
        Write-Host "  set"
    }
    finally {
        Remove-Item $file.FullName -Force
        $plain = $null
    }
}
