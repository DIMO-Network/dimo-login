// components/Auth/EmailInput.tsx
import React, { useState } from "react";
import { useAuthContext } from '../../context/AuthContext';  // Use the auth context

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setAuthStep: (step: number) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setAuthStep }) => {
  const { sendOtp } = useAuthContext();  // Get sendOtp from the context
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {
    if (email) {
      onSubmit(email);

      await sendOtp(email);

      setAuthStep(1);

    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="p-2 border border-gray-300 rounded-md"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Authenticate
      </button>
    </div>
  );
};

export default EmailInput;
