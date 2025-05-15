// components/Shared/ErrorScreen.js
import React from 'react';
import Logo from './Logo';

interface ErrorScreenProps {
  title: string;
  message: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, message }) => (
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

export default ErrorScreen;
