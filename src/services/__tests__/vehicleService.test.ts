import { fetchVehiclesWithTransformation } from '../vehicleService';
import { fetchVehicles, fetchDeviceDefinition } from '../identityService';

jest.mock('@dimo-network/transactions', () => ({
  ENVIRONMENT: 'mock',
  // add more mocked exports if needed
}));
jest.mock('../identityService');

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
              imageURI: 'http://image.url',
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
              imageURI: 'http://image.url',
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
  (fetchDeviceDefinition as jest.Mock).mockImplementation((deviceDefinitionId) => {
    if (deviceDefinitionId === 'tesla_model_3_2019') {
      return Promise.resolve({
        deviceDefinition: {
          attributes: [
            {
              name: 'powertrain_type',
              value: 'BEV',
            },
          ],
        },
      });
    }
    if (deviceDefinitionId === 'ford_bronco_2023') {
      return Promise.resolve({
        deviceDefinition: {
          attributes: [
            {
              name: 'powertrain_type',
              value: 'ICE',
            },
          ],
        },
      });
    }
  });
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
it('Returns vehicles with the correct shape in compatible and incompatible arrays', async () => {
  const data = await fetchVehiclesWithTransformation({
    ownerAddress: 'address',
    targetGrantee: 'grantee',
    cursor: '',
    direction: '',
    filters: {},
  });
  data.compatibleVehicles.forEach((vehicle) => {
    expect(vehicle).toEqual(
      expect.objectContaining({
        tokenId: expect.any(Number),
        imageURI: expect.anything(),
        shared: expect.any(Boolean),
        expiresAt: expect.any(String),
        make: expect.any(String),
        model: expect.any(String),
        year: expect.any(Number),
      }),
    );
  });
});
it('Returns incompatible vehicles with the correct shape when no compatible vehicles are found with multiple filters', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleMakes: ['Tesla'], powertrainTypes: ['ICE'] },
  });
  expect(data.compatibleVehicles.length).toEqual(0);
  expect(data.incompatibleVehicles.length).toEqual(2);
  data.incompatibleVehicles.forEach((vehicle) => {
    expect(vehicle).toEqual(
      expect.objectContaining({
        tokenId: expect.any(Number),
        imageURI: expect.anything(),
        shared: expect.any(Boolean),
        expiresAt: expect.any(String),
        make: expect.any(String),
        model: expect.any(String),
        year: expect.any(Number),
      })
    );
  });
});
it('Returns vehicles that match both make and powertrain type filters', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleMakes: ['Tesla'], powertrainTypes: ['BEV'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].make).toEqual('Tesla');
  expect(data.compatibleVehicles[0].model).toEqual('Model 3');
  expect(data.compatibleVehicles[0].year).toEqual(2019);
  expect(data.compatibleVehicles[0].tokenId).toEqual(1);
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].make).toEqual('Ford');
});
it('Returns no vehicles if make and powertrain type filters do not overlap', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleMakes: ['Tesla'], powertrainTypes: ['ICE'] },
  });
  expect(data.compatibleVehicles.length).toEqual(0);
  expect(data.incompatibleVehicles.length).toEqual(2);
});
it('Returns vehicles that match both tokenId and powertrain type filters', async () => {
  const data = await fetchVehiclesWithTransformation({
    cursor: '',
    direction: '',
    ownerAddress: '',
    targetGrantee: '',
    filters: { vehicleTokenIds: ['2'], powertrainTypes: ['ICE'] },
  });
  expect(data.compatibleVehicles.length).toEqual(1);
  expect(data.compatibleVehicles[0].tokenId).toEqual(2);
  expect(data.compatibleVehicles[0].make).toEqual('Ford');
  expect(data.compatibleVehicles[0].model).toEqual('Bronco');
  expect(data.compatibleVehicles[0].year).toEqual(2023);
  expect(data.incompatibleVehicles.length).toEqual(1);
  expect(data.incompatibleVehicles[0].tokenId).toEqual(1);
});

