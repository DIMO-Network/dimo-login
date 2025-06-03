import React from 'react';

import { Logo, Card } from './';

interface ErrorProps {
  title: string;
  message: string;
}

export const ErrorScreen: React.FC<ErrorProps> = ({ title, message }) => (
  <div className="flex h-screen pt-2 items-center justify-center bg-white md:bg-[#F7F7F7]">
    <Card
      width="w-full max-w-[600px]"
      height="min-h-[308px]"
      className="flex flex-col gap-6 items-center p-6"
    >
      <ErrorContent title={title} message={message} />
    </Card>
  </div>
);

export const ErrorContent = ({ title, message }: ErrorProps) => (
  <>
    <div className="flex justify-center mb-4">
      <Logo />
    </div>
    <h1 className="text-xl font-bold mb-4 text-center" style={{ color: '#E80303' }}>
      {title}
    </h1>
    <p className="text-center">{message}</p>
  </>
);
