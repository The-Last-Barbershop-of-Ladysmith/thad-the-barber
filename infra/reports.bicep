// CI reports (issue #137): Playwright, Lighthouse and coverage reports in a private storage account, read through an
// Entra-protected viewer app. Deploy after main.bicep, since the viewer runs on the nonprod plan and the deploy
// identities get upload rights:
//   az deployment sub create --name reports --location centralus --parameters infra/reports.bicepparam
// then re-run infra/scripts/Set-TtbGitHub.ps1, which reads this deployment's outputs into repo variables.
// Separate from main.bicep because it creates Entra (Microsoft Graph) objects, which what-if can't preview.
// See docs/environments.md#ci-reports.
targetScope = 'subscription'

import * as github from 'github.bicep'

@description('Region of the nonprod resources. Also the last part of every name here.')
param location string = 'centralus'

@description('Object ID of the owner, the only user who may sign in to the viewer.')
param ownerPrincipalId string

@description('Environments whose deploy identity (id-ttb-deploy-<env>-<region>) uploads smoke reports.')
param deployEnvironments string[]

@description('Your public IPs or CIDRs, allowed through the viewer\'s access restrictions.')
param allowedIpRanges string[] = []

param coolAfterDays int = 30
param deleteAfterDays int = 365
param dotnetRuntime string = 'DOTNETCORE|10.0'
param lockResourceGroup bool = true

param tags object = {
  app: 'thad-the-barber'
  stage: 'ci'
}

resource ciRg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-ttb-ci-${location}'
  location: location
  tags: tags
}

resource nonprodRg 'Microsoft.Resources/resourceGroups@2024-03-01' existing = {
  name: 'rg-ttb-nonprod-${location}'
}

resource plan 'Microsoft.Web/serverfarms@2024-11-01' existing = {
  scope: nonprodRg
  name: 'asp-ttb-nonprod-${location}'
}

resource deployIdentities 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' existing = [
  for env in deployEnvironments: {
    scope: nonprodRg
    name: 'id-ttb-deploy-${env}-${location}'
  }
]

// The viewer must sit in the plan's resource group. It's told the account's name, which is fixed by convention,
// so it doesn't wait on the storage module (which needs the viewer's identity).
module viewer 'modules/report-viewer.bicep' = {
  scope: nonprodRg
  name: 'reports-viewer'
  params: {
    location: location
    planId: plan.id
    dotnetRuntime: dotnetRuntime
    storageName: 'storttbci${location}'
    containerName: 'reports'
    allowedIpRanges: allowedIpRanges
    ownerPrincipalId: ownerPrincipalId
    deployerPrincipalId: deployIdentities[indexOf(deployEnvironments, 'dev')].properties.principalId
    tags: tags
  }
}

module storage 'modules/reports-storage.bicep' = {
  scope: ciRg
  name: 'reports-storage'
  params: {
    location: location
    coolAfterDays: coolAfterDays
    deleteAfterDays: deleteAfterDays
    githubSubjectPrefix: github.subjectPrefix
    readerPrincipalId: viewer.outputs.principalId
    writerPrincipalIds: [for (env, i) in deployEnvironments: deployIdentities[i].properties.principalId]
    lockResourceGroup: lockResourceGroup
    tags: tags
  }
}

@description('REPORTS_URL repo variable.')
output viewerUrl string = viewer.outputs.url

@description('REPORTS_STORAGE_ACCOUNT repo variable.')
output storageAccount string = storage.outputs.storageName

@description('AZURE_REPORTS_CLIENT_ID repo variable, for pull requests and the nightly smoke run.')
output ciClientId string = storage.outputs.ciClientId
