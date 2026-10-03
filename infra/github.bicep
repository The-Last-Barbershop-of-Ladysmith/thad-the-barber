// Values shared by main.bicep and reports.bicep.

@export()
@description('Start of the GitHub OIDC subject claim. The repo uses immutable subjects (owner and repo IDs), so a renamed or re-created repo can\'t inherit the trust.')
var subjectPrefix = 'repo:The-Last-Barbershop-of-Ladysmith@118852654/thad-the-barber@1391006695'
