// A log alert (issue #286), checked every 15 minutes (cents to ~$0.50/month): a visitor sent a question or an issue
// from the contact page, so someone needs to reply or fix something. The API logs ContactNeedsReply with the category
// and the saved file's name only; the contact details stay in that file, which keeps them out of telemetry and email.
// One alert per file (the dimensions), so each message gets its own email, up to ~15 minutes after it was sent.

param envName string
param location string
param workspaceId string
param actionGroupId string
param tags object

var query = '''
AppTraces
| where _ResourceId has 'APP_INSIGHTS'
| where tostring(Properties.EventName) == 'ContactNeedsReply'
| project TimeGenerated, Category = tostring(Properties.Category), FileName = tostring(Properties.FileName)
'''

resource alert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: 'alert-ttb-contact-needs-reply-${envName}-${location}'
  location: location
  tags: tags
  properties: {
    displayName: 'Contact message needs a reply (${envName})'
    description: 'A visitor sent a question or an issue from the contact page. The category and file name are in the alert\'s dimensions; read the file under contact/ in this environment\'s content container for who to reach and what they wrote.'
    severity: 3
    enabled: true
    autoMitigate: false
    scopes: [
      workspaceId
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: replace(query, 'APP_INSIGHTS', 'ai-ttb-${envName}-${location}')
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          dimensions: [
            {
              name: 'Category'
              operator: 'Include'
              values: [
                '*'
              ]
            }
            {
              name: 'FileName'
              operator: 'Include'
              values: [
                '*'
              ]
            }
          ]
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
