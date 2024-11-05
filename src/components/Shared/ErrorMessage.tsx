// components/Shared/ErrorMessage.tsx
import React from "react";

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <p className="text-red-500 font-medium">{message}</p>
);

export default ErrorMessage;
