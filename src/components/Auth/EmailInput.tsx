// components/Auth/EmailInput.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import { fetchUserDetails } from "../../services/accountsService";

interface EmailInputProps {
  onSubmit: (email: string) => void;
  setOtpId: (otpId: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ onSubmit, setOtpId }) => {
  const { sendOtp, setAuthStep, authenticateUser, setJwt, setUser, user } =
    useAuthContext(); // Get sendOtp from the context
  const [email, setEmail] = useState("");
  const [triggerAuth, setTriggerAuth] = useState(false);

  const handleSubmit = async () => {
    if (email) {
      onSubmit(email);

      //Check if email exists, and trigger authenticate user
      const userExistsResult = await fetchUserDetails(email);

      if (userExistsResult.success && userExistsResult.user) {
        setUser(userExistsResult.user);
        setTriggerAuth(true);
      } else {
        //Todo: This send OTP is called twice unnecessarily
        const result = await sendOtp(email);

        console.log(result);
        if (result.success && result.otpId) {
          setOtpId(result.otpId); // Store the otpId
          setAuthStep(1); // Move to OTP input step
        } else {
          console.error(result.error); // Handle failure, e.g., show error message
        }
      }
    }
  };

  useEffect(() => {
    // Only authenticate if `user` is set and authentication hasn't been triggered
    if (triggerAuth) {
      authenticateUser(email, "credentialBundle", setJwt, setAuthStep);
    }
  }, [triggerAuth]);

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
