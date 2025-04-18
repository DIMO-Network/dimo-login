export enum HEADERS {
  DEFAULT = '%s uses DIMO to connect to your cars',
  ALT = 'Login to %s using DIMO',
}


/**
 * Enum representing the policy attachment CIDs (Content Identifiers) by region.
 * 
 * This is used to map specific regions to their corresponding policy attachment CIDs.
 * 
 * @remarks
 * This is for demo purposes. The idea is to have this dynamic in a real-world scenario,
 * where the CIDs could be fetched or configured dynamically instead of being hardcoded.
 */
export enum POLICY_ATTACHMENT_CID_BY_REGION {
  US = 'bafybeihgtdpgnjj3tupbnzat5epidn2hzpvhexmcq24hlukizd4xlgopau',
  EU = 'bafybeidvnxcdrtbb2y4kj5h3wuxzrah4tbazfeob3hnclzdwtvi6htikgu',
}
