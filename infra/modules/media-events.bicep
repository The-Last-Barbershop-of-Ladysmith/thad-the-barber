// Tells the environment's API when a gallery photo or announcements.json changes, so it refetches (#204).

param envName string
param topicName string

@description('Origin of the environment\'s API, e.g. https://as-ttb-api-dev-centralus.azurewebsites.net.')
param apiUrl string

@secure()
@description('Same value as Key Vault secret MediaWebhook--Key. Event Grid sends it in the x-media-webhook-key header.')
param webhookKey string

resource topic 'Microsoft.EventGrid/systemTopics@2025-02-15' existing = {
  name: topicName
}

resource mediaChanges 'Microsoft.EventGrid/systemTopics/eventSubscriptions@2025-02-15' = {
  parent: topic
  name: 'evgs-ttb-media-${envName}'
  properties: {
    eventDeliverySchema: 'EventGridSchema'
    filter: {
      includedEventTypes: [
        'Microsoft.Storage.BlobCreated'
        'Microsoft.Storage.BlobDeleted'
      ]
      // One subjectBeginsWith can't cover two containers, so both prefixes go in one advanced filter.
      advancedFilters: [
        {
          operatorType: 'StringBeginsWith'
          key: 'subject'
          values: [
            '/blobServices/default/containers/media-${envName}/blobs/gallery/'
            '/blobServices/default/containers/content-${envName}/blobs/announcements.json'
          ]
        }
      ]
    }
    destination: {
      endpointType: 'WebHook'
      properties: {
        // The linter treats every endpointUrl as secret (SAS URLs); this one is a plain public address.
        #disable-next-line use-secure-value-for-secure-inputs
        endpointUrl: '${apiUrl}/api/webhooks/media'
        deliveryAttributeMappings: [
          {
            name: 'x-media-webhook-key'
            type: 'Static'
            properties: {
              value: webhookKey
              isSecret: true
            }
          }
        ]
      }
    }
  }
}
