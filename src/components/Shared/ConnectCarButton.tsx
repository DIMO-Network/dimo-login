import { useState, type FC } from "react";
import { PlusIcon } from "../Icons/PlusIcon";
import { UiStates, useUIManager } from "../../context/UIManagerContext";
import { useOracles } from "../../context/OraclesContext";

export const ConnectCarButton: FC = () => {
  const { setUiState } = useUIManager();
  const { onboardingEnabled } = useOracles();

  if (!onboardingEnabled) return null; // 👈 this hides the button completely

  return (
    <button
      className="flex items-center justify-center py-3 sm:py-4 px-4 border border-gray-300 rounded-xl w-full hover:bg-gray-50 transition"
      onClick={() => setUiState(UiStates.ADD_VEHICLE, { setBack: true })}
    >
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 border border-gray-400 rounded-full flex items-center justify-center text-black font-bold">
          <PlusIcon />
        </div>
        <span className="text-black font-medium text-sm sm:text-base">
          Connect compatible car
        </span>
      </div>
    </button>
  );
};
