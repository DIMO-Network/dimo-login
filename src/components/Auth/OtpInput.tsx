import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context

interface OtpInputProps {
  email: string;
  otpId: string;
}

const OtpInput: React.FC<OtpInputProps> = ({ email, otpId }) => {
  const { verifyOtp, authenticateUser, setJwt, setAuthStep } = useAuthContext(); // Get verifyOtp from the context
  const [otp, setOtp] = useState("");

  const handleSubmit = async () => {
    if (otp) {
      // Verify OTP using the auth context
      const result = await verifyOtp(email, otp, otpId);

      if ( result.success && result.credentialBundle ) {
        authenticateUser(email, result.credentialBundle, setJwt, setAuthStep);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        className="p-2 border border-gray-300 rounded-md"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Verify OTP
      </button>
    </div>
  );
};

export default OtpInput;
