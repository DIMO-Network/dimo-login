import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { fetchWithTimeout } from '../utils/withTimeout';

const IDENTITY_API_URL =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

const IDENTITY_TIMEOUT_MS = 30_000;

// Without a timeout a hung identity-api query stalls validateCredentials /
// useFetchVehicles indefinitely, leaving the corresponding loader spinning.
export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: IDENTITY_API_URL,
    fetch: (input, init) => fetchWithTimeout(input as RequestInfo | URL, init, IDENTITY_TIMEOUT_MS),
  }),
  cache: new InMemoryCache(),
});
