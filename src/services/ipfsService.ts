// Renamed file to ipfsService.ts
import axios from 'axios';

export async function fetchConfigFromIPFS(cid: string): Promise<any> {
  try {
    const baseUrl = `https://${cid}.ipfs.w3s.link/`;
    const response = await axios.get(`${baseUrl}config.json`);
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch or parse file with CID ${cid}: ${error.message}`);
    } else {
      throw new Error(`Failed to fetch or parse file with CID ${cid}: Unknown error`);
    }
  }
}
