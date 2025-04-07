import React, { useState } from "react";
import { useAuthContext } from "../../context/AuthContext"; // Use the auth context
import ErrorMessage from "../Shared/ErrorMessage";
import PrimaryButton from "../Shared/PrimaryButton";
import SecondaryButton from "../Shared/SecondaryButton";
import Card from "../Shared/Card";
import Header from "../Shared/Header";
import { useUIManager } from "../../context/UIManagerContext";

interface OtpInputProps {
  email: string;
}

const OtpInput: React.FC<OtpInputProps> = ({ email }) => {
  const { verifyOtp, authenticateUser, sendOtp } = useAuthContext(); // Get verifyOtp from the context
  const { entryState, error } = useUIManager();
  const [otpArray, setOtpArray] = useState(Array(6).fill("")); // Array of 6 empty strings

  // Function to handle change for each input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { value } = e.target;

    // Detect paste event for the full OTP
    if (value.length === 6) {
      const newOtpArray = value.split("").slice(0, 6); // Only stake the first 6 characters
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
      const result = await verifyOtp(email, otp);

      if (result.success && result.data.credentialBundle) {
        authenticateUser(email, result.data.credentialBundle, entryState);
      }
    }
  };

  const handleBackspace = (id: string, index: number) => {
    const value =
      (document?.getElementById(id) as HTMLInputElement).value || "";
    if (value === "") {
      if (index > 0) {
        document?.getElementById(`otp-input-${index - 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Enter") {
      handleSubmit();
    }

    const {
      key,
      currentTarget: { id },
    } = e;
    if (key === "Backspace") {
      setTimeout(() => handleBackspace(id, index), 100);
    }
  };

  return (
    <Card
      width="w-full max-w-[600px]"
      height="h-fit"
      className="flex flex-col items-center"
    >
      <div className="flex flex-col gap-2 w-[440px]">
        <Header
          title="Please enter your OTP Code"
          subtitle={email || "moiz@gmail.com"}
        />
        <p className="w-full tracking-tight text-center text-sm">
          A code was just sent to {email}, which will expire in 5 minutes. Check
          your spam if you don't see it, and resend.
        </p>

        {error && <ErrorMessage message={error} />}

        <div className="frame9 flex flex-col items-center gap-4 w-full">
          <div className="flex flex-row gap-3 w-full mt-8 justify-between">
            {otpArray.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                maxLength={6}
                className={`w-10 h-10 lg:w-12 lg:h-12 border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  error ? "border-[#E80303]" : "border-gray-300"
                }`}
              />
            ))}
          </div>
          <PrimaryButton onClick={handleSubmit} width="w-full">
            Verify email
          </PrimaryButton>
          <SecondaryButton onClick={() => sendOtp(email)} width="w-full">
            Resend code
          </SecondaryButton>
        </div>
      </div>
    </Card>
  );
};

export default OtpInput;
