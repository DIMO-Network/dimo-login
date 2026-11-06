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
  /** The steps, after the latest initKernelSigner call has created its signer. */
  signInStepsWithSigner(): Promise<SignInSteps>;
}

export const createWalletLoader = (
  importSteps: () => Promise<SignInSteps>,
): WalletLoader => {
  let steps: Promise<SignInSteps> | undefined;
  let signer: Promise<void> | undefined;

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
    // The caller that starts the signer doesn't wait for it; the error reaches
    // whoever next asks for the steps, through signInStepsWithSigner.
    created.catch(() => {});
    signer = created;
    return created;
  };

  const signInStepsWithSigner = async () => {
    await signer;
    return loadSignInSteps();
  };

  return { loadSignInSteps, initKernelSigner, signInStepsWithSigner };
};

export const { loadSignInSteps, initKernelSigner, signInStepsWithSigner } =
  createWalletLoader(() => import('./signInSteps'));
