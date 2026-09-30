<#
.SYNOPSIS
Creates the GitHub environments and the variables and secrets that let Actions sign in to Azure with OIDC (issue #10).

.DESCRIPTION
Run after `az deployment sub create` has made the deploy identities. Safe to re-run.

- Environments: dev (deploys from dev/*), test (release/*, hotfix/*) and production (release/*, hotfix/*, and
  a required reviewer). Each gets an AZURE_CLIENT_ID variable: the client ID of that environment's deploy
  identity (id-ttb-deploy-<env>-<region>). Production has none until its identity exists (M5).
- Repo variables: AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID and AZURE_PREVIEW_CLIENT_ID (the identity pull
  requests use for what-if).
- Repo secrets for the what-if job, from the same TTB_* environment variables the deploy reads. They're
  secrets, not variables, so GitHub masks them in the public workflow logs. Unset ones are skipped.

No Azure credential is stored: the identities trust GitHub's OIDC tokens instead.
Requires the Azure CLI (`az login`) and the GitHub CLI signed in as a repo admin.

.EXAMPLE
./infra/scripts/Set-TtbGitHub.ps1
#>
[CmdletBinding()]
param(
    [string] $Repo = 'The-Last-Barbershop-of-Ladysmith/thad-the-barber',

    # Region of the nonprod resources (the last part of their names).
    [string] $Location = 'centralus',

    # GitHub login that must approve production deploys. Defaults to you.
    [string] $Reviewer
)

$ErrorActionPreference = 'Stop'

# Runs gh, passing on any piped input (request bodies, secret values), and stops on failure.
function Invoke-Gh {
    $input | & gh @args
    if ($LASTEXITCODE -ne 0) { throw "gh $($args -join ' ') failed" }
}

$resourceGroup = "rg-ttb-nonprod-$Location"
$environments = @(
    @{ Name = 'dev'; Branches = @('dev/*'); Identity = "id-ttb-deploy-dev-$Location" }
    @{ Name = 'test'; Branches = @('release/*', 'hotfix/*'); Identity = "id-ttb-deploy-test-$Location" }
    @{ Name = 'production'; Branches = @('release/*', 'hotfix/*'); Identity = $null; Reviewed = $true }
)

if (-not $Reviewer) { $Reviewer = gh api user --jq .login }
$reviewerId = [int](gh api "users/$Reviewer" --jq .id)

foreach ($e in $environments) {
    $reviewers = if ($e.Reviewed) { @(@{ type = 'User'; id = $reviewerId }) } else { @() }
    $body = @{
        reviewers                = $reviewers
        deployment_branch_policy = @{ protected_branches = $false; custom_branch_policies = $true }
    } | ConvertTo-Json -Depth 5 -Compress
    $body | Invoke-Gh api -X PUT "repos/$Repo/environments/$($e.Name)" --input - | Out-Null

    $existing = @(gh api "repos/$Repo/environments/$($e.Name)/deployment-branch-policies" --jq '.branch_policies[].name')
    foreach ($pattern in $e.Branches | Where-Object { $_ -notin $existing }) {
        Invoke-Gh api -X POST "repos/$Repo/environments/$($e.Name)/deployment-branch-policies" -f "name=$pattern" -f type=branch | Out-Null
    }

    if ($e.Identity) {
        $clientId = az identity show --resource-group $resourceGroup --name $e.Identity --query clientId -o tsv
        Invoke-Gh variable set AZURE_CLIENT_ID --repo $Repo --env $e.Name --body $clientId
    }
    Write-Host "Environment $($e.Name): branches $($e.Branches -join ', ')$(if ($e.Reviewed) { ", reviewer $Reviewer" })"
}

$account = az account show --query '{tenant: tenantId, subscription: id}' -o json | ConvertFrom-Json
$previewClientId = az identity show --resource-group $resourceGroup --name "id-ttb-preview-nonprod-$Location" --query clientId -o tsv
Invoke-Gh variable set AZURE_TENANT_ID --repo $Repo --body $account.tenant
Invoke-Gh variable set AZURE_SUBSCRIPTION_ID --repo $Repo --body $account.subscription
Invoke-Gh variable set AZURE_PREVIEW_CLIENT_ID --repo $Repo --body $previewClientId

foreach ($name in 'TTB_BUDGET_EMAIL', 'TTB_ADMIN_OBJECT_ID', 'TTB_ALLOWED_IPS') {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) {
        $value | Invoke-Gh secret set $name --repo $Repo
    }
    else {
        Write-Warning "$name is not set; the what-if job will show it as a change."
    }
}
Write-Host 'Done. Push to dev/* (or run the azure-login workflow) to check the sign-in.'
