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
  'loading.waiting_for_credentials': 'Getting things ready…',
  'loading.still_working': 'Still working…',
  'loading.almost_there': 'Hang tight, almost there',

  // Sign-in titles
  'signin.title_brand': 'Sign in with {{brandName}}',
  'signin.title_default': 'Sign in with DIMO',
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
  'error.invalid_credentials.title': 'This app isn’t set up correctly',
  'error.invalid_credentials.message':
    'Its DIMO credentials couldn’t be verified, so you can’t sign in or share from here. Please contact the app’s support team.',
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

  // Signing in
  'signin.subtitle': 'to continue to {{appName}}',
  'signin.returning_title': 'Welcome back',
  'signin.returning_desc': 'Signed in on this device before',
  'signin.email_label': 'Email',
  'signin.email_placeholder': 'you@example.com',
  'signin.continue': 'Continue',
  'signin.continue_as': 'Continue as {{email}}',
  'signin.other_account': 'Use another account',
  'signin.or': 'or',
  'signin.google': 'Continue with Google',
  'signin.apple': 'Continue with Apple',
  'signin.signing_in': 'Signing you in…',
  'signin.error.details': 'Couldn’t get your account details. Try again.',
  'signin.error.oauth': 'Couldn’t finish signing in with Google or Apple. Try again.',
  'signin.error.no_email':
    'That account didn’t share an email address with DIMO. Try another way to sign in.',

  // Passkeys and email codes
  'passkey.title': 'Confirm it’s you',
  'passkey.body': 'Use the passkey for {{email}}: your fingerprint, face or device PIN.',
  'passkey.waiting': 'Waiting for your passkey…',
  'passkey.cta': 'Use passkey',
  'passkey.email_code': 'Email me a code instead',
  'passkey.cancelled': 'The passkey request was closed or timed out.',
  'passkey.error': 'Couldn’t sign in with your passkey. Try again or use an email code.',
  'otp.title': 'Enter the code we emailed you',
  'otp.body':
    'We sent a 6-digit code to {{email}}. It expires in 5 minutes; check your spam folder if you don’t see it.',
  'otp.label': 'Verification code',
  'otp.digit_label': 'Digit {{index}} of 6',
  'otp.verify': 'Verify',
  'otp.verifying': 'Verifying…',
  'otp.resend': 'Send a new code',
  'otp.resent': 'A new code is on its way.',
  'otp.error.send': 'Couldn’t send a code. Try again.',
  'otp.error.verify': 'That code didn’t work. Check it and try again.',
  'create.title': 'Create a passkey',
  'create.body': 'Your DIMO account signs in with a passkey instead of a password.',
  'create.benefit_biometric': 'Sign in with your fingerprint, face or device PIN',
  'create.benefit_nothing_to_remember': 'Nothing to remember or type',
  'create.benefit_phishing': 'Can’t be phished or reused on other sites',
  'create.cta': 'Create passkey',
  'create.creating': 'Creating your account. This can take a minute.',
  'create.error': 'Couldn’t create your account. Try again.',

  // Plain sign-in done, and signing out
  'login_done.title': 'You’re signed in',
  'login_done.body': 'Signed in as {{email}}.',
  'logout.signing_out': 'Signing out…',

  // Email sharing, as a switch row
  'email.share_title': 'Share my email with {{appName}}',
  'email.share_desc': '{{appName}} can use it to contact you.',
  'email.required': 'Required',
  'email.required_hint':
    '{{appName}} needs your email. Turn on email sharing to continue.',
  'email.required_hint_below':
    '{{appName}} needs your email. Turn on email sharing below to continue.',

  // Sharing vehicles
  'share.title': '{{appName}} wants access to your vehicles',
  'share.access_label': 'Access requested',
  'share.also_asks': 'Now also asks for {{list}}',
  'share.stop_anytime': 'Stop anytime in the DIMO app',
  'share.details': 'Details',
  'share.details_label': 'What’s included and full terms',
  'share.vehicles_heading': 'Your vehicles',
  'share.select_all': 'Select all',
  'share.select_page': 'Select page',
  'share.deselect_all': 'Deselect all',
  'share.group.ready': 'Ready to share',
  'share.group.shared': 'Already shared',
  'share.group.unsupported': 'Can’t be shared',
  'share.add_vehicle': 'Add a vehicle',
  'share.unsupported.vehicles': '{{appName}} asked for specific vehicles only.',
  'share.unsupported.makes': '{{appName}} works only with {{makes}} vehicles.',
  'share.unsupported.powertrains':
    '{{appName}} works only with {{powertrains}} vehicles.',
  'share.unsupported.makes_powertrains':
    '{{appName}} works only with {{powertrains}} vehicles from {{makes}}.',
  'share.cta.select': 'Select a vehicle',
  'share.cta.share_one': 'Share 1 vehicle',
  'share.cta.share_other': 'Share {{count}} vehicles',
  'share.cta.update_one': 'Update 1 vehicle',
  'share.cta.update_other': 'Update {{count}} vehicles',
  'share.cta.mixed': 'Share {{share}} · Update {{update}}',
  'share.hint.select': 'Choose at least one vehicle to share.',
  'share.sharing': 'Sharing…',
  'share.keep_open':
    'Keep this window open until sharing is done. It takes a few seconds per vehicle.',
  'share.error.title': 'Couldn’t share your vehicles',
  'share.error.body': 'Nothing was shared. Check your connection and try again.',
  'share.load_error.title': 'Couldn’t load your vehicles',
  'share.load_error.body': 'Check your connection and try again.',
  'share.empty.title': 'No vehicles connected yet',
  'share.empty.body': 'Connect a vehicle in the DIMO app, then come back to share it.',
  'share.all_shared.title': 'All your vehicles are already shared',
  'share.all_shared.body':
    'There’s nothing new to share. You can manage each vehicle below.',
  'store.app_store': 'App Store',
  'store.google_play': 'Google Play',
  'pager.page': 'Page {{page}}',
  'pager.previous': 'Previous',
  'pager.next': 'Next',

  // Powertrains, as they fit share.unsupported.* ("… with electric vehicles")
  'powertrain.BEV': 'electric',
  'powertrain.PHEV': 'plug-in hybrid',
  'powertrain.HEV': 'hybrid',
  'powertrain.ICE': 'gas',
  'powertrain.FCEV': 'hydrogen fuel cell',

  // A vehicle in a list
  'vehicle.name': '{{make}} {{model}} {{year}}',
  'vehicle.id': 'ID {{id}}',
  'vehicle.not_shared': 'Not shared yet',
  'vehicle.shared_until': 'Shared until {{date}}',
  'vehicle.shared_no_end': 'Shared, no end date',
  'vehicle.needs_update': 'Needs update',
  'vehicle.adds': 'Adds {{list}}',
  'vehicle.unsupported': 'Not supported by this app',
  'vehicle.checking': 'Checking sharing terms…',
  'vehicle.manage': 'Manage',
  'vehicle.manage_label': 'Manage sharing for {{vehicle}}',
  'chip.new': 'New',
  'chip.updated': 'Updated',
  'chip.stopped': 'Stopped',
  'chip.not_updated': 'Not updated',

  // The terms sheet behind "Details"
  'terms.title': 'What’s included',
  'terms.access': 'Access',
  'terms.duration': 'How long',
  'terms.duration_until':
    'Access ends on {{date}}. You can stop sharing sooner at any time.',
  'terms.duration_no_end':
    'Access has no end date. You can stop sharing anytime in the DIMO app.',
  'terms.full': 'Full terms',

  // Managing one shared vehicle
  'manage.status': 'Shared with {{appName}}',
  'manage.until': 'Until {{date}}',
  'manage.no_end': 'No end date',
  'manage.access_heading': 'What {{appName}} can access',
  'manage.update_title': '{{appName}} is asking for more access',
  'manage.update_body': 'Updating adds {{list}}. Everything else stays the same.',
  'manage.update_note': 'After the update it stays shared until {{date}}.',
  'manage.update_note_no_end': 'After the update it stays shared with no end date.',
  'manage.extend_note': 'Extending keeps this vehicle shared until {{date}}.',
  'manage.no_end_note': 'Shared with no end date. Stop sharing whenever you like.',
  'manage.extend': 'Extend 1 year',
  'manage.update': 'Update permissions',
  'manage.stop': 'Stop sharing',
  'manage.busy.revoke': 'Stopping…',
  'manage.busy.extend': 'Extending…',
  'manage.busy.update': 'Updating…',
  'manage.error.title': 'Couldn’t change sharing',
  'manage.error.body': 'Nothing changed. Check your connection and try again.',
  'stop.title': 'Stop sharing this vehicle?',
  'stop.body':
    '{{appName}} will lose access to your {{vehicle}}. You can share it again anytime.',
  'stop.confirm': 'Stop sharing',
  'stop.keep': 'Keep sharing',

  // Done screens after sharing
  'success.shared_title_one': 'Shared 1 vehicle with {{appName}}',
  'success.shared_title_other': 'Shared {{count}} vehicles with {{appName}}',
  'success.shared_body_one': '{{appName}} can access it until {{date}}.',
  'success.shared_body_other': '{{appName}} can access them until {{date}}.',
  'success.shared_body_no_end_one': '{{appName}} can access it until you stop sharing.',
  'success.shared_body_no_end_other':
    '{{appName}} can access them until you stop sharing.',
  'success.updated_title_one': 'Updated sharing for 1 vehicle',
  'success.updated_title_other': 'Updated sharing for {{count}} vehicles',
  'success.updated_body': '{{appName}} now has the access it asked for.',
  'success.extended_title': 'Sharing extended',
  'success.extended_body':
    'Your {{vehicle}} stays shared with {{appName}} until {{date}}.',
  'success.stopped_title': 'Sharing stopped',
  'success.stopped_body': '{{appName}} no longer has access to your {{vehicle}}.',
  'success.skipped_title_one': '1 vehicle wasn’t updated',
  'success.skipped_title_other': '{{count}} vehicles weren’t updated',
  'success.skipped_body_one':
    'It’s still shared as before. You can update it later from the vehicle list.',
  'success.skipped_body_other':
    'They’re still shared as before. You can update them later from the vehicle list.',
  // Sharing account documents
  'docs.title': '{{appName}} wants access to your documents',
  'docs.allow': 'Allow access',
  'docs.error.title': 'Couldn’t share your documents',
  'docs.error.body': 'Nothing was shared. Check your connection and try again.',
  'success.docs_title': 'Documents shared with {{appName}}',
  'success.docs_body': '{{appName}} can see your driver documents until {{date}}.',
  'success.docs_body_no_end':
    '{{appName}} can see your driver documents until you stop sharing.',
  // Transactions and message signing
  'tx.title': 'Approve a transaction',
  'tx.warning_title': 'Only approve if you trust {{appName}}',
  'tx.warning_body':
    '{{host}} is asking you to sign a non-standard transaction from your DIMO account.',
  'tx.function': 'Function',
  'tx.parameters': 'Parameters',
  'tx.none': 'None',
  'tx.address': 'Contract',
  'tx.value': 'Value',
  'tx.approve': 'Approve',
  'tx.approving': 'Approving…',
  'tx.reject': 'Reject',
  'tx.error': 'Couldn’t complete the transaction. Try again.',
  'tx.done_title': 'Transaction complete',
  'tx.done_body': 'It went through and {{appName}} has the details.',
  'tx.view': 'View transaction',
  'tx.missing.title': 'Transaction not completed',
  'tx.missing.body': 'There’s no transaction to show. It may not have gone through.',
  'sign.title': 'Sign a message',
  'sign.warning_title': 'Only sign if you trust {{appName}}',
  'sign.warning_body':
    '{{host}} is asking you to sign a message. The signature proves you control this DIMO account.',
  'sign.message': 'Message',
  'sign.hash': 'Hash',
  'sign.show_full': 'Show full message',
  'sign.show_less': 'Show less',
  'sign.sign': 'Sign',
  'sign.signing': 'Signing…',
  'sign.error': 'Couldn’t sign the message. Try again.',
  'sign.done_title': 'Message signed',
  'sign.done_body': '{{appName}} has the signature.',
  'sign.copy': 'Copy signature',
  'sign.copied': 'Copied',
  'sign.missing.title': 'Message not signed',
  'sign.missing.body':
    'There’s no signature to show. The message may not have been signed.',
  'cancelled.title': 'Request cancelled',
  'cancelled.body': 'Nothing was shared or signed. You can close this window.',

  // Developer license setup
  'license.title': 'Developer license',
  'license.subtitle': 'Setting up API access for {{appName}}',
  'license.step.mint': 'Mint developer license',
  'license.step.register': 'Register API key and redirect URI',
  'license.status.starting': 'Setting up your developer license…',
  'license.status.minting': 'Step 1 of 2: minting your developer license…',
  'license.status.registering': 'Step 2 of 2: registering the API key and redirect URI…',
  'license.status.generating': 'Generating your API key…',
  'license.status.done': 'Done',
  'license.existing.subtitle': 'You already have a developer license',
  'license.existing.body':
    'Your account already has a developer license ({{clientId}}). Do you have an API key for it?',
  'license.existing.has_key': 'Yes, I have my API key',
  'license.existing.new_key': 'No, generate a new API key',
  'license.error': 'Couldn’t finish setting up the developer license.',

  // Adding a vehicle
  'add.title': 'Add a vehicle',
  'add.tabs_label': 'Find the vehicle by',
  'add.tab.make_model': 'Make, model, year',
  'add.tab.vin': 'VIN',
  'add.make_model': 'Make and model',
  'add.make_model_placeholder': 'Ford Bronco',
  'add.year': 'Model year',
  'add.country': 'Country where the vehicle is',
  'add.vin': 'VIN (vehicle identification number)',
  'add.vin_placeholder': '1N6AD0EVXCC459517',
  'add.check': 'Check compatibility',
  'compat.checking': 'Checking compatibility…',
  'compat.supported': 'Your {{vehicle}} is supported',
  'compat.unsupported': 'Your {{vehicle}} isn’t supported',
  'compat.unsupported_generic': 'This vehicle isn’t supported',
  'compat.supported_body': 'Connect it next, then share it with {{appName}}.',
  'compat.unsupported_body': 'DIMO can’t connect this vehicle yet. Try another one.',
  'compat.add': 'Add this vehicle',
  'compat.try_another': 'Try another vehicle',
  'device.title': 'Connect your {{vehicle}}',
  'device.body':
    'This vehicle needs a DIMO adapter to connect to {{appName}}. Adapters are set up in the DIMO mobile app.',
  'device.image_alt': 'DIMO adapter',
  'device.open_app': 'Open the DIMO app',
  'device.shop': 'Shop adapters',
  'device.later': 'Later',
  'mint.creating': 'Creating your vehicle…',
  'mint.failed.title': 'Couldn’t add your vehicle',
  'mint.failed.body': 'Try again from your vehicle list, or add it in the DIMO app.',
  'mint.failed.cta': 'Back to your vehicles',

  // Connecting a Tesla
  'tesla.authorize.title': 'Authorize your Tesla account',
  'tesla.needs_access':
    '{{appName}} needs access to your Tesla’s data to provide its service.',
  'tesla.perm.info': 'Vehicle information',
  'tesla.perm.location': 'Vehicle location',
  'tesla.perm.profile': 'Profile',
  'tesla.perm.commands': 'Vehicle commands',
  'tesla.perm.charging': 'Charging management',
  'tesla.required': 'Required',
  'tesla.recommended': 'Recommended',
  'tesla.authorize.cta': 'Continue to Tesla',
  'tesla.key.title': 'Add the virtual key',
  'tesla.key.body':
    'The virtual key encrypts data end to end, sends updates more often and lets you send commands from your phone.',
  'tesla.key.remove':
    'You can remove it anytime in the Tesla app. <learn>Learn more</learn>',
  'tesla.key.vin': 'VIN {{vin}}',
  'tesla.key.cta': 'Set up the virtual key',
  'tesla.waiting.title': 'Waiting for the virtual key',
  'tesla.waiting.body': 'Finish adding the key in the Tesla app, then come back here.',
  'tesla.waiting.cta': 'I’ve added the virtual key',
  'tesla.done.title': 'Setup complete',
  'tesla.done.body':
    'Your Tesla is connected. {{appName}} can now use its data and commands.',
  'tesla.done.cta': 'Done',
  'tesla.checking': 'Checking Tesla permissions…',
  'tesla.finalizing': 'Finishing setup…',

  'done.next': 'You can change or stop sharing anytime in the DIMO app.',
  'app.powered_by': 'Powered by DIMO',

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
