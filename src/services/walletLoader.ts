/**
 * walletLoader.ts
 *
 * The only way the app reaches signInSteps, the module that carries the wallet
 * stack (about 1 MB of the bundle). This file imports it lazily, so the first
 * screen can import this one and still show without the wallet.
 */

export type SignInSteps = typeof import('./signInSteps');

export interface WalletLoader {
  /** Imports the sign-in steps once; a failed import is retried on the next call. */
  loadSignInSteps(): Promise<SignInSteps>;
  /** Loads the steps and creates the kernel signer for this app. */
  initKernelSigner(clientId: string, domain: string, redirectUri: string): Promise<void>;
  /**
   * The steps, after the latest initKernelSigner call has created its signer.
   * A signer that failed is started once more for each caller.
   */
  signInStepsWithSigner(): Promise<SignInSteps>;
}

export const createWalletLoader = (
  importSteps: () => Promise<SignInSteps>,
): WalletLoader => {
  let steps: Promise<SignInSteps> | undefined;
  let signer: { created: Promise<void>; restart: () => Promise<void> } | undefined;

  const loadSignInSteps = () => {
    steps ??= importSteps().catch((error: unknown) => {
      steps = undefined;
      throw error;
    });
    return steps;
  };

  const initKernelSigner = (clientId: string, domain: string, redirectUri: string) => {
    const created = loadSignInSteps().then(({ createKernelSigner }) => {
      createKernelSigner(clientId, domain, redirectUri);
    });
    // The caller that starts the signer doesn't wait for it, so the failure is
    // logged here; signInStepsWithSigner starts it again.
    created.catch((error: unknown) => {
      console.error('Could not create the kernel signer', error);
    });
    signer = {
      created,
      restart: () => initKernelSigner(clientId, domain, redirectUri),
    };
    return created;
  };

  const signInStepsWithSigner = async () => {
    const started = signer;
    // A failed signer (most often a failed import, after a network blip) is
    // started again, so sign-in doesn't stay broken until a reload. A caller
    // that finds it already restarted waits for that one instead.
    await started?.created.catch(() =>
      signer === started ? started.restart() : signer?.created,
    );
    return loadSignInSteps();
  };

  return { loadSignInSteps, initKernelSigner, signInStepsWithSigner };
};

export const { loadSignInSteps, initKernelSigner, signInStepsWithSigner } =
  createWalletLoader(() => import('./signInSteps'));
