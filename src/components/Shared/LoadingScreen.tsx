// components/Shared/LoadingScreen.js
import React from "react";
import Logo from "./Logo";
import Loader from "./Loader";

const LoadingScreen = () => (
  <div className="flex h-screen pt-10 lg:pt-40 justify-center bg-white lg:bg-[#F7F7F7]">
    <div className="bg-white p-8 rounded-lg text-center max-w-[600px] w-full h-full max-h-[308px]">
      <div className="flex justify-center mb-4">
        <Logo />
      </div>
      <Loader />
    </div>
  </div>
);

export default LoadingScreen;
