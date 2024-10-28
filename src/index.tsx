import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "./context/AuthContext";
import { DevCredentialsProvider } from "./context/DevCredentialsContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <DevCredentialsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DevCredentialsProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();


window.onload = () => {
  if (window.opener) {
    const parentOrigin = new URL(document.referrer).origin;
    window.opener.postMessage(
      { eventType: "READY" },
      parentOrigin
    );
    console.log("READY message sent to Developers App.");
  } else {
    console.error("No opener window found; cannot send READY message.");
  }
};