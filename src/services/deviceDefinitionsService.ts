/**
 * deviceDefinitionService.ts
 *
 * This service handles all actions using the Device Definitions API
 *
 * Specific Responsibilities include: Decoding VINS, and Getting Device Definition ID's
 */

import {
  DecodeVinRequest,
  DeviceDefinitionResponse,
  DeviceDefinitionSearchRequest,
  DeviceDefinitionSearchResponse,
} from "../models/deviceDefinitions";

const DEVICE_DEFINITIONS_ENDPOINT =
  process.env.REACT_APP_DEVICE_DEFINITIONS_URL ||
  "https://device-definitions-api.dev.dimo.zone";

export const getDeviceDefinitionIdFromVin = async (
  { countryCode, vin }: DecodeVinRequest,
  jwt: string
): Promise<DeviceDefinitionResponse> => {
  try {
    // Prepare the request body
    const requestBody = JSON.stringify({
      countryCode: countryCode,
      vin: vin,
    });

    const response = await fetch(
      `${DEVICE_DEFINITIONS_ENDPOINT}/device-definitions/decode-vin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to decode VIN",
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error decoding VIN:", error);
    return {
      success: false,
      error: "An error occurred while decoding VIN",
    };
  }
};

export const searchDeviceDefinition = async ({
  query,
  makeSlug,
  modelSlug,
  year,
  page = 1,
  pageSize = 10,
}: DeviceDefinitionSearchRequest): Promise<DeviceDefinitionSearchResponse> => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      query,
      ...(makeSlug && { makeSlug }),
      ...(modelSlug && { modelSlug }),
      ...(year && { year: year.toString() }),
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(
      `${DEVICE_DEFINITIONS_ENDPOINT}/device-definitions/search?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Failed to search for device definitions",
      };
    }

    const data = await response.json();

    // Ensure we return only the first device definition from the array
    if (!data.deviceDefinitions || data.deviceDefinitions.length === 0) {
      return {
        success: false,
        error: "No device definitions found",
      };
    }

    return { success: true, data: data.deviceDefinitions[0] };
  } catch (error) {
    console.error("Error searching device definitions:", error);
    return {
      success: false,
      error: "An error occurred while searching for device definitions",
    };
  }
};

export function formatVehicleString(input: string) {
  return input
    .replace(/_/g, " ") // Replace underscores with spaces
    .split(" ") // Split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" "); // Join back into a string
}
