import React from 'react';

import Logo from './Logo';
import { Loader } from '../';

interface LoadingContentProps {
  message?: string;
}

export const LoadingContent: React.FC<LoadingContentProps> = ({ message }) => {
  return (
    <div className="w-full md:w-[440px]">
      <Logo />
      <Loader message={message} />
    </div>
  );
};

export default LoadingContent;
