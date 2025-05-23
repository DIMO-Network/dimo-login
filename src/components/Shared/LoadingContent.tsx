import React from 'react';

import Logo from './Logo';
import { Loader } from '../';

export const LoadingContent = () => (
  <div className="w-full md:w-[440px]">
    <Logo />
    <Loader />
  </div>
);

export default LoadingContent;
