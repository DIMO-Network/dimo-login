import { render, act } from '@testing-library/react';
import { useParamsHandler } from '../useParamsHandler';
import type { AllParams } from '../../types';
import { setResponseMode } from '../../utils/messageHandler';

vi.mock('../../context/UIManagerContext', () => ({
  useUIManager: () => ({
    setUiState: vi.fn(),
    setEntryState: vi.fn(),
    setAltTitle: vi.fn(),
  }),
}));
vi.mock('../../context/OraclesContext', () => ({
  useOracles: () => ({ setOnboardingEnabled: vi.fn() }),
}));
vi.mock('../../utils/messageHandler', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/messageHandler')>()),
  setResponseMode: vi.fn(),
}));

// Probe component exposing the hook's current state and its apply function.
const setup = () => {
  let hook!: ReturnType<typeof useParamsHandler>;
  const Probe = () => {
    hook = useParamsHandler({} as AllParams);
    return null;
  };
  render(<Probe />);
  const apply = (config: Record<string, unknown>) =>
    act(() => hook.applyDevCredentialsConfig(config));
  return { apply, state: () => hook.devCredentialsState };
};

describe('prompt', () => {
  it('keeps an earlier valid value when a later one is invalid', () => {
    const { apply, state } = setup();
    apply({ prompt: 'login' });
    apply({ prompt: 'none' });
    expect(state().prompt).toBe('login');
  });

  it.each([[['login']], [{}]])('ignores non-string %j', (value) => {
    const { apply, state } = setup();
    apply({ prompt: 'login' });
    apply({ prompt: value });
    expect(state().prompt).toBe('login');
  });
});

describe('loginHint', () => {
  it('keeps an earlier valid value when a later one is invalid', () => {
    const { apply, state } = setup();
    apply({ loginHint: 'A@X.co' });
    apply({ loginHint: 'not an email' });
    expect(state().loginHint).toBe('a@x.co');
  });

  it('ignores a non-string value', () => {
    const { apply, state } = setup();
    apply({ loginHint: 'a@x.co' });
    apply({ loginHint: ['b@x.co'] });
    expect(state().loginHint).toBe('a@x.co');
  });
});

describe('responseMode', () => {
  it.each(['fragment', 'query'] as const)('accepts %s', (mode) => {
    const { apply, state } = setup();
    apply({ responseMode: mode });
    expect(state().responseMode).toBe(mode);
    expect(setResponseMode).toHaveBeenCalledWith(mode);
  });

  it.each(['form_post', 'Fragment ', '', ['fragment'], 1])(
    'drops %j, keeping an earlier valid value',
    (value) => {
      const { apply, state } = setup();
      apply({ responseMode: 'fragment' });
      apply({ responseMode: value });
      expect(state().responseMode).toBe('fragment');
      expect(setResponseMode).toHaveBeenCalledTimes(1);
    },
  );
});
