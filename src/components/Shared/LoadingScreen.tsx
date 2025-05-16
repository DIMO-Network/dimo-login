import React from 'react';

import { Card } from '../';
import { LoadingContent } from './LoadingContent';

export const LoadingScreen = () => (
  <div className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]">
    <Card
      width="w-full max-w-[600px]"
      height="min-h-[308px]"
      className="flex flex-col gap-6 items-center p-6"
    >
      <LoadingContent />
    </Card>
  </div>
);

export default LoadingScreen;
