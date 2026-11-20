// Three log alerts for the shop's own texts (issue #338), checked every 15 minutes (~$0.50/month each). Deploy them only
// where TextMessages:IsEnabled is true: the third one fires when the reminder run is silent, which is what an
// environment with texts switched off looks like. The API logs these events with a text's kind and Twilio's error code
// only, never a phone number or the message.
// - send-failed: a text didn't go out or may not have (Twilio refused it or didn't answer), or a run that sends texts failed.
// - not-delivered: Twilio accepted a text but the carrier reported it undelivered or failed (error code in the trace).
// - reminders-silent: no reminder run in the last day. It runs four times a day, in the shop's reminder hours.

param envName string
param location string
param workspaceId string
param actionGroupId string
param tags object

var sendFailedQuery = '''
AppTraces
| where _ResourceId has 'APP_INSIGHTS'
| where tostring(Properties.EventName) in ('TextUnreachable', 'TextRefused', 'RemindersFailed', 'AnnouncementTextsFailed', 'BookingTextNotHandled')
| project TimeGenerated, EventName = tostring(Properties.EventName), Message
'''

var notDeliveredQuery = '''
AppTraces
| where _ResourceId has 'APP_INSIGHTS'
| where tostring(Properties.EventName) == 'TextNotDelivered'
| project TimeGenerated, Message
'''

var remindersSilentQuery = '''
AppTraces
| where _ResourceId has 'APP_INSIGHTS'
| where tostring(Properties.EventName) == 'RemindersRan'
| summarize Runs = count()
'''

var rules = [
  {
    name: 'send-failed'
    displayName: 'A text failed to send (${envName})'
    description: 'Twilio refused a text or didn\'t answer, or the reminder run, an announcement text or a booking\'s texts failed. The event name and Twilio error code are in the trace. A text Twilio didn\'t answer may have gone and is never sent again; find it by its marker blob in the content container.'
    severity: 2
    query: sendFailedQuery
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    timeAggregation: 'Count'
    metricMeasureColumn: null
    operator: 'GreaterThan'
    threshold: 0
  }
  {
    name: 'not-delivered'
    displayName: 'A text was not delivered (${envName})'
    description: 'Twilio sent a text but the carrier reported it undelivered or failed. The Twilio error code is in the trace; find the message by its SID in the month\'s log under messages/ in the content container.'
    severity: 3
    query: notDeliveredQuery
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    timeAggregation: 'Count'
    metricMeasureColumn: null
    operator: 'GreaterThan'
    threshold: 0
  }
  {
    name: 'reminders-silent'
    displayName: 'No reminder run in a day (${envName})'
    description: 'The reminder run logs RemindersRan four times a day. None in the last 24 hours means the worker is stopped or stuck, so no reminders are going out. Check the API app\'s health and logs. It also fires for a day after a first deploy.'
    severity: 2
    query: remindersSilentQuery
    evaluationFrequency: 'PT1H'
    windowSize: 'P1D'
    timeAggregation: 'Total'
    metricMeasureColumn: 'Runs'
    operator: 'LessThan'
    threshold: 1
  }
]

resource alerts 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [
  for rule in rules: {
    name: 'alert-ttb-text-${rule.name}-${envName}-${location}'
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
      evaluationFrequency: rule.evaluationFrequency
      windowSize: rule.windowSize
      criteria: {
        allOf: [
          {
            query: replace(rule.query, 'APP_INSIGHTS', 'ai-ttb-${envName}-${location}')
            timeAggregation: rule.timeAggregation
            metricMeasureColumn: rule.metricMeasureColumn
            operator: rule.operator
            threshold: rule.threshold
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
