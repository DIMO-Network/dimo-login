/* eslint-disable import/first -- jest.mock calls must precede the imports they mock */
// The package ships ESM only; mirror its numeric Permission enum, reverse keys included.
jest.mock('@dimo-network/transactions', () => {
  const names = [
    'GetNonLocationHistory',
    'ExecuteCommands',
    'GetCurrentLocation',
    'GetLocationHistory',
    'GetVINCredential',
    'GetLiveData',
    'GetRawData',
    'GetApproximateLocation',
  ];
  const Permission: Record<string | number, string | number> = {};
  names.forEach((name, i) => {
    Permission[name] = i + 1;
    Permission[i + 1] = name;
  });
  return { Permission };
});

import { vehicleManagerValidations } from '../vehicleManagerValidations';
import type { AllParams } from '../../types';

const check = (permissions: string) =>
  vehicleManagerValidations.validatePermissionParams({ permissions } as AllParams);

describe('permission strings', () => {
  it('take one digit per permission, up to eight', () => {
    expect(check('1').isValid).toBe(true);
    expect(check('11111111').isValid).toBe(true);
  });

  it('reject a ninth digit and say the limit is eight', () => {
    const result = check('111111111');
    expect(result.isValid).toBe(false);
    expect(result.error?.message).toEqual(
      expect.objectContaining({ params: { max: 8 } }),
    );
  });

  it('reject anything but 0 and 1', () => {
    expect(check('12').isValid).toBe(false);
  });
});
