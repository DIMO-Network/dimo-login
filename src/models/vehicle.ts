import { fetchDeviceDefinition, VehicleNode } from '../services';

export interface Vehicle {
  tokenId: string;
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
  private clientId: string;

  constructor(vehicleNode: VehicleNode, clientId: string) {
    this.vehicleNode = vehicleNode;
    this.clientId = clientId;
  }

  getTokenIdMatch(tokenId: string): boolean {
    return tokenId === this.vehicleNode.tokenId.toString();
  }

  getMakeMatch(make: string): boolean {
    return make.toLowerCase() === this.vehicleNode.definition.make.toLowerCase();
  }

  get tokenId() {
    return this.vehicleNode.tokenId;
  }

  get imageURI(): string {
    return this.vehicleNode.imageURI;
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

  get sacd() {
    return this.vehicleNode.sacds.nodes.find((it) => it.grantee === this.clientId);
  }

  get isShared(): boolean {
    return Boolean(this.sacd);
  }

  get expiresAt() {
    if (this.sacd) {
      return this.sacd.expiresAt;
    }
    return '';
  }

  async getPowertrainTypeMatch(powertrainTypes: string[]): Promise<boolean> {
    const result = await fetchDeviceDefinition(this.vehicleNode.definition.id);
    if (result.deviceDefinition.attributes) {
      const powertrainType = result.deviceDefinition.attributes?.find(
        (it) => it.name === 'powertrain_type',
      );
      if (powertrainType) {
        return powertrainTypes
          .map((val) => val.toLowerCase())
          .includes(powertrainType.value.toLowerCase());
      }
    }
    return false;
  }
}
