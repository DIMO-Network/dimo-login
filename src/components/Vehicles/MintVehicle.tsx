import { useEffect, type FC } from 'react';

import VehicleThumbnail from '../../assets/images/vehicle-thumbnail.png';
import { UiStates, useUIManager } from '../../context/UIManagerContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  generateIpfsSources,
  getKernelSigner,
  initializeIfNeeded,
} from '../../services/turnkeyService';
import { SimpleResult } from '../../models/resultTypes';
import {
  getPayloadToSign,
  mintVehicleWithSignature,
  waitForTokenId,
} from '../../services/dimoDevicesService';
import { IntegrationNft, MintVehicleNft } from '../../models/typedData';
import { SAMPLE_B64_IMAGE } from '../../utils/constants';

export const MintVehicle: FC = () => {
  const { componentData, setLoadingState, setUiState, setComponentData } = useUIManager();
  const { user, jwt } = useAuthContext();

  useEffect(() => {
    const processMint = async () => {
      try {
        setLoadingState(true, 'Minting vehicle', true);

        const { integrationID, userDeviceID } = componentData;

        if (!componentData || !integrationID || !userDeviceID) {
          return console.error('Error creating vehicle:');
        }

        const payloadToSign = await getPayloadToSign(
          {
            userDeviceID,
            integrationID,
          },
          jwt,
        );

        if (!payloadToSign.success || !payloadToSign.data)
          return console.error('Error creating vehicle:');

        //Sign payload using txn SDK
        const signature = await handleSign(payloadToSign.data);

        //Use signed payload + id's to send signed payload for minting
        if (!signature) {
          return console.error('Could not sign payload');
        }

        const mintedVehicle = await handleMint(signature, userDeviceID);

        if (!mintedVehicle.success) {
          return console.error('Could not mint vehicle');
        }

        //Poll for Token ID
        const tokenId = await waitForTokenId(userDeviceID, jwt);

        if (tokenId) {
          setComponentData({
            ...componentData,
            preSelectedVehicles: [tokenId.toString()],
          });
          setLoadingState(false);
          setUiState(UiStates.VEHICLE_MANAGER);
        }
      } catch (error) {
        console.error('Mint processing error:', error);
      } finally {
        // setLoadingState(false);
        // setIsProcessing(false);
      }
    };

    processMint();
  }, [componentData]);

  const handleSign = async (nft: IntegrationNft | MintVehicleNft) => {
    await initializeIfNeeded(user.subOrganizationId);
    const kernelSigner = getKernelSigner();
    const resp = await kernelSigner.signTypedData(nft);
    return resp;
  };

  const handleMint = async (
    signature: string,
    userDeviceID: string,
  ): Promise<SimpleResult> => {
    await initializeIfNeeded(user.subOrganizationId);
    const expiration = 2933125200; //Placeholder for sacd input
    const permissions = 0; //Placeholder for sacd input
    const owner = user.smartContractAddress;
    const ipfsRes = await generateIpfsSources(BigInt(0), owner, BigInt(expiration));

    return await mintVehicleWithSignature(
      {
        imageData: SAMPLE_B64_IMAGE,
        imageDataTransparent: SAMPLE_B64_IMAGE,
        sacdInput: {
          expiration,
          permissions,
          source: ipfsRes,
          grantee: '0xAb5801a7D398351b8bE11C439e05C5b3259aec9B', //Placeholder grantee, we don't actually grant permissions upon mint
        },
        signature,
      },
      userDeviceID,
      jwt,
    );
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        style={{ height: '40px', width: '40px' }}
        className="rounded-full object-cover mr-4"
        src={VehicleThumbnail}
        alt="Vehicle Thumbnail"
      />
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-gray-500 text-xl font-medium">No cars connected yet</h2>
        <p className="text-sm">Connect your car in the DIMO app to share permissions.</p>
      </div>
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-medium">Download the DIMO app now</p>
        <div className="flex flex-row gap-6"></div>
      </div>
    </div>
  );
};
