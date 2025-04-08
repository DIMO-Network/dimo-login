jest.mock('../identityService');

import { fetchVehiclesWithTransformation } from '../vehicleService';
import { fetchVehicles, getPowertrainTypeMatch } from '../identityService';

beforeEach(() => {
  (fetchVehicles as jest.Mock).mockImplementation(() => {
    return Promise.resolve({
      data: {
        vehicles: {
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: '',
            endCursor: '',
          },
          nodes: [
            {
              tokenId: 1,
              definition: {
                id: 'tesla_model_3_2019',
                make: 'Tesla',
                model: 'Model 3',
                year: 2019,
              },
              sacds: {
                nodes: [],
              },
            },
            {
              tokenId: 2,
              definition: {
                id: 'ford_bronco_2023',
                make: 'Ford',
                model: 'Bronco',
                year: 2023,
              },
              sacds: {
                nodes: [],
              },
            },
          ],
        },
      },
    });
  });
  (getPowertrainTypeMatch as jest.Mock).mockImplementation(
    (vehicle: any, powertrainTypes: string[]) => {
      if (vehicle.definition.id === 'tesla_model_3_2019') {
        return powertrainTypes.includes('BEV');
      }
      if (vehicle.definition.id === 'ford_bronco_2023') {
        return powertrainTypes.includes('ICE');
      }
    },
  );
});

afterEach(() => jest.restoreAllMocks());

it('Returns all vehicles as compatible without filters', async () => {
  const data = await fetchVehiclesWithTransformation({
    ownerAddress: 'address',
    targetGrantee: 'grantee',
    cursor: '',
    direction: '',
    filters: {},
  });
  expect(fetchVehicles).toHaveBeenCalled();
  expect(data.compatibleVehicles.length).toEqual(2);
  expect(data.incompatibleVehicles.length).toEqual(0);
});
it('Only returns vehicles that match the tokenIds', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleTokenIds: ['1'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].tokenId).toEqual(1);
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].tokenId).toEqual(2);
});
it('Only returns vehicles that match the make', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleMakes: ['Ford'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].make).toEqual('Ford');
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].make).toEqual('Tesla');
});
it('Calls getPowertrainTypeMatch with the correct args', async () => {
  await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { powertrainTypes: ['BEV'] },
  });
  expect(getPowertrainTypeMatch).toHaveBeenCalledTimes(2);
  expect((getPowertrainTypeMatch as jest.Mock).mock.calls[0][1]).toEqual(['BEV']);
  expect((getPowertrainTypeMatch as jest.Mock).mock.calls[1][1]).toEqual(['BEV']);
});
it('Returns both vehicles if powertrain types match both', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { powertrainTypes: ['BEV', 'ICE'] },
  });
  expect(data.compatibleVehicles.length).toEqual(2);
});
it('Only returns vehicles that match BEV powertrain types', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { powertrainTypes: ['BEV'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].make).toEqual('Tesla');
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].make).toEqual('Ford');
});
it('Only returns vehicles that match ICE powertrain types', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { powertrainTypes: ['ICE'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].make).toEqual('Ford');
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].make).toEqual('Tesla');
});
it('Returns no vehicles if there are no matching powertrain types', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { powertrainTypes: ['HEV'] },
  });
  expect(data.compatibleVehicles.length).toEqual(0);
  expect(data.incompatibleVehicles.length).toEqual(2);
});
