import { type FC } from 'react';
import { PlusIcon } from '../Icons';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { useOracles } from '../../context/OraclesContext';

export const ConnectCarButton: FC = () => {
  const { setUiState } = useUIManager();
  const { onboardingEnabled } = useOracles();

  if (!onboardingEnabled) return null; // 👈 this hides the button completely

  return (
    <button
      className="flex pl-[52px] py-3 sm:py-4 px-4 border border-gray-300 rounded-xl w-full hover:bg-gray-50 transition"
      onClick={() => setUiState(UiStates.ADD_VEHICLE, { setBack: true })}
    >
      <div className="flex items-center space-x-4">
        <div className="h-[48px] w-[48px] rounded-full border border-gray-400 flex items-center justify-center text-black font-bold">
          <PlusIcon />
        </div>
        <span className="text-black font-medium text-sm sm:text-base">
          Add a compatible car
        </span>
      </div>
    </button>
  );
};

export default ConnectCarButton;
