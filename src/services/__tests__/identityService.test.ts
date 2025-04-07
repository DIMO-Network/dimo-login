import { fetchVehiclesWithTransformation } from '../identityService';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockImplementation(
    jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
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
                    definition: { make: 'Tesla', model: 'Model 3', year: 2019 },
                    sacds: {
                      nodes: [],
                    },
                  },
                  {
                    tokenId: 2,
                    definition: { make: 'Ford', model: 'Bronco', year: 2023 },
                    sacds: {
                      nodes: [],
                    },
                  },
                ],
              },
            },
          }),
      }),
    ) as jest.Mock,
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
export {};
