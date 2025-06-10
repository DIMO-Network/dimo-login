import React from 'react';

import Logo from './Logo';
import { ConnectedLoader } from '../';

export const LoadingContent = () => (
  <div className="w-full md:w-[440px]">
    <Logo />
    <ConnectedLoader />
  </div>
);
