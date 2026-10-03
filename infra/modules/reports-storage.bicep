// The private account that holds every environment's CI reports (issue #137), the identity pull requests upload
// with, and who may read or write the reports container.

param location string

@description('Days a report stays on the Hot tier before moving to Cool.')
param coolAfterDays int

@description('Days after which a report is deleted.')
param deleteAfterDays int

param githubSubjectPrefix string

@description('The viewer app\'s system-assigned identity. Gets Storage Blob Data Reader on the container.')
param readerPrincipalId string

@description('The environments\' deploy identities, which upload smoke reports. Get Storage Blob Data Contributor on the container.')
param writerPrincipalIds string[]

param lockResourceGroup bool
param tags object

var storageBlobDataReader = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: 'storttbci${location}'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }

  resource blob 'blobServices' = {
    name: 'default'

    resource reports 'containers' = {
      name: 'reports'
      properties: {
        publicAccess: 'None'
      }
    }
  }

  // Cool, not Archive: archived blobs are offline, so old links would stop working.
  resource lifecycle 'managementPolicies' = {
    name: 'default'
    properties: {
      policy: {
        rules: [
          {
            name: 'age-out-reports'
            enabled: true
            type: 'Lifecycle'
            definition: {
              filters: {
                blobTypes: [
                  'blockBlob'
                ]
                prefixMatch: [
                  'reports/'
                ]
              }
              actions: {
                baseBlob: {
                  tierToCool: {
                    daysAfterModificationGreaterThan: coolAfterDays
                  }
                  delete: {
                    daysAfterModificationGreaterThan: deleteAfterDays
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
}

// Pull requests upload their reports as this identity; the nightly smoke run on main does too, because the test
// environment's deploy identity only trusts release/* and hotfix/* jobs. Fork PRs get no OIDC token.
resource ciIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-ttb-reports-ci-${location}'
  location: location
  tags: tags

  resource pullRequest 'federatedIdentityCredentials' = {
    name: 'github-pull-request'
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: '${githubSubjectPrefix}:pull_request'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }

  resource main 'federatedIdentityCredentials' = {
    name: 'github-main'
    // Federated credentials on one identity can't be written in parallel.
    dependsOn: [
      pullRequest
    ]
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      subject: '${githubSubjectPrefix}:ref:refs/heads/main'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }
}

resource viewerReads 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage::blob::reports.id, 'viewer', storageBlobDataReader)
  scope: storage::blob::reports
  properties: {
    principalId: readerPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataReader)
  }
}

resource ciWrites 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage::blob::reports.id, ciIdentity.id, storageBlobDataContributor)
  scope: storage::blob::reports
  properties: {
    principalId: ciIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
  }
}

resource deployWrites 'Microsoft.Authorization/roleAssignments@2022-04-01' = [
  for principalId in writerPrincipalIds: {
    name: guid(storage::blob::reports.id, principalId, storageBlobDataContributor)
    scope: storage::blob::reports
    properties: {
      principalId: principalId
      principalType: 'ServicePrincipal'
      roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributor)
    }
  }
]

resource lock 'Microsoft.Authorization/locks@2020-05-01' = if (lockResourceGroup) {
  name: 'lock-ttb-ci-${location}'
  properties: {
    level: 'CanNotDelete'
    notes: 'Protects the CI reports. Remove this lock before deleting anything on purpose.'
  }
}

output storageName string = storage.name
output containerName string = storage::blob::reports.name
output ciClientId string = ciIdentity.properties.clientId
