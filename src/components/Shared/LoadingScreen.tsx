import React from 'react';

import { Card } from '../';
import { LoadingContent, LoadingContentProps } from './LoadingContent';

export const LoadingScreen: React.FC<LoadingContentProps> = ({ message }) => (
  <div className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]">
    <Card
      width="w-full max-w-[600px]"
      height="min-h-[308px]"
      className="flex flex-col gap-6 items-center p-6"
    >
      <LoadingContent message={message} />
    </Card>
  </div>
);

export default LoadingScreen;
