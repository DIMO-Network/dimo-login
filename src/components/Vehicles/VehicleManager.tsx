import React, { useEffect, useState } from "react";

import { useAuthContext } from "../../context/AuthContext";
import { useDevCredentials } from "../../context/DevCredentialsContext";
import { fetchPermissionsFromId } from "../../services/permissionsService";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import ErrorMessage from "../Shared/ErrorMessage";
import { sendMessageToReferrer } from "../../utils/messageHandler";
import { isStandalone } from "../../utils/isStandalone";
import { useUIManager } from "../../context/UIManagerContext";
import { SACDTemplate } from "@dimo-network/transactions/dist/core/types/dimo";
import {
  getDefaultExpirationDate,
  parseExpirationDate,
} from "../../utils/dateUtils";
import { FetchPermissionsParams } from "../../models/permissions";
import SelectVehicles from "./SelectVehicles";
import { getAppUrl, getParamFromUrlOrState } from "../../utils/urlHelpers";
import { useOracles } from "../../context/OraclesContext";
import {Description} from "./Description";

const VehicleManager: React.FC = () => {
  const { user } = useAuthContext();
  const { clientId, devLicenseAlias } = useDevCredentials();
  const { setOnboardingEnabled } = useOracles();
  const { setComponentData, error, setError } = useUIManager();

  //Data from SDK
  const [permissionTemplateId, setPermissionTemplateId] = useState<
    string | undefined
  >();
  const [vehicleTokenIds, setVehicleTokenIds] = useState<
    string[] | undefined
  >();
  const [vehicleMakes, setVehicleMakes] = useState<string[] | undefined>();

  const [permissionTemplate, setPermissionTemplate] =
    useState<SACDTemplate | null>(null);

  const [expirationDate, setExpirationDate] = useState<BigInt>(
    getDefaultExpirationDate()
  );

  const handleStandaloneMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get("state");
    const decodedState = state ? JSON.parse(decodeURIComponent(state)) : {};

    const permissionTemplateId = getParamFromUrlOrState(
      "permissionTemplateId",
      urlParams,
      decodedState
    );
    const expirationDate = getParamFromUrlOrState(
      "expirationDate",
      urlParams,
      decodedState
    );
    const vehicles = getParamFromUrlOrState(
      "vehicles",
      urlParams,
      decodedState
    );
    const vehicleMakes = getParamFromUrlOrState(
      "vehicleMakes",
      urlParams,
      decodedState
    );

    const onboarding = getParamFromUrlOrState(
      "onboarding",
      urlParams,
      decodedState
    );

    if (permissionTemplateId) {
      setPermissionTemplateId(permissionTemplateId as string);
    }

    if (vehicles) {
      setVehicleTokenIds(Array.isArray(vehicles) ? vehicles : [vehicles]);
    }

    if (vehicleMakes) {
      setVehicleMakes(
        Array.isArray(vehicleMakes) ? vehicleMakes : [vehicleMakes]
      );
    }

    if (expirationDate) {
      setExpirationDate(parseExpirationDate(expirationDate as string));
    }

    if (onboarding && onboarding.length > 0) {
      setOnboardingEnabled(true);
    }
  };

  const handleEmbedPopupMode = () => {
    sendMessageToReferrer({ eventType: "SHARE_VEHICLES_DATA" });

    const handleMessage = (event: MessageEvent) => {
      const {
        eventType,
        permissionTemplateId: permissionTemplateIdFromMessage,
        vehicles: vehiclesFromMessage,
        vehicleMakes: vehicleMakesFromMessage,
        expirationDate: expirationDateFromMessage,
        onboarding,
      } = event.data;

      console.log(event.data);

      if (eventType === "SHARE_VEHICLES_DATA") {
        if (permissionTemplateIdFromMessage)
          setPermissionTemplateId(permissionTemplateIdFromMessage);
        if (vehiclesFromMessage) setVehicleTokenIds(vehiclesFromMessage);
        if (vehicleMakesFromMessage) setVehicleMakes(vehicleMakesFromMessage);
        if (expirationDateFromMessage)
          setExpirationDate(parseExpirationDate(expirationDateFromMessage));
        if (onboarding && onboarding.length > 0)
          setOnboardingEnabled(true);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  };

  const fetchPermissions = async () => {
    if (permissionTemplateId) {
      try {
        const permissionsParams: FetchPermissionsParams = {
          permissionTemplateId,
          clientId,
          devLicenseAlias,
          expirationDate,
          walletAddress: user.smartContractAddress,
          email: user.email,
        };
        const permissionTemplate = await fetchPermissionsFromId(
          permissionsParams
        );
        setComponentData({ permissionTemplateId }); //So that manage vehicle has a permission template ID
        setPermissionTemplate(permissionTemplate as SACDTemplate);
      } catch (error) {
        setError("Could not fetch permissions");
        console.error("Error fetching permissions:", error);
      }
    }
  };

  useEffect(() => {
    if (isStandalone()) {
      handleStandaloneMode();
    } else {
      handleEmbedPopupMode();
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPermissions()]);
  }, [
    user.smartContractAddress,
    clientId,
    permissionTemplateId,
    devLicenseAlias,
  ]);

  const appUrl = getAppUrl();

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit max-h-[770px]"
      className="flex flex-col"
    >
      <Header
        title={`${devLicenseAlias} wants to use DIMO to connect to your vehicles data`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto w-full">
        {error && <ErrorMessage message={error} />}

        <Description description={permissionTemplate?.data.description} />

        {permissionTemplateId && (
          <SelectVehicles
            vehicleTokenIds={vehicleTokenIds}
            vehicleMakes={vehicleMakes}
            permissionTemplateId={permissionTemplateId}
            expirationDate={expirationDate}
          />
        )}
      </div>
    </Card>
  );
};

export default VehicleManager;
