import React from 'react';

import { Button } from '../ui';

type SSOButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
  disabled?: boolean;
  disabledReasonId?: string;
};

export const SSOButton: React.FC<SSOButtonProps> = ({
  onClick,
  icon,
  text,
  disabled,
  disabledReasonId,
}) => (
  <Button
    variant="secondary"
    fullWidth
    onClick={onClick}
    disabled={disabled}
    disabledReasonId={disabledReasonId}
  >
    {icon}
    {text}
  </Button>
);

export default SSOButton;
