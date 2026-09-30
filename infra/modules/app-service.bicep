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

param tags object

resource app 'Microsoft.Web/sites@2024-11-01' = {
  name: name
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
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
