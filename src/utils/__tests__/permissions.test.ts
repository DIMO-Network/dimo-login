import { getPermissionsValue, Permission } from '@dimo-network/transactions';
import {
  getAddedPermissions,
  getPermissionLabel,
  mergePermissions,
  needsPermissionUpdate,
} from '../permissions';
import { getShareButtonLabel } from '../../components/Vehicles/Footer';

// The package ships ESM only; mirror its Permission enum and 2-bit encoding.
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
  // Same shape as a numeric TS enum: name -> value and value -> name.
  const Permission: Record<string | number, string | number> = {};
  names.forEach((name, i) => {
    Permission[name] = i + 1;
    Permission[i + 1] = name;
  });
  const all = names.map((_, i) => i + 1);
  return {
    Permission,
    getPermissionsValue: (perms: number[]) =>
      perms.reduce((acc, p) => acc | (BigInt(3) << BigInt(p * 2)), BigInt(0)),
    getPermissionsArray: (value: bigint) =>
      all.filter((p) => ((value >> BigInt(p * 2)) & BigInt(3)) === BigInt(3)),
  };
});

const encode = (perms: Permission[]) => getPermissionsValue(perms).toString();

// Template 2: everything except commands and raw data / approximate location.
const OLD_GRANT = encode([
  Permission.GetNonLocationHistory,
  Permission.GetCurrentLocation,
  Permission.GetLocationHistory,
  Permission.GetVINCredential,
  Permission.GetLiveData,
]);
const ALL = '11111111';
const ALL_PERMS = Object.values(Permission).filter(
  (p) => typeof p === 'number',
) as Permission[];

describe('needsPermissionUpdate', () => {
  it('flags a shared vehicle whose grant differs from the request', () => {
    expect(needsPermissionUpdate({ shared: true, permissions: OLD_GRANT }, ALL)).toBe(
      true,
    );
  });

  it('ignores vehicles already shared with the requested permissions', () => {
    const current = encode(
      Object.values(Permission).filter((p) => typeof p === 'number') as Permission[],
    );
    expect(needsPermissionUpdate({ shared: true, permissions: current }, ALL)).toBe(
      false,
    );
  });

  it('ignores vehicles that are not shared yet', () => {
    expect(needsPermissionUpdate({ shared: false, permissions: '0' }, ALL)).toBe(false);
  });

  it('leaves a grant that already covers a narrower request alone', () => {
    // Grant has everything; the app now asks for less. Nothing to add, so no
    // update, and nothing gets silently narrowed.
    expect(
      needsPermissionUpdate({ shared: true, permissions: encode(ALL_PERMS) }, '1'),
    ).toBe(false);
  });

  it('flags a grant that covers the permissions but lacks requested files', () => {
    const current = encode(ALL_PERMS);
    expect(
      needsPermissionUpdate(
        { shared: true, permissions: current, documentAccess: false },
        ALL,
      ),
    ).toBe(true);
  });
});

describe('mergePermissions', () => {
  const vehicleWith = (permissions: string) => ({ permissions, tokenId: 1 });

  it('keeps what the grant has and adds what is requested', () => {
    const granted = encode([Permission.ExecuteCommands]);
    expect(
      mergePermissions(vehicleWith(granted), [
        Permission.GetRawData,
        Permission.ExecuteCommands,
      ]),
    ).toEqual([Permission.ExecuteCommands, Permission.GetRawData]);
  });

  it('refuses a grant with permission bits it cannot carry over', () => {
    const newerPermission = (BigInt(3) << BigInt(18)).toString(); // index 9
    expect(() => mergePermissions(vehicleWith(newerPermission), [])).toThrow(
      "can't carry over",
    );
    const halfSet = (BigInt(1) << BigInt(4)).toString(); // '01' chunk
    expect(() => mergePermissions(vehicleWith(halfSet), [])).toThrow("can't carry over");
  });
});

describe('getAddedPermissions', () => {
  it('lists only the permissions the grant is missing', () => {
    expect(getAddedPermissions([{ permissions: OLD_GRANT }], ALL)).toEqual([
      Permission.ExecuteCommands,
      Permission.GetRawData,
      Permission.GetApproximateLocation,
    ]);
  });

  it('unions missing permissions across vehicles', () => {
    const noCommands = encode([Permission.GetNonLocationHistory]);
    const added = getAddedPermissions(
      [{ permissions: OLD_GRANT }, { permissions: noCommands }],
      ALL,
    );
    expect(added).toContain(Permission.GetCurrentLocation);
    expect(added).toContain(Permission.ExecuteCommands);
  });

  it('has a readable label for every permission', () => {
    expect(getPermissionLabel(Permission.GetRawData)).toBe('Raw data');
  });
});

describe('getShareButtonLabel', () => {
  it.each([
    [0, 0, 'Share vehicles'],
    [2, 0, 'Share 2 vehicles'],
    [1, 1, 'Update 1 vehicle'],
    [3, 1, 'Share and update 3 vehicles'],
  ])('%i selected, %i updates -> %s', (selected, updates, label) => {
    expect(getShareButtonLabel(selected, updates)).toBe(label);
  });
});
