import { useEffect, type FC } from 'react';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { useAuthContext } from '../../context/AuthContext';
import { generateIpfsSources, getKernelSigner } from '../../services/turnkeyService';
import { SimpleResult } from '../../models/resultTypes';
import {
  getPayloadToSign,
  mintVehicleWithSignature,
  waitForTokenId,
} from '../../services/dimoDevicesService';
import { IntegrationNft, MintVehicleNft } from '../../models/typedData';
import { SAMPLE_B64_IMAGE } from '../../utils/constants';
import { UIManagerLoaderWrapper } from '../Shared';
import { message, useT } from '../../i18n';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';

export const MintVehicle: FC = () => {
  const t = useT();
  const { componentData, setLoadingState, setUiState, setComponentData } = useUIManager();
  const { user, jwt, validateSession } = useAuthContext();

  useEffect(() => {
    // Abort the token-id polling (and skip post-poll state writes) if this step
    // unmounts mid-flight, so it stops hitting the API against a dead component.
    const controller = new AbortController();
    const processMint = async () => {
      try {
        setLoadingState(true, message('mint.creating'), true);

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
        const tokenId = await waitForTokenId(userDeviceID, jwt, controller.signal);

        if (tokenId && !controller.signal.aborted) {
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
        setLoadingState(false);
      }
    };

    // eslint-disable-next-line
    processMint();
    return () => controller.abort();
    // eslint-disable-next-line
  }, [componentData]);

  const handleSign = async (nft: IntegrationNft | MintVehicleNft) => {
    const isValidSession = await validateSession();
    if (!isValidSession) {
      throw new Error('User does not have a valid session');
    }
    const kernelSigner = getKernelSigner();
    const resp = await kernelSigner.signTypedData(nft);
    return resp;
  };

  const handleMint = async (
    signature: string,
    userDeviceID: string,
  ): Promise<SimpleResult> => {
    const isValidSession = await validateSession();
    if (!isValidSession) {
      throw new Error('User does not have a valid session');
    }
    const expiration = 2933125200; //Placeholder for sacd input
    const permissions = 0; //Placeholder for sacd input
    const owner = user.smartContractAddress;
    const ipfsRes = await generateIpfsSources([], owner, BigInt(expiration));

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

  // Shown only once creating stopped without a vehicle (the loader covers the
  // work itself).
  return (
    <UIManagerLoaderWrapper>
      <Screen
        actions={
          <ActionBar>
            <Button fullWidth onClick={() => setUiState(UiStates.VEHICLE_MANAGER)}>
              {t('mint.failed.cta')}
            </Button>
          </ActionBar>
        }
      >
        <DoneHeader
          tone="negative"
          icon={<ExclamationTriangleIcon className="size-[26px]" />}
          title={t('mint.failed.title')}
        >
          {t('mint.failed.body')}
        </DoneHeader>
      </Screen>
    </UIManagerLoaderWrapper>
  );
};
