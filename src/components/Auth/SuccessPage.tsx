// src/components/SuccessPage.tsx
import React from "react";
import { useAuthContext } from "../../context/AuthContext";

const SuccessPage: React.FC = () => {
  const { user } = useAuthContext(); // Get verifyOtp from the context
  return (
    <div className="text-green-500 text-lg">
      Authentication successful! You are logged in.
      <br></br>
      Wallet Address:{user?.walletAddress}
    </div>
  );
};

export default SuccessPage;
