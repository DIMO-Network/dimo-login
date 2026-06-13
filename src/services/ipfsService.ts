import { fetchWithTimeout } from '../utils/withTimeout';

// IPFS gateways are frequently slow/unresponsive; bound the wait so a stuck
// gateway can't hang the popup before the postMessage handshake even starts.
const IPFS_TIMEOUT_MS = 15_000;

export async function fetchConfigFromIPFS(
  cid: string,
): Promise<Record<string, string | number | boolean>> {
  try {
    const baseUrl = `https://${cid}.ipfs.w3s.link/`;
    const response = await fetchWithTimeout(`${baseUrl}config.json`, {}, IPFS_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch or parse file with CID ${cid}: ${error.message}`);
    } else {
      throw new Error(`Failed to fetch or parse file with CID ${cid}: Unknown error`);
    }
  }
}
