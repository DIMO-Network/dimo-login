import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { useUIManager } from '../../context/UIManagerContext';

export const Back = () => {
  const { goBack, prevUiStates } = useUIManager();

  return (
    <>
      {prevUiStates.length > 1 && (
        <div
          className="absolute rounded-full border border-gray-500 h-10 w-10 flex items-center justify-center top left cursor-pointer"
          onClick={goBack}
        >
          <ChevronLeftIcon className="h-5 w-5 pr-1 stroke-black" />
        </div>
      )}
    </>
  );
};
