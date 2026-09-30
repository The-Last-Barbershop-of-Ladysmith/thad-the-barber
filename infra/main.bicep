// Thad the Barber infrastructure (issue #9). Deploy at subscription scope:
//   az deployment sub create --location centralus --parameters infra/nonprod.bicepparam
// See docs/environments.md for the one-time setup and the secrets to add after the first deploy.
targetScope = 'subscription'

@description('One hosted environment on the plan.')
type environmentConfig = {
  @description('Short name used in resource names: dev, test or prod.')
  name: string

  @description('ASPNETCORE_ENVIRONMENT for the API app.')
  aspnetEnvironment: string

  @description('GitHub environment whose jobs may deploy here (dev, test or production). The deploy identity trusts only that environment.')
  githubEnvironment: string

  @description('Browser origins the API allows besides its own web app (custom domains in prod). Seeded into Key Vault as Cors--AllowedOrigins--N.')
  extraCorsOrigins: string[]
}

@description('Stage used in shared resource names.')
@allowed([
  'nonprod'
  'prod'
])
param stage string

@description('Region. Also the last part of every resource name, so keep it short enough for the storage account (24 characters).')
param location string = 'eastus'

@description('App Service plan SKU. F1 is free and has no Always On; B1 turns Always On on.')
@allowed([
  'F1'
  'B1'
])
param planSku string

@description('Environments hosted on the plan. Each gets a web app, an API app, a Key Vault, App Insights and a media container.')
param environments environmentConfig[]

param nodeRuntime string = 'NODE|24-lts'

param dotnetRuntime string = 'DOTNETCORE|10.0'

@description('Log Analytics daily ingestion cap in GB. 0.15 GB/day keeps a month under the 5 GB free allowance.')
param logDailyCapGb string = '0.15'

@description('Monthly subscription budget in USD.')
param budgetAmount int = 5

@description('First day of the first budget month (ISO 8601). Keep it fixed so re-runs make no changes.')
param budgetStartDate string

@description('Email that receives the budget alerts.')
param budgetEmail string

@description('Object ID of the owner. Gets Key Vault Secrets Officer on each vault so they can add the secrets. Empty skips it.')
param adminPrincipalId string = ''

@description('Start of the GitHub OIDC subject claim. The repo uses immutable subjects (owner and repo IDs), so a renamed or re-created repo can\'t inherit the trust.')
param githubSubjectPrefix string = 'repo:The-Last-Barbershop-of-Ladysmith@118852654/thad-the-barber@1391006695'

@description('Create the identity that pull requests use to run what-if (Reader on the subscription). One stage is enough.')
param createPreviewIdentity bool = false

@description('Put a CanNotDelete lock on the resource group. Remove the lock first to tear the stage down.')
param lockResourceGroup bool = true

@description('Deny public traffic to the apps except allowedIpRanges and Azure IPs (CI smoke tests). For nonprod; prod stays public.')
param restrictAppAccess bool

@description('Your public IPs or CIDRs. Allowed through the app restrictions and the Key Vault firewall.')
param allowedIpRanges string[] = []

param tags object = {
  app: 'thad-the-barber'
  stage: stage
}

// Naming: <type>-ttb-<env>-<region>, e.g. kv-ttb-prod-eastus (storage drops the hyphens).
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-ttb-${stage}-${location}'
  location: location
  tags: tags
}

module shared 'modules/shared.bicep' = {
  scope: rg
  name: 'shared'
  params: {
    stage: stage
    location: location
    planSku: planSku
    logDailyCapGb: logDailyCapGb
    environments: environments
    githubSubjectPrefix: githubSubjectPrefix
    createPreviewIdentity: createPreviewIdentity
    lockResourceGroup: lockResourceGroup
    tags: tags
  }
}

module env 'modules/environment.bicep' = [
  for e in environments: {
    scope: rg
    name: 'env-${e.name}'
    params: {
      envName: e.name
      location: location
      planId: shared.outputs.planId
      workspaceId: shared.outputs.workspaceId
      storageName: shared.outputs.storageName
      mediaBaseUrl: '${shared.outputs.blobEndpoint}media-${e.name}'
      nodeRuntime: nodeRuntime
      dotnetRuntime: dotnetRuntime
      alwaysOn: planSku != 'F1'
      restrictAppAccess: restrictAppAccess
      allowedIpRanges: allowedIpRanges
      noIndex: stage != 'prod'
      aspnetEnvironment: e.aspnetEnvironment
      githubSubjectPrefix: githubSubjectPrefix
      githubEnvironment: e.githubEnvironment
      extraCorsOrigins: e.extraCorsOrigins
      adminPrincipalId: adminPrincipalId
      tags: tags
    }
  }
]

// Pull requests preview infra changes with what-if (issue #10). Reader sees the current state; the custom role adds
// only the what-if and validate actions, so the preview identity can't create or change anything.
var reader = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'

resource whatIfRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = if (createPreviewIdentity) {
  name: guid(subscription().id, 'ttb-what-if')
  properties: {
    roleName: 'TTB What-If Previewer'
    description: 'Runs ARM what-if and validate only. Pair with Reader and use --validation-level ProviderNoRbac.'
    type: 'CustomRole'
    assignableScopes: [
      subscription().id
    ]
    permissions: [
      {
        actions: [
          'Microsoft.Resources/deployments/whatIf/action'
          'Microsoft.Resources/deployments/validate/action'
        ]
        notActions: []
      }
    ]
  }
}

resource previewReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createPreviewIdentity) {
  name: guid(subscription().id, 'github-preview', reader)
  properties: {
    principalId: shared.outputs.previewPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', reader)
  }
}

resource previewWhatIf 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (createPreviewIdentity) {
  name: guid(subscription().id, 'github-preview', 'ttb-what-if')
  properties: {
    principalId: shared.outputs.previewPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: whatIfRole.id
  }
}

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'budget-ttb-monthly'
  properties: {
    category: 'Cost'
    amount: budgetAmount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: budgetStartDate
    }
    notifications: {
      actual80: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: [
          budgetEmail
        ]
      }
      actual100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: [
          budgetEmail
        ]
      }
      forecast100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Forecasted'
        contactEmails: [
          budgetEmail
        ]
      }
    }
  }
}

output resourceGroup string = rg.name
output storageAccount string = shared.outputs.storageName

@description('AZURE_CLIENT_ID repo variable, for the pull-request what-if. Empty when createPreviewIdentity is off.')
output previewClientId string = shared.outputs.previewClientId

output environments array = [
  for (e, i) in environments: {
    name: e.name
    webUrl: env[i].outputs.webUrl
    apiUrl: env[i].outputs.apiUrl
    keyVault: env[i].outputs.keyVaultName
    githubEnvironment: e.githubEnvironment
    deployClientId: env[i].outputs.deployClientId
  }
]
