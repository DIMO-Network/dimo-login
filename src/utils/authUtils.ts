// src/utils/authUtils.ts
export function authenticateUser(
  email: string,
  onSuccess: (token: string) => void
) {
  console.log(`Authenticating user with email: ${email}`);

  // Simulate a delay for authentication
  setTimeout(() => {
    const token = "fake-jwt-token"; // Fake token
    console.log("Authentication successful, token:", token);

    // Send the token to parent window (assuming popup)
    if (window.opener) {
      window.opener.postMessage(
        { token, authType: "popup" },
        "http://localhost:3001" //TODO: PULL URL FROM ENV
      );
      window.close();
    } else if (window.parent) {
      window.parent.postMessage(
        { token, authType: "embed" },
        "http://localhost:3001" //TODO: PULL URL FROM ENV
      );
    }

    // Trigger success callback
    onSuccess(token);
  }, 2000); // Simulating a 2-second delay
}