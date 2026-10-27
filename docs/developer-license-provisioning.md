# 🔑 Guide: Developer License Provisioning

This guide explains the `PROVISION_DEVELOPER_LICENSE` flow — how to trigger it from `login.dimo.org`, what happens inside the app, and what the calling app receives at the end.

---

## Overview

The provisioning flow lets a user create a new DIMO developer license (or reconnect an existing one) directly from within any app that embeds the DIMO login SDK. The flow handles everything on-chain: minting the license NFT, registering an API key signer, and registering the redirect URI — all in a single session.

---

## 🔗 How to Trigger It

### Option A — SDK Component (recommended)

Use the `ProvisionDeveloperLicenseWithDimo` component from `@dimo-network/login-with-dimo`:

```tsx
import {
  initializeDimoSDK,
  DimoSDKModes,
  ProvisionDeveloperLicenseWithDimo,
} from '@dimo-network/login-with-dimo';

initializeDimoSDK({
  clientId: '0xYourClientId',
  redirectUri: 'https://yourapp.com/callback',
});

<ProvisionDeveloperLicenseWithDimo
  mode={DimoSDKModes.POPUP}
  domain="https://yourapp.com"
  onSuccess={(result) => {
    // result.clientId  — the new developer license address
    // result.privateKey — raw hex API key (no 0x prefix)
    // result.tokenId   — on-chain token ID of the license NFT
  }}
  onError={(err) => console.error(err)}
/>
```

The SDK opens the popup, sends `AUTH_INIT` once the popup signals it's ready, and calls `onSuccess` when a `provisionResponse` message arrives.

To reconnect an existing license instead of minting a new one, pass both optional props:

```tsx
<ProvisionDeveloperLicenseWithDimo
  mode={DimoSDKModes.POPUP}
  domain="https://yourapp.com"
  onSuccess={handleSuccess}
  onError={handleError}
  existingTokenId={123}
  existingClientId="0xabc…"
/>
```

---

### Option B — Direct URL

Set `entryState=PROVISION_DEVELOPER_LICENSE` in the query string. The user will be asked to sign in first, then immediately enter the provisioning flow.

**Minimum required params:**

```
https://login.dimo.org/?clientId=0xYourClientId&redirectUri=https%3A%2F%2Fyourapp.com%2Fcallback&entryState=PROVISION_DEVELOPER_LICENSE
```

**All supported params for this flow:**

| Parameter | Required | Description |
|---|---|---|
| `clientId` | yes | Your app's DIMO client ID (`0x`-prefixed) |
| `redirectUri` | yes | Where to redirect after completion (must be registered on the license) |
| `entryState` | yes | Must be `PROVISION_DEVELOPER_LICENSE` |
| `brandName` | no | Selects a named brand from your dev console for custom UI theming |
| `existingTokenId` | no | Token ID of a license to reconnect — skips the mint step |
| `existingClientId` | no | Client ID of a license to reconnect — skips the mint step |

> **Note:** Pass both `existingTokenId` and `existingClientId` together, or neither. Passing only one will be ignored.

---

## ⚙️ What Happens Inside dimo-login

Once the user is authenticated, the `ProvisionDeveloperLicense` component shows what it will do and waits for the user. Nothing is signed until they tap Continue (or one of the existing-license buttons): any page can open this flow, and a key or redirect address given to the wrong site hands it the license.

Every screen names the site that gets the key (the `redirectUri`'s host) and, when it isn't registered yet, the redirect address that will be added. A request without a `redirectUri` stops with an error. In popup and embed mode, the page that opened the flow must be on the `redirectUri`'s origin. Cancel tells the app `error: 'User cancelled developer license setup'`.

### Step 1 — Detect or mint the license

On mount, the component checks whether the authenticated wallet already owns a developer license (via `getFirstOwnedDeveloperLicense`).

- **Existing license found (and no `existingTokenId` passed):** The user is shown a prompt asking whether they have their existing API key. They can confirm (sends back `clientId` only, no new key) or choose to generate a new API key (proceeds to Step 2).
- **`existingTokenId` + `existingClientId` passed explicitly:** The license must be owned by the signed-in account (checked against the identity API); otherwise the flow stops with "This developer license isn't in your account." After the user confirms, it goes to Step 2 with those values.
- **No existing license:** After the user confirms, calls `issueInDimo` on the `DeveloperLicense` contract to mint a new license NFT. The `Issued` event is parsed from the transaction receipt to get the `tokenId` and `clientId`.

### Step 2 — Register the API key and redirect URI

A fresh private key is generated **once on component mount** and held in a ref (never stored anywhere). Step 2 submits a batched transaction that:

1. Calls `enableSigner(tokenId, signerAddress)` — registers the generated key's address as an authorized signer on the license.
2. If the calling app's `redirectUri` is not already registered on-chain: calls `setRedirectUri(tokenId, true, redirectUri)`.

### Response

After Step 2 completes, the component sends a `provisionResponse` message and redirects:

- **Popup mode:** `postMessage` to the opener window, addressed to the `redirectUri`'s origin. It is never sent to the referrer.
- **Redirect mode:** `tokenId` and `clientId` are appended to the `redirectUri` as query params. **The private key is never sent via redirect** — it can only be delivered through `postMessage` to avoid exposure in URLs, server logs, and browser history.

---

## 📬 Response Payload

```ts
// Popup mode — received via window.addEventListener('message', ...)
{
  eventType: 'provisionResponse',
  tokenId: number,
  clientId: string,   // 0x-prefixed license address
  privateKey: string, // raw hex, no 0x prefix — only present in popup mode
}

// Redirect mode — appended to redirectUri as query params
?tokenId=123&clientId=0xabc…
// privateKey is NOT included in redirect mode
```

> The `privateKey` is the raw private key for the signer registered on-chain. Store it encrypted. Once the popup closes it cannot be retrieved from DIMO again.

---

## 🔄 Flow Diagram

```
[ Calling App ]
   └── renders ProvisionDeveloperLicenseWithDimo (SDK)
         └── user clicks button
               ↓
      SDK opens popup → login.dimo.org?entryState=PROVISION_DEVELOPER_LICENSE
               ↓
      [ dimo-login popup ]
         └── user signs in (email + passkey)
               ↓
         AuthContext.handlePostAuthUIState sees entryState=PROVISION_DEVELOPER_LICENSE
               ↓
         ProvisionDeveloperLicense mounts, generates fresh private key
               ↓
         Check: does wallet already own a license?
           ├── Yes (no existingTokenId) → show prompt naming the site
           │     ├── "I have my key" → skip to response (clientId only)
           │     └── "Generate new key" → Step 2
           ├── existingTokenId passed → must be this account's → confirm → Step 2
           └── No → confirm → Step 1: mint license NFT (issueInDimo)
                         ↓
                     Step 2: enableSigner + setRedirectUri (batch tx)
               ↓
         sendMessageToReferrer({ eventType: 'provisionResponse', tokenId, clientId, privateKey })
               ↓
      SDK message handler validates origin → calls onSuccess(ProvisionResult)
               ↓
[ Calling App ]
   └── onSuccess receives { clientId, privateKey, tokenId, domain }
   └── store credentials securely, continue onboarding
```

---

## ✅ Notes

- The private key is generated fresh each time the component mounts. If the user closes and reopens the popup, a new key is generated and a new `enableSigner` transaction is submitted — the old signer address remains registered on-chain but the old key is effectively superseded.
- In redirect mode, the private key is intentionally omitted from the response. Apps using redirect mode must prompt the user to enter their key manually (e.g., from a previously saved copy).
- The flow works without a pre-registered `clientId` in the SDK config — this is the one flow where `login.dimo.org` relaxes the dev license validation check, since the license is being created in this session. That is why it always asks the user first.
