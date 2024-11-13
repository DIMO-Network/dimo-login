// src/components/SuccessPage.tsx
import React from "react";
import { useAuthContext } from "../../context/AuthContext";
import Card from "../Shared/Card";
import Header from "../Shared/Header";

const SuccessPage: React.FC = () => {
  const { user } = useAuthContext(); // Get verifyOtp from the context
  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header
        title="You are logged in!"
        subtitle={
          user ? user.email : ""
        }
      />
      </Card>
  );
};

export default SuccessPage;
