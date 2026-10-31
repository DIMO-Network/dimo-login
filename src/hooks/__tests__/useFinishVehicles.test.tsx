/* eslint-disable import/first -- vi.mock calls must precede the imports they mock */
import { renderHook } from '@testing-library/react';

const mockSend = vi.fn();
vi.mock('../useSendAuthPayloadToParent', () => ({
  useSendAuthPayloadToParent: () => mockSend,
}));
vi.mock('../../context/DevCredentialsContext', () => ({
  useDevCredentials: () => ({ redirectUri: 'https://app.example/cb', utm: '' }),
}));
const mockUi = { setUiState: vi.fn(), setComponentData: vi.fn() };
vi.mock('../../context/UIManagerContext', () => ({ useUIManager: () => mockUi }));
const mockBack = vi.fn();
vi.mock('../../utils/messageHandler', () => ({
  backToThirdParty: (...args: unknown[]) => mockBack(...args),
}));

import { useFinishShareVehicles, useFinishVehicles } from '../useFinishShareVehicles';
import { UiStates } from '../../enums';

const AUTH = { token: 'jwt', walletAddress: '0xabc' };
const vehicle = { tokenId: 42 } as never;

beforeEach(() => {
  vi.clearAllMocks();
  // Popup mode: the message is posted, then the callback runs.
  mockSend.mockImplementation((extra, onSuccess) => onSuccess({ ...AUTH, ...extra }));
});

it.each([
  ['extended', 'extendedVehicles'],
  ['revoked', 'revokedVehicles'],
] as const)('tells a popup app about %s vehicles right away', (action, key) => {
  const { result } = renderHook(() => useFinishVehicles());
  const results = [{ vehicle, outcome: action }];
  result.current(action, results);

  expect(mockSend).toHaveBeenCalledWith({ [key]: ['42'] }, expect.any(Function));
  expect(mockUi.setComponentData).toHaveBeenCalledWith({ action, results, skipped: [] });
  expect(mockUi.setUiState).toHaveBeenCalledWith(UiStates.VEHICLES_SHARED_SUCCESS);
  expect(mockBack).not.toHaveBeenCalled();
});

it('goes straight back to the app when nothing was shared (Cancel)', () => {
  const { result } = renderHook(() => useFinishShareVehicles());
  result.current([]);

  expect(mockSend).toHaveBeenCalledWith({ sharedVehicles: [] }, expect.any(Function));
  expect(mockBack).toHaveBeenCalledWith(
    { ...AUTH, sharedVehicles: [] },
    'https://app.example/cb',
    '',
  );
  expect(mockUi.setUiState).not.toHaveBeenCalled();
});
