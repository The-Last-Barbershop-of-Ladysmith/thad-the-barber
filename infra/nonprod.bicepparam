// dev + test on one F1 Free Linux plan in rg-ttb-nonprod-centralus (issue #9).
// Personal values come from environment variables so they stay out of this public repo:
//   TTB_BUDGET_EMAIL         (required) who gets the $5 budget alerts
//   TTB_ADMIN_OBJECT_ID      (optional) your Entra object ID, for Key Vault Secrets Officer
//   TTB_ALLOWED_IPS          your public IP(s), comma-separated. Without it the dev/test apps and vaults refuse you.
using 'main.bicep'

param restrictAppAccess = true

param allowedIpRanges = filter(map(split(readEnvironmentVariable('TTB_ALLOWED_IPS', ''), ','), ip => trim(ip)), ip => !empty(ip))

param stage = 'nonprod'

// Central US: East US had no F1 quota. Prod stays in East US, closest to the shop.
param location = 'centralus'

param planSku = 'F1'

param environments = [
  {
    name: 'dev'
    aspnetEnvironment: 'Dev'
    githubEnvironment: 'dev'
    extraCorsOrigins: []
  }
  {
    name: 'test'
    aspnetEnvironment: 'Test'
    githubEnvironment: 'test'
    extraCorsOrigins: []
  }
]

param budgetStartDate = '2026-10-01T00:00:00Z'

param budgetEmail = readEnvironmentVariable('TTB_BUDGET_EMAIL')

param adminPrincipalId = readEnvironmentVariable('TTB_ADMIN_OBJECT_ID', '')

// Pull requests run what-if on the subscription with this stage's preview identity.
param createPreviewIdentity = true
