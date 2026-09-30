// Resources shared by every environment in a stage: the App Service plan, Log Analytics, the media storage account
// and (optionally) the identity pull requests use to preview infra changes.

param stage string
param location string
param planSku string
param logDailyCapGb string

@description('Used for the blob CORS rule, so the web apps can fetch media (e.g. backdrop frames) cross-origin.')
param environments array

param githubSubjectPrefix string
param createPreviewIdentity bool
param lockResourceGroup bool
param tags object

// Origins are built from the app names (not defaultHostName) so what-if stays deterministic.
var webOrigins = flatten(map(environments, e => concat([
  'https://as-ttb-ui-${e.name}-${location}.azurewebsites.net'
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
  name: 'storttb${stage}${location}'
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

// Pull-request what-if (issue #10). Its subscription roles are assigned in main.bicep.
// Any pull request from a branch in this repo can use it; fork PRs get no OIDC token.
resource previewIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = if (createPreviewIdentity) {
  name: 'id-ttb-preview-${stage}-${location}'
  location: location
  tags: tags

  resource github 'federatedIdentityCredentials' = {
    name: 'github-pull-request'
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: '${githubSubjectPrefix}:pull_request'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }
}

// Blocks deletes (not changes) of everything in the group, including by a compromised sign-in.
resource lock 'Microsoft.Authorization/locks@2020-05-01' = if (lockResourceGroup) {
  name: 'lock-ttb-${stage}-${location}'
  properties: {
    level: 'CanNotDelete'
    notes: 'Protects the ${stage} environment. Remove this lock before deleting anything on purpose.'
  }
}

output planId string = plan.id
output workspaceId string = workspace.id
output storageName string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
output previewPrincipalId string = createPreviewIdentity ? previewIdentity!.properties.principalId : ''
output previewClientId string = createPreviewIdentity ? previewIdentity!.properties.clientId : ''
