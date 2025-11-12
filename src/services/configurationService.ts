export interface Configuration {
  id: string;
  client_id: string;
  configuration: Record<string, string | number | boolean>;
}

export async function getConfigurationById(
  configurationId: string,
): Promise<Configuration> {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_DEVELOPER_CONSOLE_URL}/api/configurations/${configurationId}`,
    );

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const remoteConfiguration: { configuration: Configuration } = await response.json();

    return remoteConfiguration.configuration;
  } catch (e: unknown) {
    console.error(e);
    throw e;
  }
}
