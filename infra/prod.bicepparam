// prod: its own B1 plan in rg-ttb-prod-eastus, with Always On (issue #92). Personal values come from environment
// variables so they stay out of this public repo:
//   TTB_ALERT_EMAIL          (required) who gets every alert
//   TTB_ALERT_PHONE          (optional) US mobile number, 10 digits, for the same alerts by SMS
//   TTB_ADMIN_OBJECT_ID      (optional) your Entra object ID, for Key Vault Secrets Officer and media container access
//   TTB_ALLOWED_IPS          your public IP(s), comma-separated, for the Key Vault firewall (the apps themselves are public)
//   TTB_MEDIA_WEBHOOK_KEY_PROD (optional) the MediaWebhook--Key value of the prod vault; with it, the prod Event Grid subscription is created
//   TTB_PROD_ORIGINS         (optional) the custom domain's browser origins, comma-separated, e.g. https://www.example.com
using 'main.bicep'

param restrictAppAccess = false

param allowedIpRanges = filter(map(split(readEnvironmentVariable('TTB_ALLOWED_IPS', ''), ','), ip => trim(ip)), ip => !empty(ip))

param stage = 'prod'

param location = 'eastus'

param planSku = 'B1'

param environments = [
  {
    name: 'prod'
    aspnetEnvironment: 'Production'
    githubEnvironment: 'production'
    extraCorsOrigins: filter(map(split(readEnvironmentVariable('TTB_PROD_ORIGINS', ''), ','), origin => trim(origin)), origin => !empty(origin))
    squareAlerts: true
    canAdminWriteMedia: true
    restrictMediaListing: true
  }
]

param budgetStartDate = '2026-10-01T00:00:00Z'

// Nonprod's deploy owns the subscription budget.
param createBudget = false

param alertEmail = readEnvironmentVariable('TTB_ALERT_EMAIL')

param alertPhone = readEnvironmentVariable('TTB_ALERT_PHONE', '')

param adminPrincipalId = readEnvironmentVariable('TTB_ADMIN_OBJECT_ID', '')

param mediaWebhookKeys = {
  prod: readEnvironmentVariable('TTB_MEDIA_WEBHOOK_KEY_PROD', '')
}
