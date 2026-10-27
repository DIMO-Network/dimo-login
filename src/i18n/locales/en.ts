/**
 * English copy, the source of truth for keys and `{{params}}`. Japanese
 * (ja.ts) must have every key; locales.test.ts checks they match.
 *
 * Keys are flat, dot-namespaced and snake_case, as in DIMO Driver. Plurals use
 * i18next suffixes (`_one`, `_other`); Japanese has only `_other`. Tags such
 * as `<terms>…</terms>` are filled by <Trans> with links.
 */
const en = {
  // App shell
  'app.document_title': 'Login with DIMO',
  'app.document_title_brand': 'Sign in with {{name}}',
  'app.logo_alt': '{{name}} logo',
  'app.language': 'Language',

  // Shared actions and words
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.continue': 'Continue',
  'common.close': 'Close',
  'common.clear': 'Clear',
  'common.try_again': 'Try again',
  'common.log_out': 'Log out',
  'common.back_to_app': 'Back to {{appName}}',
  'common.select_placeholder': 'Select',
  'common.search_placeholder': 'Type to search…',
  'common.app_developer_fallback': 'the application developer',
  'common.error_detail': 'Details: {{detail}}',

  // Loading
  'loading.waiting_for_credentials': 'Waiting for credentials…',
  'loading.still_working': 'Still working…',
  'loading.almost_there': 'Hang tight, almost there',

  // Sign-in titles
  'signin.title_brand': 'Sign in with {{brandName}}',
  'signin.title_default': '{{appName}} uses DIMO to connect to your cars',
  'signin.title_alt': 'Log in to {{appName}} with DIMO',

  // Email
  'email.invalid': 'Please enter a valid email',
  'email.sharing_required':
    'Email sharing is required to continue. Please check the box.',
  'email.share_with_app': 'I agree to share my email with {{appName}}',

  // Legal notice
  'legal.notice_brand':
    'By continuing you agree to {{brandName}}’s <privacy>Privacy Policy</privacy> and <terms>Terms of Service</terms>',
  'legal.notice':
    'By continuing you agree to our <privacy>Privacy Policy</privacy> and <terms>Terms of Service</terms>',

  // Configuration errors shown before any flow starts
  'error.missing_client_id.title': 'Missing client ID',
  'error.missing_client_id.message':
    'The app didn’t send a client ID. Please contact the app’s developer.',
  'error.missing_redirect_uri.title': 'Missing redirect URI',
  'error.missing_redirect_uri.message':
    'The app didn’t send a redirect URI. Please ask {{appName}} to set up a valid redirect URI.',
  'error.invalid_credentials.title': 'Invalid app credentials',
  'error.invalid_credentials.message':
    'There’s a problem with this app’s credentials. It may not be set up or registered correctly. Please contact the app’s support team.',
  'error.missing_transaction_data.title': 'Missing transaction data',
  'error.missing_transaction_data.message':
    'The app didn’t send a transaction to sign. Check the configuration and reload.',
  'error.missing_message_data.title': 'Missing message data',
  'error.missing_message_data.message':
    'The app didn’t send a message to sign. Check the configuration and reload.',
  'error.invalid_message.title': 'Invalid message',
  'error.invalid_message.message': 'The message to sign must be a non-empty string.',
  'error.invalid_hash.title': 'Invalid hash',
  'error.invalid_hash.message': 'A hex message must be a 0x-prefixed 32-byte hash.',
  'error.missing_permissions.title': 'Missing permissions',
  'error.missing_permissions.message': 'The app didn’t say which permissions it needs.',
  'error.invalid_permissions_format.title': 'Invalid permissions format',
  'error.invalid_permissions_format.message':
    'Permissions must be a string of 0s and 1s, at most {{max}} characters long.',

  // Why a shared vehicle's current terms couldn't be carried into an update
  'grant_unreadable.retry':
    'Couldn’t read the current sharing terms for {{vehicle}}. Try again.',
  'grant_unreadable.unknown_permissions':
    'Couldn’t read the current sharing terms for {{vehicle}}. They use permissions this version of DIMO can’t carry over.',
  'grant_unreadable.unverified_storage':
    'Couldn’t read the current sharing terms for {{vehicle}}. They’re stored somewhere DIMO can’t verify.',
  'grant_unreadable.other_app':
    'Couldn’t read the current sharing terms for {{vehicle}}. They don’t match this app.',
  'vehicle.fallback_name': 'vehicle {{tokenId}}',

  // Permissions, as people see them. Keys follow the SDK's Permission enum.
  'permission.GetNonLocationHistory.label': 'Vehicle data',
  'permission.GetNonLocationHistory.description':
    'Odometer, fuel, battery and other readings. No location.',
  'permission.ExecuteCommands.label': 'Lock and unlock',
  'permission.ExecuteCommands.description': 'Lock and unlock your vehicle remotely.',
  'permission.ExecuteCommands.caution': 'Can control your vehicle',
  'permission.GetCurrentLocation.label': 'Current location',
  'permission.GetCurrentLocation.description': 'Where your vehicle is right now.',
  'permission.GetLocationHistory.label': 'Location history',
  'permission.GetLocationHistory.description':
    'Where your vehicle has been, including past trips.',
  'permission.GetVINCredential.label': 'Credentials',
  'permission.GetVINCredential.description':
    'Verified records about your vehicle, such as its VIN.',
  'permission.GetLiveData.label': 'Live data',
  'permission.GetLiveData.description': 'Readings from your vehicle as they happen.',
  'permission.GetRawData.label': 'Raw data',
  'permission.GetRawData.description': 'Unprocessed data straight from your vehicle.',
  'permission.GetApproximateLocation.label': 'Approximate location',
  'permission.GetApproximateLocation.description':
    'The area your vehicle is in, not its exact spot.',
  'permission.unknown.label': 'Permission {{id}}',

  // Documents (cloudEvent agreements)
  'document.vehicle': 'Vehicle documents',
  'document.vehicle.description':
    'Registration, insurance and other documents for the vehicles you share.',
  'document.driver': 'Driver documents',
  'document.driver.description':
    'Your driver’s license and other documents you’ve added to DIMO.',
  'document.raw_vehicle': 'Original vehicle document files',
  'document.raw_vehicle.description':
    'The photos and PDFs you uploaded for vehicle documents.',
  'document.raw_driver': 'Original driver document files',
  'document.raw_driver.description':
    'The photos and PDFs you uploaded for driver documents.',
  'document.other': 'Other files',

  // Sharing period
  'share_end.until': 'Until {{date}}',
  'share_end.no_end': 'No end date',

  // The sharing contract, as summarized before signing. Display only: the
  // signed document is produced by the transactions SDK.
  'contract.intro':
    'This contract gives permission for specific data access and control functions on the DIMO platform.',
  'contract.agreeing': 'Here’s what you’re agreeing to:',
  'contract.summary': 'Contract Summary:',
  'contract.grantor': '- Grantor: {{email}} (the entity giving permission).',
  'contract.grantee': '- Grantee: {{appName}} (the entity receiving permission).',
  'contract.permissions': 'Permissions Granted: {{permissions}}',
  'contract.files': 'Files Requested: {{files}}',
  'contract.files_none': 'NONE',
  'contract.effective': 'Effective Date: {{date}}',
  'contract.expiration': 'Expiration Date: {{date}}.',
  'contract.details': 'Details:',
  'contract.details_access':
    '- This grant provides the grantee with access to specific vehicle data and control functions as specified above.',
  'contract.details_template':
    '- Created by DIMO Platform, version 1.0 of this contract template.',
  'contract.outro':
    'By signing, both parties agree to these terms and the specified access scope.',
  'contract.attachment': 'Policy attachment',
  'contract.courtesy':
    'This is a courtesy translation. The English version is what you sign.',
  'contract.view_original': 'View in English',
  'contract.view_translation': 'View translation',
  'contract.permission.GetNonLocationHistory':
    'NONLOCATION_TELEMETRY: non-location vehicle data such as fuel levels and odometer.',
  'contract.permission.ExecuteCommands':
    'COMMANDS: ability to send commands to the vehicle such as lock and unlock.',
  'contract.permission.GetCurrentLocation':
    'CURRENT_LOCATION: access to the vehicle current location.',
  'contract.permission.GetLocationHistory':
    'ALLTIME_LOCATION: access to the vehicle full location history.',
  'contract.permission.GetVINCredential':
    'CREDENTIALS: access to any stored credentials and attestations such as insurance and service records.',
  'contract.permission.GetLiveData': 'STREAMS: access to real-time data streams.',
  'contract.permission.GetRawData': 'RAW_DATA: access to raw payload data.',
  'contract.permission.GetApproximateLocation':
    'APPROXIMATE_LOCATION: access to approximate vehicle location.',
} as const;

export default en;
