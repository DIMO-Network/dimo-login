import { Permission } from '@dimo-network/transactions';

import { fetchDeviceDefinition, VehicleNode } from '../services';

export interface Vehicle {
  tokenId: number;
  tokenDID: string;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
  expiresAt: string;
  permissions: string;
  // ipfs:// URI of the grant's signed SACD document, when shared.
  source?: string;
  // The grant's expiry as identity-api returns it (ISO), unlike the display
  // string in expiresAt.
  grantExpiresAt?: string;
  // Whether the grant already includes the requested file agreements;
  // undefined when no files are requested or it couldn't be determined.
  documentAccess?: boolean;
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
  permissions: Permission[];
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

  getSacdForGrantee(grantee: `0x${string}` | null) {
    // Addresses can arrive in different cases (checksummed vs lowercase); a
    // miss would treat a shared vehicle as new and overwrite its grant.
    const wanted = grantee?.toLowerCase();
    return this.vehicleNode.sacds.nodes.find(
      (sacd) => !!wanted && sacd.grantee.toLowerCase() === wanted,
    );
  }

  normalize() {
    return {
      tokenId: this.tokenId,
      tokenDID: this.vehicleNode.tokenDID,
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
