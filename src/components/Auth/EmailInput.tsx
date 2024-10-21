// components/Auth/EmailInput.tsx
import React, { useState } from "react";

interface EmailInputProps {
  onSubmit: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (email) {
      onSubmit(email);
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
