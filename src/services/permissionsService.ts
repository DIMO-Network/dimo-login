export interface PermissionTemplate {
  specversion: string;
  id: string;
  source: string;
  type: string;
  datacontenttype: string;
  time: string;
  "com.dimo.grantor.signature": string;
  data: {
    templateId: string;
    version: string;
    grantor: string;
    grantee: string;
    scope: {
      permissions: string[]; // Array of permission strings
    };
    effectiveAt: string;
    expiresAt: string;
    attachments: Record<string, unknown>; // Empty object in the example, but this allows for flexibility
    metadata: {
      description: string;
      createdBy: string;
      createdAt: string;
      schemaVersion: string;
    };
    description: string;
  };
}

export async function fetchPermissionsFromId(
  permissionTemplateId: string,
  clientId: string,
  walletAddress: string,
  email: string,
  devLicenseAlias: string
) {
  const now = new Date(Date.now());
  const isoString = now.toISOString();

  // Format the date
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(now);

  const permissions =
    permissionTemplateId == "1"
      ? [
          "ALLTIME_NONLOCATION",
          "COMMANDS",
          "CURRENT_LOCATION",
          "ALLTIME_LOCATION",
          "VERIFIABLE_CREDENTIALS",
          "STREAMS",
        ]
      : [
          "ALLTIME_NONLOCATION",
          "CURRENT_LOCATION",
          "ALLTIME_LOCATION",
          "VERIFIABLE_CREDENTIALS",
          "STREAMS",
        ];

  const permissionsString1 = `\n- ALLTIME_NONLOCATION: Access to non-location-based data at any time.\n- COMMANDS: Ability to send commands to the vehicle.\n- CURRENT_LOCATION: Access to the vehicle’s current location.\n- ALLTIME_LOCATION: Access to location history.\n- VERIFIABLE_CREDENTIALS: Access to data that can be used as verifiable credentials.\n- STREAMS: Access to real-time data streams.`;
  const permissionsString2 = `\n- ALLTIME_NONLOCATION: Access to non-location-based data at any time.\n- CURRENT_LOCATION: Access to the vehicle’s current location.\n- ALLTIME_LOCATION: Access to location history.\n- VERIFIABLE_CREDENTIALS: Access to data that can be used as verifiable credentials.\n- STREAMS: Access to real-time data streams.`;

  // Combine formatted date with UTC
  const result = `${formattedDate.replace(/(\d{1,2}:\d{2})/, "$1 UTC")}`;
  return {
    specversion: "1.0",
    id: "$uuid",
    source: "ipfs://templateCID",
    type: "com.dimo.permission.grant.v1",
    datacontenttype: "application/json",
    time: isoString,
    "com.dimo.grantor.signature": "0x8Db0bE570F1Fdbb89b11F2629d284a952e2c6C39",
    data: {
      templateId: "$uuid",
      version: "1.0",
      grantor: walletAddress,
      grantee: clientId,
      scope: {
        permissions,
      },
      effectiveAt: isoString,
      expiresAt: "2062-12-12T18:51:27Z",
      attachments: {},
      metadata: {
        description: "Permission grant event for vehicle data access",
        createdBy: "dimo-platform",
        createdAt: isoString,
        schemaVersion: "1.0",
      },
      description: `This contract gives permission for specific data access and control functions on the DIMO platform. Here’s what you’re agreeing to:\n\nContract Summary:\n- Grantor: ${email} (the entity giving permission).\n- Grantee: ${devLicenseAlias}  (the entity receiving permission).\n\nPermissions Granted:${
        permissionTemplateId == "1" ? permissionsString1 : permissionsString2
      }\n\nEffective Date: ${result} \n\nExpiration Date: December 12, 2062, at 18:51 UTC.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`,
    },
  };
}
