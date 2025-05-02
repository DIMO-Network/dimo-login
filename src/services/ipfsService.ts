export async function fetchConfigFromIPFS(
  cid: string,
): Promise<Record<string, string | number | boolean>> {
  try {
    const baseUrl = `https://${cid}.ipfs.w3s.link/`;
    const response = await fetch(`${baseUrl}config.json`);

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
