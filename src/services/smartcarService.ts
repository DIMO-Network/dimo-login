const SMARTCAR_AUTH_URL = "https://auth.smartcar.com/oauth";
const SMARTCAR_API_URL = "https://api.smartcar.com/v2.0";
const SMARTCAR_CLIENT_ID = process.env.REACT_APP_SMARTCAR_CLIENT_ID!;
const SMARTCAR_CLIENT_SECRET = process.env.REACT_APP_SMARTCAR_CLIENT_SECRET!;

export interface SubmitCodeExchangeParams {
  clientId: string;
  code: string;
  redirectUri: string;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 1️⃣ Exchange authorization code for access token
export const exchangeAuthCode = async (
  code: string,
  redirectUri: string
): Promise<ApiResult<{ access_token: string }>> => {
  try {
    if (!SMARTCAR_CLIENT_ID || !SMARTCAR_CLIENT_SECRET) {
      throw new Error("Smartcar credentials are missing in environment variables.");
    }

    // Encode client_id:client_secret as Base64 for Basic Auth
    const authHeader = `Basic ${btoa(`${SMARTCAR_CLIENT_ID}:${SMARTCAR_CLIENT_SECRET}`)}`;

    const formBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(SMARTCAR_AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Failed to exchange code" };
    }

    const data = await response.json();
    return { success: true, data: { access_token: data.access_token } };
  } catch (error) {
    console.error("Error exchanging Smartcar auth code:", error);
    return { success: false, error: "An error occurred while exchanging auth code" };
  }
};

// 2️⃣ Get list of vehicles linked to Smartcar account
export const getVehicles = async (accessToken: string): Promise<ApiResult<{ vehicles: string[] }>> => {
  try {
    const response = await fetch(`${SMARTCAR_API_URL}/vehicles`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Failed to fetch vehicles" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching Smartcar vehicles:", error);
    return { success: false, error: "An error occurred while fetching vehicles" };
  }
};

// 3️⃣ Get vehicle details by vehicle ID
export const getVehicleDetails = async (
  accessToken: string,
  vehicleId: string
): Promise<ApiResult<{ make: string; model: string; year: number; vin: string }>> => {
  try {
    const response = await fetch(`${SMARTCAR_API_URL}/vehicles/${vehicleId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Failed to fetch vehicle details" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching Smartcar vehicle details:", error);
    return { success: false, error: "An error occurred while fetching vehicle details" };
  }
};
