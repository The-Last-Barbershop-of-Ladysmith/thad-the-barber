// dev + test on one F1 Free Linux plan in rg-ttb-nonprod-eastus (issue #9).
// Personal values come from environment variables so they stay out of this public repo:
//   TTB_BUDGET_EMAIL         (required) who gets the $5 budget alerts
//   TTB_ADMIN_OBJECT_ID      (optional) your Entra object ID, for Key Vault Secrets Officer
//   TTB_DEPLOY_PRINCIPAL_ID  (optional) the GitHub OIDC service principal from issue #10
using 'main.bicep'

param stage = 'nonprod'

param planSku = 'F1'

param environments = [
  {
    name: 'dev'
    aspnetEnvironment: 'Dev'
    extraCorsOrigins: []
  }
  {
    name: 'test'
    aspnetEnvironment: 'Test'
    extraCorsOrigins: []
  }
]

param budgetStartDate = '2026-10-01T00:00:00Z'

param budgetEmail = readEnvironmentVariable('TTB_BUDGET_EMAIL')

param adminPrincipalId = readEnvironmentVariable('TTB_ADMIN_OBJECT_ID', '')

param deployPrincipalId = readEnvironmentVariable('TTB_DEPLOY_PRINCIPAL_ID', '')
