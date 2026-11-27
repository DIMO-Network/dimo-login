# 🚗 Dimo[LIWD] Web App

This is the DIMO front-end application that powers developer login, vehicle sharing, onboarding, and advanced vehicle flows. The app is tightly integrated with the [Login with DIMO SDK](https://github.com/DIMO-Network/dimo-login-button) and serves as the UI target for popup and redirect flows.

## 🚀 Getting Started

### Dependencies

While mainly light on dependencies, we use an external web3 dependency (turnkey/http), an internal DIMO dependency (transactions SDK), and then some UI packages.

For best results, monitor whether there have been updates to any of these dependencies, as they can cause issues

Install

```
npm install
```

### Run The App

```
npm start
```

The app will run at http://localhost:3000.

### Environment Variables

These env variables are mainly to allow you to switch between dev, production, or local environments when hitting api's, chains, etc

Create a .env file at the root of the project with the following values:

```
REACT_APP_DIMO_ACCOUNTS_URL=https://accounts.dev.dimo.org/api
REACT_APP_DIMO_AUTH_URL=https://auth.dev.dimo.zone
REACT_APP_DIMO_IDENTITY_URL=https://identity-api.dev.dimo.zone/query
REACT_APP_DEVICES_API_URL=http://0.0.0.0:8080/https://devices-api.dev.dimo.zone/v1
REACT_APP_DEVICE_DEFINITIONS_URL=https://device-definitions-api.dev.dimo.zone
REACT_APP_POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/-0PsUljNtSdA31-XWj-kL_L1Mx2ArYfS
REACT_APP_ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/<zero-dev-api-key>
REACT_APP_ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/<zero-dev-api-key>
REACT_APP_ENVIRONMENT=dev
REACT_APP_SMARTCAR_CLIENT_ID=f0378698-ab62-40ca-ae37-5e7fd9cab711
REACT_APP_TESLA_CLIENT_ID=194119ca43c7-4528-9415-3116fb5868cd
REACT_APP_TESLA_REDIRECT_URI=http://localhost:3000/v1
REACT_APP_TESLA_VIRTUAL_KEY_URL=https://www.tesla.com/_ak/auth.dev.drivedimo.com
REACT_APP_RPCID_URL=localhost
REACT_APP_DAUTH_URL=https://dauth.dev.dimo.zone
REACT_APP_DID_DIRECTORY_URL=https://did.dev.dimo.zone
REACT_APP_TURNKEY_PARENT_ORG_ID=<turnkey-parent-org-id>
REACT_APP_CONNECTED_APPS=false
REACT_APP_PASSKEY_OFFER=false
REACT_APP_PASSKEY_FIRST=false
REACT_APP_SIGN_IN_NOTICE=false
REACT_APP_SIGN_UP_PROOF=false
REACT_APP_ACCOUNTS_V2_SENDS=false
```

Features that ship dark are off unless their variable is exactly `true` at build time (`src/utils/featureFlags.ts`):

- `REACT_APP_CONNECTED_APPS`: the connected-apps page, `entryState=CONNECTED_APPS` (see `docs/flows.md`).
- `REACT_APP_PASSKEY_OFFER`: the offer to add a passkey after an email-code sign-in (`PASSKEY_OFFER`). Needs the accounts API's `POST /account/authenticator`.
- `REACT_APP_PASSKEY_FIRST`: "Sign in with a passkey" on the email form, without typing an email. Needs the accounts API's `GET /account/passkey-challenge` and `POST /account/by-passkey`.
- `REACT_APP_SIGN_IN_NOTICE`: tell the accounts API about an account's first sign-in on this browser (`POST /account/sign-in-notice`), which may email the account.
- `REACT_APP_SIGN_UP_PROOF`: when Google or Apple sign-up creates an account, send the provider's token to `POST /account` as `Authorization: Bearer`, the proof the accounts API asks for once its `ACCOUNT_CREATE_REQUIRE_PROOF` is on. Turn it on only after the accounts API that allows the `Authorization` header (CORS) is live: before that the browser refuses the request and Google/Apple sign-up fails. Turn it on before the accounts API starts requiring proof.
- `REACT_APP_ACCOUNTS_V2_SENDS`: send transactions through the accounts v2 API. This step only changes the session: a passkey sign-in opens its Turnkey session as an API-key session after one passkey prompt (the same prompt count as today), so one session stamper serves the wallet signer and the v2 sends. Nothing more is stored in the browser; the session key stays in memory.

The accounts v2 sends (`src/services/v2/accountsV2.ts`) also need three settings: `REACT_APP_DAUTH_URL` (dauth, where the wallet signs in), `REACT_APP_DID_DIRECTORY_URL` (the DID directory) and `REACT_APP_TURNKEY_PARENT_ORG_ID` (DIMO's Turnkey parent organization). They use the origin of `REACT_APP_DIMO_ACCOUNTS_URL` (the SDK adds `/api/v2`) and `REACT_APP_POLYGON_RPC_URL`, on chain 137 when `REACT_APP_ENVIRONMENT=prod` and 80002 otherwise. With any of the five unset, v2 is unavailable (`config_missing`) even with the flag on, and transactions are sent as before.

Before turning the flag on, check the services it talks to:

- dauth's `SIGNIN_CORS_ORIGINS` includes the login's origin (for example `https://login.dev.dimo.org`). Without it the browser blocks the sign-in, v2 is `v2_down`, and every transaction quietly goes through the wallet signer.
- dauth's `SIGNIN_ALLOWED_AUDIENCES` includes the accounts URL's origin (for example `https://accounts.dev.dimo.org`). Without it dauth refuses the sign-in, with the same quiet fallback.
- accounts' `V2_GAS_SPONSORED_CHAIN_IDS`, when set, includes the chain (137 in prod, 80002 otherwise); unset, it covers every supported chain but Ethereum mainnet. Without the chain the gas proxy refuses the send itself, and the transaction fails outright: once a v2 send has started, its errors are never retried through the wallet signer.

Which path sent a transaction shows in the browser console, and in Sentry as a breadcrumb (no event of its own): `Sent through accounts v2: UserOperation <userOpHash> via <provider>` after a v2 send lands, or `Sent through the wallet signer: accounts v2 unavailable (<reason>)` when v2 couldn't serve the account. With the flag off neither line is written. A v2 send with no answer after 240 s fails as pending and is never sent again. With the flag on, a signing screen renews a passkey session that has less than 3 minutes left (its one prompt comes then), so a send never runs past the end of its session.

Users whose account still holds a phone number stay on the wallet signer: accounts refuses their DID claim until the phone is removed (`claim_refused`), and the login doesn't remove it until that step is approved.

🗂️ Folder Structure Overview

```
src/
├── assets/images           # Logos, thumbnails, icons
├── components/             # Feature-based React components
│   ├── Auth
│   ├── Vehicles
│   ├── Connections
│   ├── AdvancedTransaction
│   ├── Shared
│   └── Icons
├── context/                # React Contexts for global state
├── enums/                  # App-wide enums + config constants
├── hooks/                  # Reusable custom hooks
├── models/                 # Types for API requests/responses
├── services/               # SDK/API integration logic
├── stores/                 # Centralized global stores (e.g. auth)
├── types/                  # TS type definitions
└── utils/                  # Reusable helpers (auth, crypto, dates, etc)
```

## 🧠 Architecture Overview

### State Management

The app uses both local component state and global React Contexts:

- `AuthContext` – Authenticated user (JWT, email, wallet)

- `DevCredentialsContext` – Client ID, redirect URI, utm, dev licence alias etc

- `UIManagerContext` – UI state, error/loading states, and componentData (used to replace prop drilling)

- `OraclesContext` – (WIP) Manages developer oracle data

### Navigation

As this app initially started with just 2 view, there was no need for router-based navigation

We don’t use React Router. Instead, the app uses a uiState enum to render views conditionally:

`App.tsx`

```
{uiState === UiStates.OTP_INPUT && <OtpInput email={email} />}
{uiState === UiStates.VEHICLE_MANAGER && <VehicleManager />}
{uiState === UiStates.TRANSACTION_SUCCESS && <SuccessfulTransaction />}
```

The current `uiState` is stored in UIManagerContext and updated as the user progresses through a flow, through a state setter.

### SDK Integration

The app receives incoming data from the Login with DIMO SDK, either:

- via postMessage (popup mode)
- or via query params (redirect mode)

Once parsed, this data populates contexts and configures the UI State.

In addition, the app is also responsible for returning back to the parent app. This is done through a `backToThirdParty` function, which either closes the popup, or redirects back to the parent

## ⚙️ Dev Tips

### Parsing SDK Payload

- Most of this logic can be found in DevCredentialsContext, it covers the various ways we receive data, either as properties within the state URL Param, through messages, or through the url params themselves

### Utilizing the URL

- To test app changes, instead of relying on the SDK to drill props, you can simply update the redirect URI params to mimic the states that the SDK would initialize
- This can be done by configuring the entryState, params etc in the URL

## Conventions

- React Components, Context files are named with PascalCase
- Other files are named with camelCase
- React Classes/Contexts are named with PascalCase
- Methods/Variables are named with camelCase
- Positional Params are used for any functions that take 3 or less inputs, object params used otherwise

## Related Docs

- Guides/Docs to walk through common things tbd
