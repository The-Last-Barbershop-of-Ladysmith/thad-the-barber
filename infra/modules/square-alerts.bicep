// Two log alerts (issue #23), checked every 15 minutes (~$0.50/month each). They need different responses:
// - secret-read: a Square secret was read by someone other than the API. Possibly a breach, or you running az.
// - not-connected: Square refused the refresh token or it's missing. Usually a disconnect, not a breach.

param envName string
param location string
param workspaceId string
param keyVaultName string
param apiPrincipalId string
param actionGroupId string
param tags object

var secretReadQuery = '''
AZKVAuditLogs
| where _ResourceId endswith '/vaults/KEY_VAULT' and OperationName == 'SecretGet'
| where RequestUri has 'Square--RefreshToken' or RequestUri has 'Square--ApplicationSecret'
| extend Caller = coalesce(tostring(Identity.claim.oid), tostring(Identity.claim['http://schemas.microsoft.com/identity/claims/objectidentifier']))
| where Caller != 'API_PRINCIPAL'
| project TimeGenerated, Caller, CallerIpAddress, RequestUri
'''

var notConnectedQuery = '''
AppTraces
| where _ResourceId has 'APP_INSIGHTS'
| where tostring(Properties.EventName) in ('SquareRefreshTokenRefused', 'SquareSecretMissing')
| project TimeGenerated, Message
'''

var rules = [
  {
    name: 'secret-read'
    displayName: 'Square secret read outside the API (${envName})'
    description: 'A Square secret was read from Key Vault by an identity other than the API. If it wasn\'t you (az, tools/square-connect, Set-TtbSecrets), follow the breach checklist in docs/architecture-decisions.md §M.'
    severity: 1
    query: replace(replace(secretReadQuery, 'KEY_VAULT', keyVaultName), 'API_PRINCIPAL', apiPrincipalId)
  }
  {
    name: 'not-connected'
    displayName: 'Square isn\'t connected (${envName})'
    description: 'Square refused the refresh token or it\'s missing from Key Vault, so bookings can\'t reach Square. Usually Thad disconnected the app or the app secret changed: rerun tools/square-connect.'
    severity: 2
    query: replace(notConnectedQuery, 'APP_INSIGHTS', 'ai-ttb-${envName}-${location}')
  }
]

resource alerts 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [
  for rule in rules: {
    name: 'alert-ttb-square-${rule.name}-${envName}-${location}'
    location: location
    tags: tags
    properties: {
      displayName: rule.displayName
      description: rule.description
      severity: rule.severity
      enabled: true
      scopes: [
        workspaceId
      ]
      evaluationFrequency: 'PT15M'
      windowSize: 'PT15M'
      criteria: {
        allOf: [
          {
            query: rule.query
            timeAggregation: 'Count'
            operator: 'GreaterThan'
            threshold: 0
            failingPeriods: {
              numberOfEvaluationPeriods: 1
              minFailingPeriodsToAlert: 1
            }
          }
        ]
      }
      actions: {
        actionGroups: [
          actionGroupId
        ]
      }
    }
  }
]
