import { MintVehicleResult } from "../models/resultTypes";
import { MintVehicleVariables } from "../models/vehicle";
import { getKernelSigner } from "./turnkeyService";

const DIMO_DRIVER_BASE_URL = "TBD"; //

export const mintVehicle = async ({
  owner,
  permissions,
  manufacturerNode,
  deviceDefinitionID,
  make,
  model,
  year,
  imageURI,
}: MintVehicleVariables): Promise<MintVehicleResult> => {
  try {
    const expiration = BigInt(2933125200);

    const kernelSigner = await getKernelSigner();
    const ipfsRes = await kernelSigner.signAndUploadSACDAgreement({
      driverID: owner,
      appID: owner,
      appName: "dimo-driver", //TODO: Should be a constant, if we're assuming the same appName (however feels like this should be provided by the developer)
      expiration: expiration,
      permissions: permissions,
      grantee: owner as `0x${string}`,
      attachments: [],
      grantor: kernelSigner.smartContractAddress!,
    });
    if (!ipfsRes.success) {
      throw new Error("Failed to upload SACD agreement");
    }

    const response = await fetch(`${DIMO_DRIVER_BASE_URL}/mint-vehicle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: owner,
        manufacturerNode: manufacturerNode,
        deviceDefinitionID: deviceDefinitionID,
        attributeInfo: [
          { attribute: "Make", info: make },
          { attribute: "Model", info: model },
          { attribute: "Year", info: year },
          { attribute: "ImageURI", info: imageURI },
        ],
        sacdInput: {
          grantee: owner,
          permissions: permissions.toString(),
          expiration: expiration,
          source: `ipfs://${ipfsRes.cid}`,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to generate challenge",
      };
    }

    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error("Error generating challenge:", error);
    return {
      success: false,
      error: "An error occurred while generating challenge",
    };
  }
};
