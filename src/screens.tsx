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
 * (vite-plugins/entryGuard.mts).
 *
 * A screen whose chunk doesn't load fails with ChunkLoadError, which
 * ScreenErrorBoundary answers with one reload. A preload that fails is
 * ignored, so it never reloads the page.
 */
import {
  createElement,
  lazy,
  type ComponentProps,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';

import { UiStates } from './enums';
import { ChunkLoadError } from './utils/chunkReload';

type ScreenModule<T> = { default: T };

/**
 * A lazy screen with a preload() that shares its load. The module is loaded
 * once and kept, so a screen preloaded before it's shown renders in the same
 * commit as the step change: React.lazy reads a thenable that calls back at
 * once as already loaded, where a resolved promise would still show the
 * loading screen (React then holds it for 300 ms). A failed load fails with
 * ChunkLoadError. A failed load is forgotten, so the next preload or showing
 * fetches again. React.lazy keeps a failed load for good, so after one the
 * screen swaps in a fresh lazy component: when ScreenErrorBoundary declines to
 * reload (it reloads once for a missing chunk), showing the screen again, after
 * Back, fetches again instead of failing the same way.
 *
 * T's bound is React.lazy's own.
 */
export const lazyScreen = <T extends ComponentType<any>>(
  load: () => Promise<ScreenModule<T>>,
) => {
  let loaded: ScreenModule<T> | undefined;
  let loading: Promise<ScreenModule<T>> | undefined;

  const preload = () => {
    loading ??= load().then(
      (module) => {
        loaded = module;
        return module;
      },
      (cause: unknown) => {
        loading = undefined;
        throw new ChunkLoadError(cause);
      },
    );
    return loading;
  };

  const alreadyLoaded = (module: ScreenModule<T>) =>
    ({
      then: (resolve: (value: ScreenModule<T>) => void) => resolve(module),
    }) as unknown as Promise<ScreenModule<T>>;

  const makeLazy = (): LazyExoticComponent<T> =>
    lazy(() =>
      loaded
        ? alreadyLoaded(loaded)
        : preload().catch((error: unknown) => {
            // Swapped in only once ScreenErrorBoundary has shown the failure:
            // swapping here would let React's retry render fetch again at
            // once, in a loop while the network is down.
            if (error instanceof ChunkLoadError) {
              error.retry = () => {
                current = makeLazy();
              };
            }
            throw error;
          }),
    );
  let current = makeLazy();

  const Screen = (props: ComponentProps<T>) =>
    createElement(current as ComponentType<ComponentProps<T>>, props);
  return Object.assign(Screen, { preload });
};

const screens = {
  [UiStates.PASSKEY_LOGIN]: lazyScreen(() =>
    import('./components/Auth/PasskeyLogin').then((m) => ({ default: m.PasskeyLogin })),
  ),
  [UiStates.OTP_INPUT]: lazyScreen(() =>
    import('./components/Auth/OtpInput').then((m) => ({ default: m.OtpInput })),
  ),
  [UiStates.SIGNUP_VERIFY_EMAIL]: lazyScreen(() =>
    import('./components/Auth/SignUpCode').then((m) => ({ default: m.SignUpCode })),
  ),
  [UiStates.PASSKEY_LOGIN_FAIL]: lazyScreen(() =>
    import('./components/Auth/PasskeyLoginFail').then((m) => ({
      default: m.PasskeyLoginFail,
    })),
  ),
  [UiStates.PASSKEY_GENERATOR]: lazyScreen(() =>
    import('./components/Auth/PasskeyGeneration').then((m) => ({
      default: m.PasskeyGeneration,
    })),
  ),
  [UiStates.VEHICLE_MANAGER]: lazyScreen(() =>
    import('./components/Vehicles/VehicleManager').then((m) => ({
      default: m.VehicleManager,
    })),
  ),
  [UiStates.MANAGE_VEHICLE]: lazyScreen(() =>
    import('./components/Vehicles/ManageVehicle').then((m) => ({
      default: m.ManageVehicle,
    })),
  ),
  [UiStates.ADVANCED_TRANSACTION]: lazyScreen(() =>
    import('./components/AdvancedTransaction/AdvancedTransaction').then((m) => ({
      default: m.AdvancedTransaction,
    })),
  ),
  [UiStates.SIGN_MESSAGE]: lazyScreen(() =>
    import('./components/SignMessage/SignMessage').then((m) => ({
      default: m.SignMessage,
    })),
  ),
  [UiStates.TRANSACTION_SUCCESS]: lazyScreen(() =>
    import('./components/AdvancedTransaction/SuccessfulTransaction').then((m) => ({
      default: m.SuccessfulTransaction,
    })),
  ),
  [UiStates.VEHICLES_SHARED_SUCCESS]: lazyScreen(() =>
    import('./components/Vehicles/SuccessfulPermissions').then((m) => ({
      default: m.SuccessfulPermissions,
    })),
  ),
  [UiStates.ACCOUNT_MANAGER]: lazyScreen(() =>
    import('./components/Accounts/AccountManager').then((m) => ({
      default: m.AccountManager,
    })),
  ),
  [UiStates.ACCOUNT_PERMISSIONS_SUCCESS]: lazyScreen(() =>
    import('./components/Accounts/AccountPermissionsSuccess').then((m) => ({
      default: m.AccountPermissionsSuccess,
    })),
  ),
  [UiStates.ADD_VEHICLE]: lazyScreen(() =>
    import('./components/Vehicles/AddVehicle').then((m) => ({ default: m.AddVehicle })),
  ),
  [UiStates.COMPATIBILITY_CHECK]: lazyScreen(() =>
    import('./components/Vehicles/CompatibilityCheck').then((m) => ({
      default: m.CompatibilityCheck,
    })),
  ),
  [UiStates.MINT_VEHICLE]: lazyScreen(() =>
    import('./components/Vehicles/MintVehicle').then((m) => ({ default: m.MintVehicle })),
  ),
  [UiStates.CONNECT_DEVICE]: lazyScreen(() =>
    import('./components/Connections/ConnectDevice').then((m) => ({
      default: m.ConnectDevice,
    })),
  ),
  [UiStates.CONNECT_TESLA]: lazyScreen(() =>
    import('./components/Connections/ConnectTesla').then((m) => ({
      default: m.ConnectTesla,
    })),
  ),
  [UiStates.TRANSACTION_CANCELLED]: lazyScreen(() =>
    import('./components/AdvancedTransaction/CancelledTransaction').then((m) => ({
      default: m.CancelledTransaction,
    })),
  ),
  [UiStates.SUCCESS]: lazyScreen(() =>
    import('./components/Auth/SuccessPage').then((m) => ({ default: m.SuccessPage })),
  ),
  [UiStates.EMAIL_CONSENT]: lazyScreen(() =>
    import('./components/Auth/EmailConsent').then((m) => ({ default: m.EmailConsent })),
  ),
  [UiStates.LOGOUT]: lazyScreen(() =>
    import('./components/Auth/Logout').then((m) => ({ default: m.Logout })),
  ),
  [UiStates.PROVISION_DEVELOPER_LICENSE]: lazyScreen(() =>
    import('./components/ProvisionDeveloperLicense/ProvisionDeveloperLicense').then(
      (m) => ({ default: m.ProvisionDeveloperLicense }),
    ),
  ),
};

export const PasskeyLogin = screens[UiStates.PASSKEY_LOGIN];
export const OtpInput = screens[UiStates.OTP_INPUT];
export const SignUpCode = screens[UiStates.SIGNUP_VERIFY_EMAIL];
export const PasskeyLoginFail = screens[UiStates.PASSKEY_LOGIN_FAIL];
export const PasskeyGeneration = screens[UiStates.PASSKEY_GENERATOR];
export const VehicleManager = screens[UiStates.VEHICLE_MANAGER];
export const ManageVehicle = screens[UiStates.MANAGE_VEHICLE];
export const AdvancedTransaction = screens[UiStates.ADVANCED_TRANSACTION];
export const SignMessage = screens[UiStates.SIGN_MESSAGE];
export const SuccessfulTransaction = screens[UiStates.TRANSACTION_SUCCESS];
export const SuccessfulPermissions = screens[UiStates.VEHICLES_SHARED_SUCCESS];
export const AccountManager = screens[UiStates.ACCOUNT_MANAGER];
export const AccountPermissionsSuccess = screens[UiStates.ACCOUNT_PERMISSIONS_SUCCESS];
export const AddVehicle = screens[UiStates.ADD_VEHICLE];
export const CompatibilityCheck = screens[UiStates.COMPATIBILITY_CHECK];
export const MintVehicle = screens[UiStates.MINT_VEHICLE];
export const ConnectDevice = screens[UiStates.CONNECT_DEVICE];
export const ConnectTesla = screens[UiStates.CONNECT_TESLA];
export const CancelledTransaction = screens[UiStates.TRANSACTION_CANCELLED];
export const SuccessPage = screens[UiStates.SUCCESS];
export const EmailConsent = screens[UiStates.EMAIL_CONSENT];
export const Logout = screens[UiStates.LOGOUT];
export const ProvisionDeveloperLicense = screens[UiStates.PROVISION_DEVELOPER_LICENSE];

/** The screens a sign-in can pass through after the email screen. */
export const SIGN_IN_STATES: UiStates[] = [
  UiStates.PASSKEY_LOGIN,
  UiStates.OTP_INPUT,
  UiStates.SIGNUP_VERIFY_EMAIL,
  UiStates.PASSKEY_LOGIN_FAIL,
  UiStates.PASSKEY_GENERATOR,
  UiStates.EMAIL_CONSENT,
  UiStates.SUCCESS,
];

/**
 * Starts loading these screens' chunks, so they show without a wait, and
 * settles once they're loaded or have failed. A failure is ignored: the screen
 * loads again when it's shown. States with no lazy screen (the email screen)
 * are skipped.
 */
export const preloadScreens = async (states: UiStates[]): Promise<void> => {
  await Promise.all(
    states
      .filter((state) => Object.hasOwn(screens, state))
      .map((state) =>
        screens[state as keyof typeof screens].preload().catch(() => undefined),
      ),
  );
};
