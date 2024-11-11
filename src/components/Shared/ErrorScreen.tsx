// components/Shared/ErrorScreen.js
import React from "react";
import Logo from "./Logo";

interface ErrorScreenProps {
    title: string;
    message: string;
  }

const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, message }) => (
    <div className="flex h-screen items-center justify-center bg-gray-100">
    <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-[600px] w-full">
      <div className="flex justify-center mb-4">
        <Logo />
      </div>
      <h1 className="text-xl font-bold mb-4" style={{ color: "#E80303" }}>
        {title}
      </h1>
      <p>{message}</p>
    </div>
  </div>
);

export default ErrorScreen;
