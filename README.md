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
REACT_APP_ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/f4d1596a-edfd-4063-8f99-2d8835e07739
REACT_APP_ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/f4d1596a-edfd-4063-8f99-2d8835e07739
REACT_APP_ENVIRONMENT=dev
REACT_APP_SMARTCAR_CLIENT_ID=f0378698-ab62-40ca-ae37-5e7fd9cab711
REACT_APP_TESLA_CLIENT_ID=194119ca43c7-4528-9415-3116fb5868cd
REACT_APP_TESLA_REDIRECT_URI=http://localhost:3000/v1
REACT_APP_TESLA_VIRTUAL_KEY_URL=https://www.tesla.com/_ak/auth.dev.drivedimo.com
REACT_APP_RPCID_URL=localhost
```

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
