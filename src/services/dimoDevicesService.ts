/**
 * dimoDevicesService.ts
 *
 * This service handles all actions using the Devices API
 *
 * Specific Responsibilities include: Creating Vehicle on Backend, Registering Integration, Minting
 */

import {
  GetIntegrationInfoRequest,
  GetMintPayloadRequest,
  GetUserDeviceResponse,
  MintNftRequest,
  RegisterIntegrationRequest,
  SubmitAuthCodeRequest,
  VehicleCreateRequest,
} from '../models/deviceDefinitions';
import {
  IntegrationInfoResult,
  SimpleResult,
  SubmitAuthCodeResult,
} from '../models/resultTypes';
import { MintVehicleNft, TypedDataResponse } from '../models/typedData';
import { payloadToMintResponse, vehicleCreationResponse } from '../utils/mockedResponses';
import { pollForCondition } from '../utils/pollingUtils';

const DEVICES_ENDPOINT =
  process.env.REACT_APP_DEVICES_API_URL ||
  'http://0.0.0.0:8080/https://devices-api.dev.dimo.zone/v1';

export const createVehicleFromDeviceDefinitionId = async (
  { countryCode, deviceDefinitionId }: VehicleCreateRequest,
  jwt: string,
): Promise<GetUserDeviceResponse> => {
  try {
    // Prepare the request body
    const requestBody = JSON.stringify({
      countryCode: countryCode,
      deviceDefinitionId,
    });

    const response = await fetch(`${DEVICES_ENDPOINT}/user/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'origin': 'localhost',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to decode VIN',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error decoding VIN:', error);
    return {
      success: false,
      error: 'An error occurred while decoding VIN',
    };
  }
};

export const getPayloadToSign = async (
  { userDeviceID }: GetMintPayloadRequest,
  jwt: string,
): Promise<TypedDataResponse> => {
  try {
    // Prepare the request body

    const response = await fetch(
      `${DEVICES_ENDPOINT}/user/devices/${userDeviceID}/commands/mint`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to decode VIN',
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error getting payload:', error);
    return {
      success: false,
      error: 'An error occurred while getting payload',
    };
  }
};

export const mintVehicleWithSignature = async (
  { imageData, imageDataTransparent, sacdInput, signature }: MintNftRequest,
  userDeviceID: string,
  jwt: string,
): Promise<SimpleResult> => {
  try {
    // Prepare the request body
    const requestBody = JSON.stringify({
      imageData,
      imageDataTransparent,
      sacdInput,
      signature,
    });

    const response = await fetch(
      `${DEVICES_ENDPOINT}/user/devices/${userDeviceID}/commands/mint`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: requestBody,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to decode VIN',
      };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error minting vehicle:', error);
    return {
      success: false,
      error: 'An error occurred while minting vehicle',
    };
  }
};

export const submitAuthCode = async (
  { authorizationCode, redirectUri }: SubmitAuthCodeRequest,
  jwt: string,
): Promise<SubmitAuthCodeResult> => {
  try {
    // Prepare the request body
    const requestBody = JSON.stringify({
      authorizationCode,
      redirectUri,
    });

    const response = await fetch(`${DEVICES_ENDPOINT}/integration/2/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'origin': 'localhost',
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to submit auth code',
      };
    }

    const data = await response.json();

    return { success: true, data };
  } catch (error) {
    console.error('Error submitting auth code:', error);
    return {
      success: false,
      error: 'An error occurred while submitting auth code',
    };
  }
};

export const registerIntegration = async (
  { userDeviceId, integrationId, externalId }: RegisterIntegrationRequest,
  jwt: string,
): Promise<SimpleResult> => {
  try {
    // Prepare the request body
    const requestBody = JSON.stringify({
      externalId,
    });

    const response = await fetch(
      `${DEVICES_ENDPOINT}/user/devices/${userDeviceId}/integrations/${integrationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'origin': 'localhost',
        },
        body: requestBody,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to register integration',
      };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error register integration:', error);
    return {
      success: false,
      error: 'An error occurred while register integration',
    };
  }
};

export const checkIntegrationInfo = async (
  { userDeviceId, integrationId }: GetIntegrationInfoRequest,
  jwt: string,
): Promise<IntegrationInfoResult> => {
  try {
    // Prepare the request body

    const response = await fetch(
      `${DEVICES_ENDPOINT}/user/devices/${userDeviceId}/integrations/${integrationId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
          'origin': 'localhost',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to get integration info',
      };
    }

    const data = await response.json();

    return { success: true, data };
  } catch (error) {
    console.error('Error to get integration info:', error);
    return {
      success: false,
      error: 'An error occurred while getting integration info',
    };
  }
};

export const waitForTokenId = async (
  deviceId: string,
  jwt: string,
): Promise<number | null> => {
  let foundTokenId: number | null = null;

  const fetchTokenId = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${DEVICES_ENDPOINT}/user/devices/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch devices:', await response.text());
        return false;
      }

      const data: { userDevices: { id: string; nft?: { tokenId?: number } }[] } =
        await response.json();
      const matchingDevice = data.userDevices.find((device) => device.id === deviceId);

      if (matchingDevice?.nft?.tokenId) {
        foundTokenId = matchingDevice.nft.tokenId; // Store the tokenId
        return true; // Signal the polling function to stop
      }

      return false; // Continue polling
    } catch (error) {
      console.error('Error fetching devices:', error);
      return false;
    }
  };

  const success = await pollForCondition(fetchTokenId);
  return success ? foundTokenId : null; // Return the stored tokenId or null if not found
};
