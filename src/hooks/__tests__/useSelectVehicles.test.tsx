import React from 'react';
import { render, act } from '@testing-library/react';

import useSelectVehicles from '../useSelectVehicles';
import { Vehicle } from '../../models/vehicle';

// Each fetch builds fresh objects, so tests use copies to mimic paging back.
const vehicle = (tokenId: number) => ({ tokenId, shared: true }) as Vehicle;

type Api = ReturnType<typeof useSelectVehicles>;

const setup = (shareable: Vehicle[], preselected: Vehicle[]) => {
  let api: Api;
  const Probe = ({ s, p }: { s: Vehicle[]; p: Vehicle[] }) => {
    api = useSelectVehicles(s, p);
    return null;
  };
  const { rerender } = render(<Probe s={shareable} p={preselected} />);
  return {
    get: () => api,
    load: (s: Vehicle[], p: Vehicle[]) => rerender(<Probe s={s} p={p} />),
  };
};

it('preselects outdated vehicles and matches them by tokenId after a refetch', () => {
  const hook = setup([vehicle(1), vehicle(2)], [vehicle(1)]);
  expect(hook.get().selectedVehicles.map((v) => v.tokenId)).toEqual([1]);

  // Next page, then back: new objects for the same vehicles.
  hook.load([vehicle(3)], []);
  const refetched = [vehicle(1), vehicle(2)];
  hook.load(refetched, [refetched[0]]);

  expect(hook.get().checkIfSelected(refetched[0])).toBe(true);
  expect(hook.get().selectedVehicles).toHaveLength(1);

  // Clicking the refetched card deselects it rather than adding a duplicate.
  act(() => hook.get().handleVehicleSelect(refetched[0]));
  expect(hook.get().selectedVehicles).toHaveLength(0);
});

it("keeps a user's deselection when paging brings the vehicle back", () => {
  const hook = setup([vehicle(1)], [vehicle(1)]);
  act(() => hook.get().handleVehicleSelect(vehicle(1)));
  expect(hook.get().selectedVehicles).toHaveLength(0);

  hook.load([vehicle(3)], []);
  hook.load([vehicle(1)], [vehicle(1)]);

  expect(hook.get().selectedVehicles).toHaveLength(0);
});

it('select all toggles only the vehicles on screen', () => {
  const hook = setup([vehicle(1), vehicle(2)], []);
  act(() => hook.get().handleToggleSelectAll());
  expect(hook.get().allSelected).toBe(true);

  act(() => hook.get().handleToggleSelectAll());
  expect(hook.get().selectedVehicles).toHaveLength(0);
});
