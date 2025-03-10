import { type FC } from "react";

import PrimaryButton from "../Shared/PrimaryButton";
import { useUIManager } from "../../context/UIManagerContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { getAppUrl } from "../../utils/urlHelpers";
import { useDevCredentials } from "../../context/DevCredentialsContext";

export const ConnectTesla: FC = () => {
  const { componentData, goBack } = useUIManager(); // Access the manage function from the context
  const { devLicenseAlias } = useDevCredentials();
  const appUrl = getAppUrl();

  const handleConnect = () => {
    //
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit max-h-[770px]"
      className="flex flex-col gap-6 items-center text-center px-6"
    >
      {/* Header */}
      <Header
        title={`Authorize your Tesla account`}
        subtitle={appUrl.hostname}
      />

      {/* Permissions */}
      <div className="max-w-[480px] text-gray-600 text-sm text-center">
        {devLicenseAlias} requires access to your car’s data to offer you
        charging incentives.
      </div>

      <div className="flex flex-col gap-[10px] w-[80%]">
        {[
          { name: "Vehicle information", type: "required" },
          { name: "Vehicle location", type: "required" },
          { name: "Profile", type: "recommended" },
          { name: "Vehicle commands", type: "recommended" },
          { name: "Vehicle charging management", type: "recommended" },
        ].map((permission) => (
          <div
            key={permission.name}
            className="flex justify-between items-center p-4 border border-gray-300 rounded-lg w-full"
          >
            <span className="text-black font-medium">{permission.name}</span>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                permission.type === "required"
                  ? "bg-[#E80303] text-white"
                  : "bg-[#E4E4E7] text-[#3F3F46]"
              }`}
            >
              {permission.type === "required" ? "Required" : "Recommended"}
            </span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex flex-col w-full max-w-[480px] px-4 space-y-3">
        <PrimaryButton onClick={handleConnect} width="w-full py-3">
          Continue
        </PrimaryButton>
      </div>
    </Card>
  );
};
