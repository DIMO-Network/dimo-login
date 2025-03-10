import { useEffect, type FC } from "react";

import { GooglePlayButton, AppStoreButton } from "react-mobile-app-button";

import VehicleThumbnail from "../../assets/images/vehicle-thumbnail.png";
import { mintVehicle } from "../../services/dimoDriverService";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { useAuthContext } from "../../context/AuthContext";
import { initializeIfNeeded } from "../../services/turnkeyService";
import { exchangeAuthCode } from "../../services/smartcarService";
import { MintVehicleResult } from "../../models/resultTypes";

export const MintVehicle: FC = () => {
  const {
    componentData,
    setError,
    setLoadingState,
    setUiState,
    setComponentData,
  } = useUIManager();
  const { clientId, redirectUri } = useDevCredentials(); // Get loading state and credentials from DevCredentialsContext
  const { user } = useAuthContext();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");
    const encodedState = urlParams.get("state");

    if (!authCode || !encodedState) {
      setError("OAuth failed: Missing authorization code or state.");
      return;
    }

    const state = JSON.parse(encodedState);

    const processOauth = async () => {
      try {
        setLoadingState(true, "Creating vehicle");
        // 1️⃣ Exchange the authorization code for an access token

        console.log(state);
        //Mint
        const mintedVehicle = await handleMint(
          state.make.split(" ")[0],
          state.make.split(" ")[1],
          "2024"
        );

        if (mintedVehicle.success) {
          console.log(mintedVehicle.data.tokenId);
          setComponentData({
            preSelectedVehicles: [mintedVehicle.data.tokenId],
          });

          setTimeout(() => {
            setLoadingState(false);
            setUiState(UiStates.VEHICLE_MANAGER);
          }, 10000);
        }
        //Create Synthetic
        //Register Integration
        //Pair
        if (true || state.provider == "smartcar") {
          //TODO: Remove true
          //Pairing
          //Exchange Code
          // const tokenResponse = await exchangeAuthCode(
          //   authCode,
          //   redirectUri,
          // );
          // if (!tokenResponse.success) {
          //   throw new Error(tokenResponse.error);
          // }
          // const accessToken = tokenResponse.data?.access_token;
          // console.log(accessToken);
        }
      } catch (error) {
        console.error("OAuth processing error:", error);
        setError("Something went wrong while processing your vehicle.");
      } finally {
        // setIsProcessing(false);
      }
    };

    processOauth();
  }, []);

  const handleMint = async (
    make: string,
    model: string,
    year: string
  ): Promise<MintVehicleResult> => {
    await initializeIfNeeded(user.subOrganizationId);
    console.log(componentData);
    const res = await mintVehicle({
      owner: clientId as `0x${string}`,
      permissions: BigInt(0),
      manufacturerNode: 131,
      deviceDefinitionID: "toyota_4runner_2024",
      make,
      model,
      year,
      imageURI: VehicleThumbnail,
    });
    return res;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        style={{ height: "40px", width: "40px" }}
        className="rounded-full object-cover mr-4"
        src={VehicleThumbnail}
        alt="Vehicle Thumbnail"
      />
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-gray-500 text-xl font-medium">
          No cars connected yet
        </h2>
        <p className="text-sm">
          Connect your car in the DIMO app to share permissions.
        </p>
      </div>
      <div className="flex flex-col items-center gap-6">
        <p className="text-xl font-medium">Download the DIMO app now</p>
        <div className="flex flex-row gap-6"></div>
      </div>
    </div>
  );
};
