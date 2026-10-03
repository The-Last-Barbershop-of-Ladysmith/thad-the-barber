// The reports viewer (issue #137): an app on the nonprod plan behind App Service authentication with Microsoft Entra,
// the Entra app it signs in with (only the owner is assigned) and the identity that replaces the client secret.

extension microsoftGraphV1

param location string
param planId string
param dotnetRuntime string
param storageName string
param containerName string
param allowedIpRanges string[]

@description('Object ID of the only user who may sign in.')
param ownerPrincipalId string

@description('The dev deploy identity. Gets Website Contributor on the viewer so cd-dev can deploy it.')
param deployerPrincipalId string

param tags object

var appName = 'as-ttb-reports-nonprod-${location}'
var websiteContributor = 'de139f84-1756-47ae-9be6-808fbbe84772'
var openIdIssuer = '${environment().authentication.loginEndpoint}${tenant().tenantId}/v2.0'

// Easy Auth's client assertion comes from this identity instead of a client secret. It must be user-assigned and
// assigned to this app only, since anything holding it can sign in as the Entra app.
resource authIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-ttb-reports-auth-nonprod-${location}'
  location: location
  tags: tags
}

resource entraApp 'Microsoft.Graph/applications@v1.0' = {
  uniqueName: 'ttb-reports-viewer-nonprod'
  displayName: 'Thad the Barber reports viewer (nonprod)'
  signInAudience: 'AzureADMyOrg'
  web: {
    redirectUris: [
      'https://${appName}.azurewebsites.net/.auth/login/aad/callback'
    ]
    implicitGrantSettings: {
      enableIdTokenIssuance: true
    }
  }

  resource managedIdentityCredential 'federatedIdentityCredentials@v1.0' = {
    name: 'viewer-managed-identity'
    issuer: openIdIssuer
    subject: authIdentity.properties.principalId
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

resource servicePrincipal 'Microsoft.Graph/servicePrincipals@v1.0' = {
  appId: entraApp.appId
  appRoleAssignmentRequired: true
}

// The default role (all zeros) assigns the user to the app without a specific app role.
resource ownerAssignment 'Microsoft.Graph/appRoleAssignedTo@v1.0' = {
  appRoleId: '00000000-0000-0000-0000-000000000000'
  principalId: ownerPrincipalId
  resourceId: servicePrincipal.id
}

module app 'app-service.bicep' = {
  name: 'reports-viewer'
  params: {
    name: appName
    location: location
    planId: planId
    runtime: dotnetRuntime
    alwaysOn: false
    restrictAccess: true
    allowedIpRanges: allowedIpRanges
    userAssignedIdentityId: authIdentity.id
    tags: tags
    appSettings: {
      Reports__StorageAccount: storageName
      Reports__Container: containerName
      OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID: authIdentity.properties.clientId
    }
  }
}

resource site 'Microsoft.Web/sites@2024-11-01' existing = {
  name: appName
}

resource auth 'Microsoft.Web/sites/config@2024-11-01' = {
  parent: site
  name: 'authsettingsV2'
  dependsOn: [
    app
  ]
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
    }
    httpSettings: {
      requireHttps: true
    }
    login: {
      tokenStore: {
        enabled: false
      }
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          openIdIssuer: openIdIssuer
          clientId: entraApp.appId
          clientSecretSettingName: 'OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID'
        }
        // Checked on top of the Entra assignment: the token's oid must be the owner's.
        validation: {
          defaultAuthorizationPolicy: {
            allowedPrincipals: {
              identities: [
                ownerPrincipalId
              ]
            }
          }
        }
      }
    }
  }
}

resource deployViewer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(appName, 'github-deploy', websiteContributor)
  scope: site
  dependsOn: [
    app
  ]
  properties: {
    principalId: deployerPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', websiteContributor)
  }
}

output url string = app.outputs.url
output principalId string = app.outputs.principalId
