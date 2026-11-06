import { createWalletLoader, type SignInSteps } from '../walletLoader';

const CLIENT_ID = '0xc';
const REDIRECT_URI = 'https://app.example/cb';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

// The loader only reaches createKernelSigner, so that's all a fake needs.
const stepsWith = (createKernelSigner: () => void) =>
  ({ createKernelSigner }) as unknown as SignInSteps;

// A failed signer is logged; keep the test output clean and let tests check it.
const silenceConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createWalletLoader', () => {
  it('creates the kernel signer once the steps load', async () => {
    const createKernelSigner = vi.fn();
    const { initKernelSigner } = createWalletLoader(async () =>
      stepsWith(createKernelSigner),
    );

    await initKernelSigner(CLIENT_ID, CLIENT_ID, REDIRECT_URI);

    expect(createKernelSigner).toHaveBeenCalledWith(CLIENT_ID, CLIENT_ID, REDIRECT_URI);
  });

  it('waits for the signer before handing out the steps', async () => {
    const imported = deferred<SignInSteps>();
    const createKernelSigner = vi.fn();
    const { initKernelSigner, signInStepsWithSigner } = createWalletLoader(
      () => imported.promise,
    );

    void initKernelSigner(CLIENT_ID, CLIENT_ID, REDIRECT_URI);
    const signerCreatedWhenHandedOut = signInStepsWithSigner().then(
      () => createKernelSigner.mock.calls.length > 0,
    );
    imported.resolve(stepsWith(createKernelSigner));

    expect(await signerCreatedWhenHandedOut).toBe(true);
  });

  it('hands a failed signer to the caller that waits for the steps', async () => {
    const consoleError = silenceConsoleError();
    const failure = new Error('no signer');
    const { initKernelSigner, signInStepsWithSigner } = createWalletLoader(async () =>
      stepsWith(() => {
        throw failure;
      }),
    );

    // Not awaited, as DevCredentialsContext calls it, and nobody asks for the
    // steps until a later task: the failure must not be an unhandled rejection
    // in between, and it's logged.
    void initKernelSigner(CLIENT_ID, CLIENT_ID, REDIRECT_URI);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);

    // Started once more, it fails again, and the caller gets the error.
    await expect(signInStepsWithSigner()).rejects.toThrow('no signer');
  });

  it('starts the signer again after a failed load', async () => {
    silenceConsoleError();
    const createKernelSigner = vi.fn();
    const steps = stepsWith(createKernelSigner);
    const importSteps = vi
      .fn<() => Promise<SignInSteps>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce(steps);
    const { initKernelSigner, signInStepsWithSigner } = createWalletLoader(importSteps);

    void initKernelSigner(CLIENT_ID, CLIENT_ID, REDIRECT_URI);

    await expect(signInStepsWithSigner()).resolves.toBe(steps);
    expect(createKernelSigner).toHaveBeenCalledWith(CLIENT_ID, CLIENT_ID, REDIRECT_URI);
  });

  it('starts a failed signer again once for callers that wait together', async () => {
    silenceConsoleError();
    const createKernelSigner = vi.fn();
    const importSteps = vi
      .fn<() => Promise<SignInSteps>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValue(stepsWith(createKernelSigner));
    const { initKernelSigner, signInStepsWithSigner } = createWalletLoader(importSteps);

    void initKernelSigner(CLIENT_ID, CLIENT_ID, REDIRECT_URI);
    await Promise.all([signInStepsWithSigner(), signInStepsWithSigner()]);

    expect(createKernelSigner).toHaveBeenCalledTimes(1);
  });

  it('imports the steps once', async () => {
    const importSteps = vi.fn(async () => stepsWith(vi.fn()));
    const { loadSignInSteps } = createWalletLoader(importSteps);

    await loadSignInSteps();
    await loadSignInSteps();

    expect(importSteps).toHaveBeenCalledTimes(1);
  });

  it('retries the import after a failed load', async () => {
    const steps = stepsWith(vi.fn());
    const importSteps = vi
      .fn<() => Promise<SignInSteps>>()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce(steps);
    const { loadSignInSteps } = createWalletLoader(importSteps);

    await expect(loadSignInSteps()).rejects.toThrow('chunk failed');
    await expect(loadSignInSteps()).resolves.toBe(steps);
  });
});
