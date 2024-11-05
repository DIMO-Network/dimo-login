import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import ErrorMessage from "../Shared/ErrorMessage";
import PrimaryButton from "../Shared/PrimaryButton";

interface OtpInputProps {
  email: string;
  otpId: string;
}

const OtpInput: React.FC<OtpInputProps> = ({ email, otpId }) => {
  const { verifyOtp, authenticateUser, setJwt, setAuthStep, error } =
    useAuthContext(); // Get verifyOtp from the context
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
          setAuthStep
        );
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div>
        <p className="text-xl font-medium">Please enter your OTP Code</p>
        <p className="text-sm text-zinc-500 font-medium mb-4">{email}</p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* OTP Input Fields */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        {otpArray.map((digit, index) => (
          <input
            key={index}
            id={`otp-input-${index}`}
            type="text"
            value={digit}
            onChange={(e) => handleChange(e, index)}
            maxLength={6}
            className={`w-12 h-12 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              error ? "border-[#E80303]" : "border-gray-300"
            }`}
          />
        ))}
      </div>

      <PrimaryButton onClick={handleSubmit}>Continue</PrimaryButton>
    </div>
  );
};

export default OtpInput;
