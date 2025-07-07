import React from 'react';

import Logo from './Logo';
import { Loader, LoaderProps } from '../';

export type LoadingContentProps = LoaderProps;

export const LoadingContent: React.FC<LoadingContentProps> = ({ message }) => (
  <div className="w-full md:w-[440px]">
    <Logo />
    <Loader message={message} />
  </div>
);
