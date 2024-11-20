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
  

export async function fetchPermissionsFromId(permissionTemplateId: string, clientId: string, walletAddress: string) {
    return {
        "specversion": "1.0",
        "id": "$uuid",
        "source": "ipfs://templateCID",
        "type": "com.dimo.permission.grant.v1",
        "datacontenttype": "application/json",
        "time": "2024-05-17T18:51:27Z",
        "com.dimo.grantor.signature": "0x8Db0bE570F1Fdbb89b11F2629d284a952e2c6C39",
        "data": {
          "templateId": "$uuid",
          "version": "1.0",
          "grantor": walletAddress,
          "grantee": clientId,
          "scope": {
            "permissions": [
              "ALLTIME_NONLOCATION",
              "COMMANDS",
              "CURRENT_LOCATION",
              "ALLTIME_LOCATION",
              "VERIFIABLE_CREDENTIALS",
              "STREAMS"
            ]
          },
          "effectiveAt": "2024-05-17T18:51:27Z",
          "expiresAt": "2024-05-19T18:51:27Z",
          "attachments": {},
          "metadata": {
            "description": "Permission grant event for vehicle data access",
            "createdBy": "dimo-platform",
            "createdAt": "2024-05-17T18:51:27Z",
            "schemaVersion": "1.0"
          },
          "description": `This contract gives permission for specific data access and control functions on the DIMO platform. Here’s what you’re agreeing to:\n\nContract Summary:\n\n- Grantor: Wallet address ${walletAddress} (the entity giving permission).\n- Grantee: ${clientId}  (the entity receiving permission).\n\nPermissions Granted:\n- ALLTIME_NONLOCATION: Access to non-location-based data at any time.\n- COMMANDS: Ability to send commands to the vehicle.\n- CURRENT_LOCATION: Access to the vehicle’s current location.\n- ALLTIME_LOCATION: Access to location history.\n- VERIFIABLE_CREDENTIALS: Access to data that can be used as verifiable credentials.\n- STREAMS: Access to real-time data streams.\n\nEffective Date: May 17, 2024, at 18:51 UTC.\nExpiration Date: May 19, 2024, at 18:51 UTC.\n\nDetails:\n- This grant provides the grantee with access to specific vehicle data and control functions as specified above.\n- Created by DIMO Platform, version 1.0 of this contract template.\n\nBy signing, both parties agree to these terms and the specified access scope.`
        }
    }
}