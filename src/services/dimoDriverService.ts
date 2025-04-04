import { MintVehicleResult } from "../models/resultTypes";
import { MintVehicleVariables } from "../models/vehicle";
import {
  generateIpfsSources,
  getKernelSigner,
} from "./turnkeyService";
import { MintVehicleWithDeviceDefinition } from "@dimo-network/transactions";
import { hexToDecimal } from "../utils/hexUtils";

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

    const ipfsRes = await generateIpfsSources(permissions, owner, expiration);
    console.log(make, model);
    const args: MintVehicleWithDeviceDefinition = {
      owner: "0x60A7D007007c459dFE16665Caec415C810ffff6b",
      manufacturerNode: BigInt(manufacturerNode),
      deviceDefinitionID: deviceDefinitionID,
      attributeInfo: [
        { attribute: "Make", info: make },
        { attribute: "Model", info: model },
        { attribute: "Year", info: year },
        { attribute: "ImageURI", info: imageURI },
      ],
      sacdInput: {
        grantee: "0x8E58b98d569B0679713273c5105499C249e9bC84",
        permissions,
        expiration,
        source: ipfsRes,
      },
    };

    console.log(args);

    const kernelSigner = await getKernelSigner();
    const res = await kernelSigner.mintVehicleWithDeviceDefinition(args);

    console.log(res);
    const userOperationHash = res.userOpHash;
    const logs = res.logs;
    const vehicleAttributeSet = logs[3];
    const vehicleHexData = vehicleAttributeSet.data;
    const vehicleIdHex = vehicleHexData.substring(2, 66);
    const vehicleIdDecimal = hexToDecimal(vehicleIdHex);

    return {
      success: true,
      data: { userOperationHash, tokenId: vehicleIdDecimal },
    };
  } catch (error) {
    console.error("Error generating challenge:", error);
    return {
      success: false,
      error: "An error occurred while generating challenge",
    };
  }
};
