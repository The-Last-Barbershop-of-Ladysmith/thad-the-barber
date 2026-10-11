// dev + test on one F1 Free Linux plan in rg-ttb-nonprod-centralus (issue #9).
// Personal values come from environment variables so they stay out of this public repo:
//   TTB_ALERT_EMAIL          (required) who gets every alert (the $5 budget, Square)
//   TTB_ALERT_PHONE          (optional) US mobile number, 10 digits, for the same alerts by SMS
//   TTB_ADMIN_OBJECT_ID      (optional) your Entra object ID, for Key Vault Secrets Officer and media container access
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
    aspnetEnvironment: 'Development'
    githubEnvironment: 'dev'
    // Local runs also use the dev vault and media container, so its CORS lists include ng serve (4200) and the
    // local Express server (3000). Index 2 replaces the hand-made Cors--AllowedOrigins--2 with the same value.
    extraCorsOrigins: [
      'http://localhost:4200'
      'http://localhost:3000'
    ]
    // Local runs also sign session tokens with the dev key, under your az login.
    canAdminSignSessions: true
    // Lets you edit the gallery and content in the portal, as Thad will.
    canAdminWriteMedia: true
  }
  {
    name: 'test'
    aspnetEnvironment: 'Test'
    githubEnvironment: 'test'
    extraCorsOrigins: []
    canAdminWriteMedia: true
  }
]

param budgetStartDate = '2026-10-01T00:00:00Z'

param alertEmail = readEnvironmentVariable('TTB_ALERT_EMAIL')

param alertPhone = readEnvironmentVariable('TTB_ALERT_PHONE', '')

param adminPrincipalId = readEnvironmentVariable('TTB_ADMIN_OBJECT_ID', '')

// Pull requests run what-if on the subscription with this stage's preview identity.
param createPreviewIdentity = true
