import React from 'react';

import { Button } from '../ui';

type SSOButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
};

export const SSOButton: React.FC<SSOButtonProps> = ({ onClick, icon, text }) => (
  <Button variant="secondary" fullWidth onClick={onClick}>
    {icon}
    {text}
  </Button>
);

export default SSOButton;
