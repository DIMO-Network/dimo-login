import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import ErrorMessage from "../Shared/ErrorMessage";
import PrimaryButton from "../Shared/PrimaryButton";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { useUIManager } from "../../context/UIManagerContext";

interface OtpInputProps {
  email: string;
  otpId: string;
}

const OtpInput: React.FC<OtpInputProps> = ({ email, otpId }) => {
  const { verifyOtp, authenticateUser, setJwt, error } = useAuthContext(); // Get verifyOtp from the context
  const { setUiState } = useUIManager();
  const [otpArray, setOtpArray] = useState(Array(6).fill("")); // Array of 6 empty strings

  // Function to handle change for each input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { value } = e.target;

    // Detect paste event for the full OTP
    if (value.length === 6) {
      const newOtpArray = value.split("").slice(0, 6); // Only take the first 6 characters
      setOtpArray(newOtpArray);

      // Move focus to the last input
      document?.getElementById(`otp-input-5`)?.focus();
      return;
    }

    if (value.length <= 1) {
      const newOtpArray = [...otpArray];
      newOtpArray[index] = value;
      setOtpArray(newOtpArray);

      // Move focus to the next input
      if (value && index < 5) {
        document?.getElementById(`otp-input-${index + 1}`)?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (otpArray) {
      // Verify OTP using the auth context
      const otp = otpArray.join("");
      const result = await verifyOtp(email, otp, otpId);

      if (result.success && result.data.credentialBundle) {
        authenticateUser(
          email,
          result.data.credentialBundle,
          setJwt,
          setUiState
        );
      }
    }
  };

  const handleKeyDown = (e: { key: string }) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header
        title="Please enter your OTP Code"
        subtitle={email || "moiz@gmail.com"}
      />

      {error && <ErrorMessage message={error} />}

      <div className="frame9 flex flex-col items-center gap-[15px] lg:gap-[20px]">
        <div
          onKeyDown={handleKeyDown}
          className="grid grid-cols-6 gap-3 mb-4 w-full max-w-[440px]"
        >
          {otpArray.map((digit, index) => (
            <input
              key={index}
              id={`otp-input-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              maxLength={6}
              className={`w-10 h-10 lg:w-12 lg:h-12 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? "border-[#E80303]" : "border-gray-300"
              }`}
            />
          ))}
        </div>
        <PrimaryButton onClick={handleSubmit} width="w-full lg:w-[440px]">
          Continue
        </PrimaryButton>
      </div>
    </Card>
  );
};

export default OtpInput;
