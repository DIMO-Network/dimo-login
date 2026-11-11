import { render, act } from '@testing-library/react';
import { useParamsHandler } from '../useParamsHandler';
import type { AllParams } from '../../types';

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

// Probe component: this repo's @testing-library/react has no renderHook.
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

  it.each([[['login']], [{}]])('never stores non-string %j', (value) => {
    const { apply, state } = setup();
    apply({ prompt: value });
    expect(state().prompt).toBeUndefined();
  });
});

describe('loginHint', () => {
  it('keeps an earlier valid value when a later one is invalid', () => {
    const { apply, state } = setup();
    apply({ loginHint: 'A@X.co' });
    apply({ loginHint: 'not an email' });
    expect(state().loginHint).toBe('a@x.co');
  });

  it('never stores a non-string value', () => {
    const { apply, state } = setup();
    apply({ loginHint: ['a@x.co'] });
    expect(state().loginHint).toBeUndefined();
  });
});
