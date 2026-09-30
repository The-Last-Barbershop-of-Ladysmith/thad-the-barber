// Resources shared by every environment in a stage: the App Service plan, Log Analytics and the media storage account.

param stage string
param location string
param planSku string
param logDailyCapGb string

@description('Used for the blob CORS rule, so the web apps can fetch media (e.g. backdrop frames) cross-origin.')
param environments array

param deployPrincipalId string
param tags object

var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

// Origins are built from the app names (not defaultHostName) so what-if stays deterministic.
var webOrigins = flatten(map(environments, e => concat([
  'https://as-ttb-web-${e.name}-${location}.azurewebsites.net'
], e.extraCorsOrigins)))

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: 'asp-ttb-${stage}-${location}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: planSku
  }
  properties: {
    reserved: true
  }
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-ttb-${stage}-${location}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json(logDailyCapGb)
    }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  // Storage names allow only lowercase letters and digits (3–24).
  name: 'stttb${stage}${location}'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }

  resource blob 'blobServices' = {
    name: 'default'
    properties: {
      cors: {
        corsRules: [
          {
            allowedOrigins: webOrigins
            allowedMethods: [
              'GET'
              'HEAD'
            ]
            allowedHeaders: [
              '*'
            ]
            exposedHeaders: [
              '*'
            ]
            maxAgeInSeconds: 3600
          }
        ]
      }
    }
  }
}

resource deployBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deployPrincipalId)) {
  name: guid(storage.id, 'github-deploy', storageBlobDataContributor)
  scope: storage
  properties: {
    principalId: deployPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
  }
}

output planId string = plan.id
output workspaceId string = workspace.id
output storageName string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
