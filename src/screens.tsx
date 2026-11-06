/**
 * screens.tsx
 *
 * Every screen after the first, each loaded when it's shown. The email screen
 * (and the loading and error screens) stay in the entry chunk, so the popup
 * shows its first screen without downloading the rest, the wallet stack most
 * of all. App preloads the sign-in screens once the browser is idle.
 *
 * Import a screen from here, not from its file: most of them reach the wallet
 * stack, and the build fails if that lands in the first screen's chunks
 * (vite-plugins/entryGuard.ts).
 */
import { lazy } from 'react';

import { UiStates } from './enums';

const screenLoaders = {
  [UiStates.PASSKEY_LOGIN]: () =>
    import('./components/Auth/PasskeyLogin').then((m) => ({ default: m.PasskeyLogin })),
  [UiStates.OTP_INPUT]: () =>
    import('./components/Auth/OtpInput').then((m) => ({ default: m.OtpInput })),
  [UiStates.PASSKEY_LOGIN_FAIL]: () =>
    import('./components/Auth/PasskeyLoginFail').then((m) => ({
      default: m.PasskeyLoginFail,
    })),
  [UiStates.PASSKEY_GENERATOR]: () =>
    import('./components/Auth/PasskeyGeneration').then((m) => ({
      default: m.PasskeyGeneration,
    })),
  [UiStates.VEHICLE_MANAGER]: () =>
    import('./components/Vehicles/VehicleManager').then((m) => ({
      default: m.VehicleManager,
    })),
  [UiStates.MANAGE_VEHICLE]: () =>
    import('./components/Vehicles/ManageVehicle').then((m) => ({
      default: m.ManageVehicle,
    })),
  [UiStates.ADVANCED_TRANSACTION]: () =>
    import('./components/AdvancedTransaction/AdvancedTransaction').then((m) => ({
      default: m.AdvancedTransaction,
    })),
  [UiStates.SIGN_MESSAGE]: () =>
    import('./components/SignMessage/SignMessage').then((m) => ({
      default: m.SignMessage,
    })),
  [UiStates.TRANSACTION_SUCCESS]: () =>
    import('./components/AdvancedTransaction/SuccessfulTransaction').then((m) => ({
      default: m.SuccessfulTransaction,
    })),
  [UiStates.VEHICLES_SHARED_SUCCESS]: () =>
    import('./components/Vehicles/SuccessfulPermissions').then((m) => ({
      default: m.SuccessfulPermissions,
    })),
  [UiStates.ACCOUNT_MANAGER]: () =>
    import('./components/Accounts/AccountManager').then((m) => ({
      default: m.AccountManager,
    })),
  [UiStates.ACCOUNT_PERMISSIONS_SUCCESS]: () =>
    import('./components/Accounts/AccountPermissionsSuccess').then((m) => ({
      default: m.AccountPermissionsSuccess,
    })),
  [UiStates.ADD_VEHICLE]: () =>
    import('./components/Vehicles/AddVehicle').then((m) => ({ default: m.AddVehicle })),
  [UiStates.COMPATIBILITY_CHECK]: () =>
    import('./components/Vehicles/CompatibilityCheck').then((m) => ({
      default: m.CompatibilityCheck,
    })),
  [UiStates.MINT_VEHICLE]: () =>
    import('./components/Vehicles/MintVehicle').then((m) => ({ default: m.MintVehicle })),
  [UiStates.CONNECT_DEVICE]: () =>
    import('./components/Connections/ConnectDevice').then((m) => ({
      default: m.ConnectDevice,
    })),
  [UiStates.CONNECT_TESLA]: () =>
    import('./components/Connections/ConnectTesla').then((m) => ({
      default: m.ConnectTesla,
    })),
  [UiStates.TRANSACTION_CANCELLED]: () =>
    import('./components/AdvancedTransaction/CancelledTransaction').then((m) => ({
      default: m.CancelledTransaction,
    })),
  [UiStates.SUCCESS]: () =>
    import('./components/Auth/SuccessPage').then((m) => ({ default: m.SuccessPage })),
  [UiStates.EMAIL_CONSENT]: () =>
    import('./components/Auth/EmailConsent').then((m) => ({ default: m.EmailConsent })),
  [UiStates.LOGOUT]: () =>
    import('./components/Auth/Logout').then((m) => ({ default: m.Logout })),
  [UiStates.PROVISION_DEVELOPER_LICENSE]: () =>
    import('./components/ProvisionDeveloperLicense/ProvisionDeveloperLicense').then(
      (m) => ({ default: m.ProvisionDeveloperLicense }),
    ),
};

export const PasskeyLogin = lazy(screenLoaders[UiStates.PASSKEY_LOGIN]);
export const OtpInput = lazy(screenLoaders[UiStates.OTP_INPUT]);
export const PasskeyLoginFail = lazy(screenLoaders[UiStates.PASSKEY_LOGIN_FAIL]);
export const PasskeyGeneration = lazy(screenLoaders[UiStates.PASSKEY_GENERATOR]);
export const VehicleManager = lazy(screenLoaders[UiStates.VEHICLE_MANAGER]);
export const ManageVehicle = lazy(screenLoaders[UiStates.MANAGE_VEHICLE]);
export const AdvancedTransaction = lazy(screenLoaders[UiStates.ADVANCED_TRANSACTION]);
export const SignMessage = lazy(screenLoaders[UiStates.SIGN_MESSAGE]);
export const SuccessfulTransaction = lazy(screenLoaders[UiStates.TRANSACTION_SUCCESS]);
export const SuccessfulPermissions = lazy(
  screenLoaders[UiStates.VEHICLES_SHARED_SUCCESS],
);
export const AccountManager = lazy(screenLoaders[UiStates.ACCOUNT_MANAGER]);
export const AccountPermissionsSuccess = lazy(
  screenLoaders[UiStates.ACCOUNT_PERMISSIONS_SUCCESS],
);
export const AddVehicle = lazy(screenLoaders[UiStates.ADD_VEHICLE]);
export const CompatibilityCheck = lazy(screenLoaders[UiStates.COMPATIBILITY_CHECK]);
export const MintVehicle = lazy(screenLoaders[UiStates.MINT_VEHICLE]);
export const ConnectDevice = lazy(screenLoaders[UiStates.CONNECT_DEVICE]);
export const ConnectTesla = lazy(screenLoaders[UiStates.CONNECT_TESLA]);
export const CancelledTransaction = lazy(screenLoaders[UiStates.TRANSACTION_CANCELLED]);
export const SuccessPage = lazy(screenLoaders[UiStates.SUCCESS]);
export const EmailConsent = lazy(screenLoaders[UiStates.EMAIL_CONSENT]);
export const Logout = lazy(screenLoaders[UiStates.LOGOUT]);
export const ProvisionDeveloperLicense = lazy(
  screenLoaders[UiStates.PROVISION_DEVELOPER_LICENSE],
);

/** The screens a sign-in can pass through after the email screen. */
export const SIGN_IN_STATES: UiStates[] = [
  UiStates.PASSKEY_LOGIN,
  UiStates.OTP_INPUT,
  UiStates.PASSKEY_LOGIN_FAIL,
  UiStates.PASSKEY_GENERATOR,
  UiStates.EMAIL_CONSENT,
  UiStates.SUCCESS,
];

/**
 * Starts loading these screens' chunks, so they show without a wait. A chunk
 * that fails here is loaded again when its screen is shown, so the failure is
 * ignored. States with no lazy screen (the email screen) are skipped.
 */
export const preloadScreens = (states: UiStates[]): void => {
  for (const state of states) {
    if (!Object.hasOwn(screenLoaders, state)) continue;
    screenLoaders[state as keyof typeof screenLoaders]().catch(() => {});
  }
};
