// A log alert (issue #286), checked every 15 minutes (cents to ~$0.50/month): a visitor sent a question or an issue
// from the contact page, so someone needs to reply or fix something. The API logs ContactNeedsReply with the category
// and the saved file's name only; the contact details stay in that file, which keeps them out of telemetry and email.
// One alert per file (the dimensions), so each message gets its own email, up to ~15 minutes after it was sent.
// Severity 1 (Error) and the "ACTION REQUIRED" name put the Azure email in the subject line as "Sev1" so a Gmail
// filter can mark it important; Azure doesn't allow a custom email subject.

param envName string
param location string
param workspaceId string
param actionGroupId string
param storageName string
param tags object

var contentContainerLink = 'https://portal.azure.com/#view/Microsoft_Azure_Storage/ContainerMenuBlade/~/overview/storageAccountId/%2Fsubscriptions%2F${subscription().subscriptionId}%2FresourceGroups%2F${resourceGroup().name}%2Fproviders%2FMicrosoft.Storage%2FstorageAccounts%2F${storageName}/path/content-${envName}'

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
    displayName: 'ACTION REQUIRED: contact message needs a reply (${envName})'
    description: 'A visitor sent a question or an issue from the contact page. The category and file name are in the alert\'s dimensions. Open the file under contact/ here for who to reach and what they wrote: ${contentContainerLink}'
    severity: 1
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
