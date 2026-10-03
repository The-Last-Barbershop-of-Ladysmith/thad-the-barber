// One Linux App Service app with a system-assigned identity, HTTPS only, TLS 1.2 and no FTP or basic-auth publishing.
// Platform CORS is left unset on purpose: the API handles CORS itself (issue #11), and platform CORS would override it.

param name string
param location string
param planId string

@description('linuxFxVersion, e.g. NODE|24-lts or DOTNETCORE|10.0.')
param runtime string

param alwaysOn bool

@description('App settings as name/value pairs. Nothing sensitive: secrets stay in Key Vault.')
param appSettings object

@description('Deny traffic except allowedIpRanges and the AzureCloud service tag (GitHub runners, for smoke tests). The Kudu deploy endpoint keeps its own open rules: basic auth is off, so it needs an Entra sign-in.')
param restrictAccess bool

param allowedIpRanges string[]

@description('Resource ID of a user-assigned identity to add beside the system-assigned one. Empty adds none.')
param userAssignedIdentityId string = ''

param tags object

var allowedIpRules = [
  for (ip, i) in allowedIpRanges: {
    name: 'allowed-${i}'
    action: 'Allow'
    priority: 100 + i
    ipAddress: contains(ip, '/') ? ip : '${ip}/32'
  }
]

var azureCloudRule = [
  {
    name: 'azure-cloud'
    action: 'Allow'
    priority: 300
    tag: 'ServiceTag'
    ipAddress: 'AzureCloud'
  }
]

resource app 'Microsoft.Web/sites@2024-11-01' = {
  name: name
  location: location
  tags: tags
  kind: 'app,linux'
  identity: empty(userAssignedIdentityId)
    ? {
        type: 'SystemAssigned'
      }
    : {
        type: 'SystemAssigned, UserAssigned'
        userAssignedIdentities: {
          '${userAssignedIdentityId}': {}
        }
      }
  properties: {
    serverFarmId: planId
    httpsOnly: true
    clientAffinityEnabled: false
    keyVaultReferenceIdentity: 'SystemAssigned'
    siteConfig: {
      linuxFxVersion: runtime
      alwaysOn: alwaysOn
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      http20Enabled: true
      ipSecurityRestrictionsDefaultAction: restrictAccess ? 'Deny' : 'Allow'
      ipSecurityRestrictions: restrictAccess ? concat(allowedIpRules, azureCloudRule) : []
      scmIpSecurityRestrictionsUseMain: false
      scmIpSecurityRestrictionsDefaultAction: 'Allow'
      appSettings: [
        for setting in items(appSettings): {
          name: setting.key
          value: setting.value
        }
      ]
    }
  }

  resource ftp 'basicPublishingCredentialsPolicies' = {
    name: 'ftp'
    properties: {
      allow: false
    }
  }

  resource scm 'basicPublishingCredentialsPolicies' = {
    name: 'scm'
    properties: {
      allow: false
    }
  }
}

output principalId string = app.identity.principalId
output url string = 'https://${app.properties.defaultHostName}'

@description('Comma-separated IPv4 addresses the app may call out from; used by the Key Vault firewall.')
output possibleOutboundIps string = app.properties.possibleOutboundIpAddresses
