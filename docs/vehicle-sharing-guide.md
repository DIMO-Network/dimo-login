# 🧪 Guide: Testing Vehicle Sharing

This guide walks through how to test the vehicle sharing flow via the DIMO Webapp and SDK.

---

## 🚗 Step 1: Mint a Vehicle

Before testing the share flow, the user must already have a vehicle in their account. To mint one:

- We can use the DIMO Identity Repo
- Clone: https://github.com/DIMO-Network/dimo-identity
- Configure .env

```
AMOY_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=YOUR_PRIVATE_KEY (should have DCX/Amoy funds for minting)
```

- Run the following command: `npx hardhat mint-vehicle --owner {walletAddress} --network amoy`

---

## 🔗 Step 2: Launch the Share Flow

You can test the flow by either:

### Option A — Using the SDK Component

Render the `ShareVehiclesWithDimo` component in the example app or in your integration:

```tsx
<ShareVehiclesWithDimo
  permissionTemplateId="template-id"
  vehicles={['your-test-vin']}
  vehicleMakes={['TESLA']}
  onboarding={false}
/>
```

### Option B — Direct URL Configuration

Manually construct a redirect URL that includes the required event payload:

The key here is to set the `entryState` param, to `VEHICLE_MANAGER`

Example: `https://login.dimo.org/?clientId=0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481&entryState=VEHICLE_MANAGER&expirationDate=2025-12-11T18%3A51%3A00.000Z&permissionTemplateId=2&redirectUri=http%3A%2F%2F127.0.0.1%3A3000%2F`

## 🔗 Step 3: Go Through the Flow

Once the flow is launched:
- The vehicle should appear in the UI
- Select it and proceed through the permission flow, as shown here: https://www.loom.com/share/408201d1a85f4f96a0b79534f99ebab8

## ✅ Notes
- Sharing only works with minted vehicles assigned to the current user
- If the vehicle isn’t appearing, check:
    - The wallet address matches the one used to mint
- The flow can be tested in popup or redirect mode