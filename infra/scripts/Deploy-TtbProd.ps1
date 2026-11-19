# Deploys prod (infra/prod.bicepparam). The prod Key Vault firewall allows only your current public IP;
# the alert contact is read from nonprod.
# Run it in your own terminal after `az login`. Add -WhatIf to run what-if instead of create.
param([switch]$WhatIf)

$nonprodResourceGroup = 'rg-ttb-nonprod-eastus'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')

$env:TTB_ALLOWED_IPS = Invoke-RestMethod https://api.ipify.org

$actionGroup = az monitor action-group show -g $nonprodResourceGroup -n ag-ttb-nonprod -o json | ConvertFrom-Json
$env:TTB_ALERT_EMAIL = $actionGroup.emailReceivers[0].emailAddress
if ($actionGroup.smsReceivers.Count -gt 0) {
    $env:TTB_ALERT_PHONE = $actionGroup.smsReceivers[0].phoneNumber.Substring($actionGroup.smsReceivers[0].phoneNumber.Length - 10)
}

$env:TTB_ADMIN_OBJECT_ID = az ad signed-in-user show --query id -o tsv

$prodKey = az keyvault secret show --vault-name kv-ttb-prod-eastus --name MediaWebhook--Key --query value -o tsv 2>$null
if ($prodKey) { $env:TTB_MEDIA_WEBHOOK_KEY_PROD = $prodKey }

$mode = if ($WhatIf) { 'what-if' } else { 'create' }
az deployment sub $mode --name prod --location eastus --parameters (Join-Path $repoRoot 'infra\prod.bicepparam')
