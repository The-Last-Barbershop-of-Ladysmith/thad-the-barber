// One environment (dev, test or prod): Key Vault, App Insights, the web and API apps, their role assignments,
// the CORS origin secrets and the environment's public media container.

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
param extraCorsOrigins string[]
param adminPrincipalId string
param tags object

var keyVaultSecretsUser = '4633458b-17de-408a-b874-0445c86b69e6'
var keyVaultSecretsOfficer = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var keyVaultCryptoUser = '12338af0-0e69-4776-bea7-57ae8d297424'

var webAppName = 'as-ttb-web-${envName}-${location}'
var apiAppName = 'as-ttb-api-${envName}-${location}'
var webOrigin = 'https://${webAppName}.azurewebsites.net'
var corsOrigins = concat([
  webOrigin
], extraCorsOrigins)

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
  name: 'kv-ttb-${envName}-${location}'
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
  name: '${envName}-web'
  params: {
    name: webAppName
    location: location
    planId: planId
    runtime: nodeRuntime
    alwaysOn: alwaysOn
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
    tags: tags
    appSettings: {
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
      ASPNETCORE_ENVIRONMENT: aspnetEnvironment
      // The API loads every secret (and the CORS origins) through the Key Vault configuration provider (issue #11).
      KeyVault__Uri: keyVault.properties.vaultUri
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

output webUrl string = web.outputs.url
output apiUrl string = api.outputs.url
output keyVaultName string = keyVault.name
