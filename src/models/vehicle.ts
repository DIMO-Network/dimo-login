import { fetchDeviceDefinition, VehicleNode } from '../services';

export interface Vehicle {
  tokenId: number;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
  expiresAt: string;
}

export interface VehicleResponse {
  compatibleVehicles: Vehicle[];
  incompatibleVehicles: Vehicle[];
  hasNextPage: boolean;
  endCursor: string;
  hasPreviousPage: boolean;
  startCursor: string;
}

export interface MintVehicleVariables {
  owner: `0x${string}`;
  manufacturerNode: number;
  deviceDefinitionID: string;
  make: string;
  model: string;
  year: string;
  imageURI: string;
  permissions: BigInt;
}

export class LocalVehicle {
  private vehicleNode: VehicleNode;

  constructor(vehicleNode: VehicleNode) {
    this.vehicleNode = vehicleNode;
  }

  get tokenId() {
    return this.vehicleNode.tokenId;
  }

  get make() {
    return this.vehicleNode.definition.make;
  }

  get model() {
    return this.vehicleNode.definition.model;
  }

  get year() {
    return this.vehicleNode.definition.year;
  }

  get definitionId() {
    return this.vehicleNode.definition.id;
  }

  sacdForGrantee(grantee: string) {
    return this.vehicleNode.sacds.nodes.find((sacd) => sacd.grantee === grantee);
  }

  normalize() {
    return {
      tokenId: this.tokenId,
      imageURI: this.vehicleNode.imageURI,
      make: this.make,
      model: this.model,
      year: this.year,
    };
  }

  async getPowertrainType() {
    const queryResult = await fetchDeviceDefinition(this.definitionId);
    const powertrainType = queryResult.deviceDefinition.attributes?.find(
      (att) => att.name === 'powertrain_type',
    );
    return powertrainType ? powertrainType.value : null;
  }
}
