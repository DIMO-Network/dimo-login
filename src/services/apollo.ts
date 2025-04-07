import { ApolloClient, InMemoryCache } from '@apollo/client';

const IDENTITY_API_URL =
  process.env.REACT_APP_DIMO_IDENTITY_URL || 'https://identity-api.dev.dimo.zone/query';

export const apolloClient = new ApolloClient({
  uri: IDENTITY_API_URL,
  cache: new InMemoryCache(),
});
