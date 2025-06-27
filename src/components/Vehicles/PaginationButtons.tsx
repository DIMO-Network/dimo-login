import React from 'react';
import PrimaryButton from '../Shared/PrimaryButton';

const PaginationButtons = ({
  hasNext,
  hasPrevious,
  onPrevious,
  onNext,
}: {
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) => {
  if (!(hasNext || hasPrevious)) {
    return null;
  }
  return (
    <div className="flex justify-center space-x-4 mt-4">
      {hasPrevious && (
        <PrimaryButton onClick={onPrevious} width="w-[214px]">
          Back
        </PrimaryButton>
      )}
      {hasNext && (
        <PrimaryButton onClick={onNext} width="w-[214px]">
          Next
        </PrimaryButton>
      )}
    </div>
  );
};

export default PaginationButtons; 