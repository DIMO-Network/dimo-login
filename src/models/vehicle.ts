export interface Vehicle {
  tokenId: BigInt;
  imageURI: string;
  make: string;
  model: string;
  year: number;
  shared: boolean;
}