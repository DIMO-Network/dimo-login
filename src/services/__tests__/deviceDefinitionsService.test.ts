import { vehicleNameFromDefinitionId } from '../deviceDefinitionsService';

describe('vehicleNameFromDefinitionId', () => {
  it('puts the year first, as vehicle names do', () => {
    expect(vehicleNameFromDefinitionId('ford_bronco_2021')).toBe('2021 Ford Bronco');
    expect(vehicleNameFromDefinitionId('tesla_model-3_2021')).toBe('2021 Tesla Model-3');
  });

  it('leaves a model number alone when the id has no year', () => {
    expect(vehicleNameFromDefinitionId('peugeot_3008')).toBe('Peugeot 3008');
    expect(vehicleNameFromDefinitionId('peugeot_3008_2021')).toBe('2021 Peugeot 3008');
  });
});
