// components/Shared/LoadingScreen.js
import React from 'react';
import Logo from './Logo';
import { Card, Loader } from '../';

export const LoadingScreen = () => (
  <div className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]">
    <Card
      width="w-full max-w-[600px]"
      height="min-h-[308px]"
      className="flex flex-col gap-6 items-center p-6"
    >
      <div className="w-full md:w-[440px]">
        <Logo />
        <Loader />
      </div>
    </Card>
  </div>
);

export default LoadingScreen;
