// CI reports for every environment, in rg-ttb-ci-centralus, with the viewer on the nonprod plan (issue #137).
// Personal values come from the same environment variables as nonprod.bicepparam:
//   TTB_ADMIN_OBJECT_ID   (required) your Entra object ID, the only account the viewer lets in
//   TTB_ALLOWED_IPS       your public IP(s), comma-separated. Without it the viewer refuses you.
using 'reports.bicep'

param location = 'centralus'

param ownerPrincipalId = readEnvironmentVariable('TTB_ADMIN_OBJECT_ID')

param allowedIpRanges = filter(map(split(readEnvironmentVariable('TTB_ALLOWED_IPS', ''), ','), ip => trim(ip)), ip => !empty(ip))

// Prod's deploy identity joins at M5 (#92).
param deployEnvironments = [
  'dev'
  'test'
]
