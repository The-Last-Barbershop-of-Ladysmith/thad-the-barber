// One environment (dev, test or prod): Key Vault, App Insights, the web and API apps, their role assignments,
// the CORS origin secrets, the environment's public media container and the identity GitHub deploys it with.

param envName string
param location string
param planId string
param workspaceId string
param storageName string
param mediaBaseUrl string
param nodeRuntime string
param dotnetRuntime string
param alwaysOn bool

@description('Tells the Express server to send noindex (every environment except prod).')
param noIndex bool

param aspnetEnvironment string

@description('Start of the GitHub OIDC subject claim, e.g. repo:<owner>@<id>/<repo>@<id>.')
param githubSubjectPrefix string

@description('GitHub environment (dev, test or production) whose jobs may sign in as this environment\'s deploy identity.')
param githubEnvironment string

param extraCorsOrigins string[]
param adminPrincipalId string
param restrictAppAccess bool
param allowedIpRanges string[]
param tags object

var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var keyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var keyVaultCryptoUser = '12338af0-0e69-4776-bea7-57ae8d297424'
var websiteContributor = 'de139f84-1756-47ae-9be6-808fbbe84772'
var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

var webAppName = 'as-ttb-ui-${envName}-${location}'
var apiAppName = 'as-ttb-api-${envName}-${location}'
var webOrigin = 'https://${webAppName}.azurewebsites.net'
var corsOrigins = concat([
  webOrigin
], extraCorsOrigins)

// Built from the name so the apps (which need the URI) can be created before the vault (whose firewall needs their IPs).
var keyVaultName = 'kv-ttb-${envName}-${location}'

// Key Vault IP rules take a bare address for a single host.
var yourIps = map(allowedIpRanges, ip => endsWith(ip, '/32') ? replace(ip, '/32', '') : ip)

// The API rotates the Square refresh token, so it may write that one secret and nothing else.
// ABAC conditions (preview) match lowercase names; @Request covers setSecret before the secret exists.
// Bicep never writes the token itself, so a re-run can't overwrite a rotated value.
var refreshTokenSecret = 'square--refreshtoken'
var refreshTokenOnlyCondition = '''
(
 (
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/setSecret/action'})
  AND
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/restore/action'})
 )
 OR
 (
  @Request[Microsoft.KeyVault/vaults/secrets:name] StringEquals 'SECRET_NAME'
 )
)
AND
(
 (
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/update/action'})
  AND
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/delete'})
  AND
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/backup/action'})
  AND
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/recover/action'})
  AND
  !(ActionMatches{'Microsoft.KeyVault/vaults/secrets/purge/action'})
 )
 OR
 (
  @Resource[Microsoft.KeyVault/vaults/secrets:name] StringEquals 'SECRET_NAME'
 )
)
'''

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-ttb-${envName}-${location}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceId
    IngestionMode: 'LogAnalytics'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    // Firewall: only the apps' outbound IPs and yours. ARM deployments (the CORS secrets, the JWT key) aren't affected.
    // On F1 the outbound IPs are shared and can change if Azure moves the app; re-deploy to refresh them.
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: map(union(split(web.outputs.possibleOutboundIps, ','), split(api.outputs.possibleOutboundIps, ','), yourIps), ip => {
        value: ip
      })
    }
  }
}

// Non-sensitive and owned by Bicep, so re-seeding on every run is safe.
resource corsSecrets 'Microsoft.KeyVault/vaults/secrets@2024-11-01' = [
  for (origin, i) in corsOrigins: {
    parent: keyVault
    name: 'Cors--AllowedOrigins--${i}'
    properties: {
      value: origin
      contentType: 'text/plain'
    }
  }
]

// ES256 session-JWT signing key. Key Vault generates it and it never leaves the vault.
// ARM creates keys only if they don't exist, so re-runs don't rotate it.
resource sessionJwtKey 'Microsoft.KeyVault/vaults/keys@2024-11-01' = {
  parent: keyVault
  name: 'session-jwt-signing'
  properties: {
    kty: 'EC'
    curveName: 'P-256'
    keyOps: [
      'sign'
      'verify'
    ]
  }
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  name: '${storageName}/default/media-${envName}'
  properties: {
    publicAccess: 'Blob'
  }
}

module web 'app-service.bicep' = {
  name: '${envName}-ui'
  params: {
    name: webAppName
    location: location
    planId: planId
    runtime: nodeRuntime
    alwaysOn: alwaysOn
    restrictAccess: restrictAppAccess
    allowedIpRanges: allowedIpRanges
    tags: tags
    appSettings: {
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
      API_ORIGIN: 'https://${apiAppName}.azurewebsites.net'
      MEDIA_BASE_URL: mediaBaseUrl
      NOINDEX: string(noIndex)
    }
  }
}

module api 'app-service.bicep' = {
  name: '${envName}-api'
  params: {
    name: apiAppName
    location: location
    planId: planId
    runtime: dotnetRuntime
    alwaysOn: alwaysOn
    restrictAccess: restrictAppAccess
    allowedIpRanges: allowedIpRanges
    tags: tags
    appSettings: {
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
      ASPNETCORE_ENVIRONMENT: aspnetEnvironment
      // App Service terminates TLS; this lets the API see X-Forwarded-Proto so HSTS is sent on HTTPS requests.
      ASPNETCORE_FORWARDEDHEADERS_ENABLED: 'true'
    }
  }
}

resource webSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webAppName, keyVaultSecretsUser)
  scope: keyVault
  properties: {
    principalId: web.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
  }
}

resource apiSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, apiAppName, keyVaultSecretsUser)
  scope: keyVault
  properties: {
    principalId: api.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUser)
  }
}

resource apiRefreshTokenOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, apiAppName, keyVaultSecretsOfficer)
  scope: keyVault
  properties: {
    principalId: api.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficer)
    description: 'Write access to ${refreshTokenSecret} only (it rotates).'
    conditionVersion: '2.0'
    condition: replace(refreshTokenOnlyCondition, 'SECRET_NAME', refreshTokenSecret)
  }
}

resource apiJwtSigner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sessionJwtKey.id, apiAppName, keyVaultCryptoUser)
  scope: sessionJwtKey
  properties: {
    principalId: api.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultCryptoUser)
  }
}

resource adminSecretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(adminPrincipalId)) {
  name: guid(keyVault.id, 'admin', keyVaultSecretsOfficer)
  scope: keyVault
  properties: {
    principalId: adminPrincipalId
    principalType: 'User'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsOfficer)
  }
}

// GitHub Actions deploys with this identity (issue #10): OIDC, no stored secret. It trusts only jobs that run in
// this environment's GitHub environment, and can deploy only this environment's two apps and media container.
resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-ttb-deploy-${envName}-${location}'
  location: location
  tags: tags

  resource github 'federatedIdentityCredentials' = {
    name: 'github-${githubEnvironment}'
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: '${githubSubjectPrefix}:environment:${githubEnvironment}'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }
}

resource webSite 'Microsoft.Web/sites@2024-11-01' existing = {
  name: webAppName
}

resource apiSite 'Microsoft.Web/sites@2024-11-01' existing = {
  name: apiAppName
}

resource deployWeb 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(webAppName, 'github-deploy', websiteContributor)
  scope: webSite
  dependsOn: [
    web
  ]
  properties: {
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributor)
  }
}

resource deployApi 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(apiAppName, 'github-deploy', websiteContributor)
  scope: apiSite
  dependsOn: [
    api
  ]
  properties: {
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributor)
  }
}

// Uploads media (backdrop frames, gallery) to this environment's container only.
resource deployMedia 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(mediaContainer.id, 'github-deploy', storageBlobDataContributor)
  scope: mediaContainer
  properties: {
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
  }
}

output webUrl string = web.outputs.url
output apiUrl string = api.outputs.url
output keyVaultName string = keyVault.name

@description('AZURE_CLIENT_ID variable of the matching GitHub environment.')
output deployClientId string = deployIdentity.properties.clientId
