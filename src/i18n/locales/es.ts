import type { PluralLocaleResources } from '../types';

/**
 * Spanish copy: neutral and Latin American-leaning, using tú, with the terms
 * DIMO Driver's Spanish uses (clave de acceso, correo electrónico, compartir,
 * dejar de compartir, historial de ubicaciones). App names, brand names,
 * vehicle names and email addresses stay as they are. Spanish has `_one` and
 * `_other` plurals, plus `_many` for round millions ("1.000.000 de vehículos").
 */
const es: PluralLocaleResources = {
  // App shell
  'app.document_title': 'Iniciar sesión con DIMO',
  'app.document_title_brand': 'Iniciar sesión con {{name}}',
  'app.logo_alt': 'Logotipo de {{name}}',
  'app.language': 'Idioma',

  // Shared actions and words
  'common.back': 'Atrás',
  'common.cancel': 'Cancelar',
  'common.continue': 'Continuar',
  'common.close': 'Cerrar',
  'common.clear': 'Borrar',
  'common.try_again': 'Intentar de nuevo',
  'common.log_out': 'Cerrar sesión',
  'common.back_to_app': 'Volver a {{appName}}',
  'common.select_placeholder': 'Seleccionar',
  'common.search_placeholder': 'Escribe para buscar…',
  'common.app_developer_fallback': 'el desarrollador de la app',
  'common.error_detail': 'Detalles: {{detail}}',

  // Loading
  'loading.waiting_for_credentials': 'Preparando todo…',
  'loading.still_working': 'Seguimos trabajando…',
  'loading.almost_there': 'Un momento, ya casi terminamos',

  // Sign-in titles
  'signin.title_brand': 'Iniciar sesión con {{brandName}}',
  'signin.title_default': 'Iniciar sesión con DIMO',
  'signin.title_alt': 'Iniciar sesión en {{appName}} con DIMO',

  // Email
  'email.invalid': 'Ingresa un correo electrónico válido',

  // Legal notice
  'legal.notice_brand':
    'Al continuar, aceptas la <privacy>Política de privacidad</privacy> y los <terms>Términos del servicio</terms> de {{brandName}}',
  'legal.notice':
    'Al continuar, aceptas nuestra <privacy>Política de privacidad</privacy> y nuestros <terms>Términos del servicio</terms>',

  // Configuration errors shown before any flow starts
  'error.missing_client_id.title': 'Falta el ID de cliente',
  'error.missing_client_id.message':
    'La app no envió un ID de cliente. Comunícate con el desarrollador de la app.',
  'error.missing_redirect_uri.title': 'Falta la URI de redirección',
  'error.missing_redirect_uri.message':
    'La app no envió una URI de redirección. Pide a {{appName}} que configure una URI de redirección válida.',
  'error.untrusted_return.title': 'Este inicio de sesión no se puede completar aquí',
  'error.untrusted_return.message':
    'No se inició en esta ventana. Vuelve a la app e inicia sesión desde allí.',
  'error.untrusted_caller.title': 'Esta página no puede abrir este inicio de sesión',
  'error.untrusted_caller.message':
    'Solo el sitio de {{appName}} puede abrirlo. Ve a {{appName}} y empieza desde allí.',
  'error.invalid_credentials.title': 'Esta app no está configurada correctamente',
  'error.invalid_credentials.message':
    'No se pudieron verificar sus credenciales de DIMO, así que no puedes iniciar sesión ni compartir desde aquí. Comunícate con el equipo de soporte de la app.',
  'error.missing_transaction_data.title': 'Faltan los datos de la transacción',
  'error.missing_transaction_data.message':
    'La app no envió una transacción para firmar. Revisa la configuración y vuelve a cargar la página.',
  'error.missing_message_data.title': 'Faltan los datos del mensaje',
  'error.missing_message_data.message':
    'La app no envió un mensaje para firmar. Revisa la configuración y vuelve a cargar la página.',
  'error.invalid_message.title': 'Mensaje no válido',
  'error.invalid_message.message':
    'El mensaje para firmar debe ser un texto que no esté vacío.',
  'error.invalid_hash.title': 'Hash no válido',
  'error.invalid_hash.message':
    'Un mensaje hexadecimal debe ser un hash de 32 bytes con el prefijo 0x.',
  'error.missing_permissions.title': 'Faltan los permisos',
  'error.missing_permissions.message': 'La app no indicó qué permisos necesita.',
  'error.invalid_permissions_format.title': 'Formato de permisos no válido',
  'error.invalid_permissions_format.message':
    'Los permisos deben ser una cadena de 0 y 1 de {{max}} caracteres como máximo.',

  // Why a shared vehicle's current terms couldn't be carried into an update
  'grant_unreadable.retry':
    'No se pudieron leer las condiciones actuales con las que compartes {{vehicle}}. Inténtalo de nuevo.',
  'grant_unreadable.unknown_permissions':
    'No se pudieron leer las condiciones actuales con las que compartes {{vehicle}}. Usan permisos que esta versión de DIMO no puede conservar.',
  'grant_unreadable.unverified_storage':
    'No se pudieron leer las condiciones actuales con las que compartes {{vehicle}}. Están guardadas en un lugar que DIMO no puede verificar.',
  'grant_unreadable.other_app':
    'No se pudieron leer las condiciones actuales con las que compartes {{vehicle}}. No corresponden a esta app.',
  'vehicle.fallback_name': 'vehículo {{tokenId}}',

  // Permissions, as people see them. Keys follow the SDK's Permission enum.
  'permission.GetNonLocationHistory.label': 'Datos del vehículo',
  'permission.GetNonLocationHistory.description':
    'Odómetro, combustible, batería y otras lecturas. Sin ubicación.',
  'permission.ExecuteCommands.label': 'Bloquear y desbloquear',
  'permission.ExecuteCommands.description':
    'Bloquea y desbloquea tu vehículo a distancia.',
  'permission.ExecuteCommands.caution': 'Puede controlar tu vehículo',
  'permission.GetCurrentLocation.label': 'Ubicación actual',
  'permission.GetCurrentLocation.description': 'Dónde está tu vehículo en este momento.',
  'permission.GetLocationHistory.label': 'Historial de ubicaciones',
  'permission.GetLocationHistory.description':
    'Dónde ha estado tu vehículo, incluidos los viajes anteriores.',
  'permission.GetVINCredential.label': 'Credenciales',
  'permission.GetVINCredential.description':
    'Registros verificados de tu vehículo, como su VIN.',
  'permission.GetLiveData.label': 'Datos en vivo',
  'permission.GetLiveData.description': 'Lecturas de tu vehículo en tiempo real.',
  'permission.GetRawData.label': 'Datos sin procesar',
  'permission.GetRawData.description': 'Los datos tal como los envía tu vehículo.',
  'permission.GetApproximateLocation.label': 'Ubicación aproximada',
  'permission.GetApproximateLocation.description':
    'La zona donde está tu vehículo, no su ubicación exacta.',
  'permission.unknown.label': 'Permiso {{id}}',

  // Documents (cloudEvent agreements)
  'document.vehicle': 'Documentos del vehículo',
  'document.vehicle.description':
    'Registro, seguro y otros documentos de los vehículos que compartes.',
  'document.driver': 'Documentos de conductor',
  'document.driver.description':
    'Tu licencia de conducir y otros documentos que agregaste a DIMO.',
  'document.raw_vehicle': 'Archivos originales de los documentos del vehículo',
  'document.raw_vehicle.description':
    'Las fotos y los PDF que subiste para los documentos del vehículo.',
  'document.raw_driver': 'Archivos originales de los documentos de conductor',
  'document.raw_driver.description':
    'Las fotos y los PDF que subiste para los documentos de conductor.',
  'document.other': 'Otros archivos',

  // Sharing period
  'share_end.until': 'Hasta el {{date}}',
  'share_end.no_end': 'Sin fecha de vencimiento',

  // Signing in
  'signin.subtitle': 'para continuar en {{appName}}',
  'signin.returning_title': 'Hola de nuevo',
  'signin.returning_desc': 'Ya iniciaste sesión en este dispositivo',
  'signin.email_label': 'Correo electrónico',
  'signin.email_placeholder': 'tu@example.com',
  'signin.continue': 'Continuar',
  'signin.continue_as': 'Continuar como {{email}}',
  'signin.other_account': 'Usar otra cuenta',
  'signin.or': 'o',
  'signin.google': 'Continuar con Google',
  'signin.apple': 'Continuar con Apple',
  'signin.signing_in': 'Iniciando sesión…',
  'signin.error.details':
    'No se pudieron obtener los datos de tu cuenta. Inténtalo de nuevo.',
  'signin.error.oauth':
    'No se pudo completar el inicio de sesión con Google o Apple. Inténtalo de nuevo.',
  'signin.error.storage':
    'Este navegador está bloqueando el almacenamiento del sitio, que este paso necesita. Permítelo e inténtalo de nuevo.',
  'signin.error.no_email':
    'Esa cuenta no compartió una dirección de correo electrónico con DIMO. Prueba otra forma de iniciar sesión.',

  // Passkeys and email codes
  'passkey.title': 'Confirma que eres tú',
  'passkey.body':
    'Usa la clave de acceso de {{email}}: tu huella digital, tu rostro o el PIN del dispositivo.',
  'passkey.waiting': 'Esperando tu clave de acceso…',
  'passkey.cta': 'Usar clave de acceso',
  'passkey.email_code': 'Enviarme un código por correo',
  'passkey.cancelled': 'La solicitud de la clave de acceso se cerró o caducó.',
  'passkey.error':
    'No se pudo iniciar sesión con tu clave de acceso. Inténtalo de nuevo o usa un código por correo.',
  'otp.title': 'Ingresa el código que te enviamos por correo',
  'otp.body':
    'Enviamos un código de 6 dígitos a {{email}}. Vence en 5 minutos; si no lo ves, revisa tu carpeta de spam.',
  'otp.label': 'Código de verificación',
  'otp.digit_label': 'Dígito {{index}} de 6',
  'otp.verify': 'Verificar',
  'otp.verifying': 'Verificando…',
  'otp.resend': 'Enviar un código nuevo',
  'otp.resent': 'Te enviamos un código nuevo.',
  'otp.error.send': 'No se pudo enviar el código. Inténtalo de nuevo.',
  'otp.error.verify': 'Ese código no funcionó. Revísalo e inténtalo de nuevo.',
  'create.title': 'Crea una clave de acceso',
  'create.body':
    'Tu cuenta DIMO inicia sesión con una clave de acceso en lugar de una contraseña.',
  'create.benefit_biometric':
    'Inicia sesión con tu huella digital, tu rostro o el PIN del dispositivo',
  'create.benefit_nothing_to_remember': 'Nada que recordar ni escribir',
  'create.benefit_phishing':
    'No se puede robar con phishing ni reutilizar en otros sitios',
  'create.cta': 'Crear clave de acceso',
  'create.creating': 'Creando tu cuenta. Puede tardar un minuto.',
  'create.error': 'No se pudo crear tu cuenta. Inténtalo de nuevo.',

  // Plain sign-in done, and signing out
  'login_done.title': 'Iniciaste sesión',
  'login_done.body': 'Sesión iniciada como {{email}}.',
  'logout.signing_out': 'Cerrando sesión…',

  // The email as part of the app's request
  'email.item': 'Correo electrónico',
  'request.about_you': 'Sobre ti',
  'request.about_vehicles': 'Sobre tus vehículos',
  'consent.title': 'Continuar en {{appName}}',
  'consent.optional':
    '{{appName}} quiere tu dirección de correo electrónico. Puedes continuar sin compartirla.',
  'consent.required':
    '{{appName}} necesita tu dirección de correo electrónico para continuar.',
  'consent.share_and_continue': 'Compartir y continuar',
  'email.share_title': 'Compartir mi correo con {{appName}}',
  'email.required': 'Obligatorio',

  // Sharing vehicles
  'share.title': '{{appName}} quiere acceder a tus vehículos',
  'share.access_label': 'Acceso solicitado',
  'share.also_asks': 'Ahora también pide {{list}}',
  'share.details': 'Detalles',
  'share.details_label': 'Qué incluye y condiciones completas',
  'share.vehicles_heading': 'Tus vehículos',
  'share.select_all': 'Seleccionar todos',
  'share.select_page': 'Seleccionar página',
  'share.deselect_all': 'Quitar selección',
  'share.group.ready': 'Listos para compartir',
  'share.group.shared': 'Ya compartidos',
  'share.group.unsupported': 'No se pueden compartir',
  'share.add_vehicle': 'Agregar un vehículo',
  'share.unsupported.vehicles': '{{appName}} solo pidió vehículos específicos.',
  'share.unsupported.makes': '{{appName}} solo funciona con vehículos {{makes}}.',
  'share.unsupported.powertrains':
    '{{appName}} solo funciona con vehículos {{powertrains}}.',
  'share.unsupported.makes_powertrains':
    '{{appName}} solo funciona con vehículos {{powertrains}} de {{makes}}.',
  'share.cta.select': 'Selecciona un vehículo',
  'share.cta.share_one': 'Compartir 1 vehículo',
  'share.cta.share_many': 'Compartir {{count}} de vehículos',
  'share.cta.share_other': 'Compartir {{count}} vehículos',
  'share.cta.update_one': 'Actualizar 1 vehículo',
  'share.cta.update_many': 'Actualizar {{count}} de vehículos',
  'share.cta.update_other': 'Actualizar {{count}} vehículos',
  'share.cta.mixed': 'Compartir {{share}} · Actualizar {{update}}',
  'share.hint.select': 'Elige al menos un vehículo para compartir.',
  'share.sharing': 'Compartiendo…',
  'share.keep_open':
    'Mantén esta ventana abierta hasta que termine. Tarda unos segundos por vehículo.',
  'share.error.title': 'No se pudieron compartir tus vehículos',
  'share.error.body': 'No se compartió nada. Revisa tu conexión e inténtalo de nuevo.',
  'share.load_error.title': 'No se pudieron cargar tus vehículos',
  'share.load_error.body': 'Revisa tu conexión e inténtalo de nuevo.',
  'share.empty.title': 'Aún no tienes vehículos conectados',
  'share.empty.body':
    'Conecta un vehículo en la app DIMO y luego vuelve para compartirlo.',
  'share.all_shared.title': 'Ya compartiste todos tus vehículos',
  'share.all_shared.body':
    'No hay nada nuevo para compartir. Puedes administrar cada vehículo abajo.',
  'store.app_store': 'App Store',
  'store.google_play': 'Google Play',
  'pager.page': 'Página {{page}}',
  'pager.previous': 'Anterior',
  'pager.next': 'Siguiente',

  // Powertrains, as they fit share.unsupported.* ("… con vehículos eléctricos")
  'powertrain.BEV': 'eléctricos',
  'powertrain.PHEV': 'híbridos enchufables',
  'powertrain.HEV': 'híbridos',
  'powertrain.ICE': 'de gasolina',
  'powertrain.FCEV': 'de pila de combustible de hidrógeno',

  // A vehicle in a list
  'vehicle.name': '{{year}} {{make}} {{model}}',
  'vehicle.id': 'ID {{id}}',
  'vehicle.not_shared': 'Aún no compartido',
  'vehicle.shared': 'Compartido',
  'vehicle.shared_until': 'Hasta el {{date}}',
  'vehicle.shared_no_end': 'Sin vencimiento',
  'vehicle.needs_update': 'Requiere actualización',
  'vehicle.adds': 'Agrega {{list}}',
  'vehicle.unsupported': 'Esta app no lo admite',
  'vehicle.checking': 'Revisando las condiciones…',
  'vehicle.manage': 'Administrar',
  'vehicle.manage_label': 'Administrar el acceso a {{vehicle}}',
  'chip.new': 'Nuevo',
  'chip.updated': 'Actualizado',
  'chip.stopped': 'Detenido',
  'chip.not_updated': 'Sin actualizar',

  // The terms sheet behind "Details"
  'terms.title': 'Qué incluye',
  'terms.access': 'Acceso',
  'terms.duration': 'Duración',
  'terms.duration_until':
    'El acceso termina el {{date}}. Puedes dejar de compartir antes en cualquier momento.',
  'terms.full': 'Condiciones completas',

  // Managing one shared vehicle
  'manage.status': 'Compartido con {{appName}}',
  'manage.until': 'Hasta el {{date}}',
  'manage.no_end': 'Sin fecha de vencimiento',
  'manage.access_heading': 'A qué puede acceder {{appName}}',
  'manage.update_title': '{{appName}} pide más acceso',
  'manage.update_body': 'Actualizar agrega {{list}}. Todo lo demás queda igual.',
  'manage.update_note': 'Después de actualizar, seguirá compartido hasta el {{date}}.',
  'manage.update_note_no_end':
    'Después de actualizar, seguirá compartido sin fecha de vencimiento.',
  'manage.extend_note':
    'Al extender, este vehículo seguirá compartido hasta el {{date}}.',
  'manage.no_end_note':
    'Compartido sin fecha de vencimiento. Deja de compartir cuando quieras.',
  'manage.extend': 'Extender 1 año',
  'manage.update': 'Actualizar permisos',
  'manage.stop': 'Dejar de compartir',
  'manage.busy.revoke': 'Deteniendo…',
  'manage.busy.extend': 'Extendiendo…',
  'manage.busy.update': 'Actualizando…',
  'manage.error.title': 'No se pudo cambiar el acceso',
  'manage.error.body': 'No se cambió nada. Revisa tu conexión e inténtalo de nuevo.',
  'stop.title': '¿Dejar de compartir este vehículo?',
  'stop.body':
    '{{appName}} perderá el acceso a tu {{vehicle}}. Puedes volver a compartirlo cuando quieras.',
  'stop.confirm': 'Dejar de compartir',
  'stop.keep': 'Seguir compartiendo',

  // Done screens after sharing
  'success.shared_title_one': 'Compartiste 1 vehículo con {{appName}}',
  'success.shared_title_many': 'Compartiste {{count}} de vehículos con {{appName}}',
  'success.shared_title_other': 'Compartiste {{count}} vehículos con {{appName}}',
  'success.shared_body_one': '{{appName}} puede acceder a él hasta el {{date}}.',
  'success.shared_body_many': '{{appName}} puede acceder a ellos hasta el {{date}}.',
  'success.shared_body_other': '{{appName}} puede acceder a ellos hasta el {{date}}.',
  'success.shared_body_no_end_one':
    '{{appName}} puede acceder a él hasta que dejes de compartirlo.',
  'success.shared_body_no_end_many':
    '{{appName}} puede acceder a ellos hasta que dejes de compartirlos.',
  'success.shared_body_no_end_other':
    '{{appName}} puede acceder a ellos hasta que dejes de compartirlos.',
  'success.updated_title_one': 'Se actualizó el acceso a 1 vehículo',
  'success.updated_title_many': 'Se actualizó el acceso a {{count}} de vehículos',
  'success.updated_title_other': 'Se actualizó el acceso a {{count}} vehículos',
  'success.updated_body': '{{appName}} ya tiene el acceso que pidió.',
  'success.extended_title': 'Acceso extendido',
  'success.extended_body':
    'Tu {{vehicle}} seguirá compartido con {{appName}} hasta el {{date}}.',
  'success.stopped_title': 'Dejaste de compartir',
  'success.stopped_body': '{{appName}} ya no tiene acceso a tu {{vehicle}}.',
  'success.skipped_title_one': '1 vehículo no se actualizó',
  'success.skipped_title_many': '{{count}} de vehículos no se actualizaron',
  'success.skipped_title_other': '{{count}} vehículos no se actualizaron',
  'success.skipped_body_one':
    'Sigue compartido como antes. Puedes actualizarlo más tarde desde la lista de vehículos.',
  'success.skipped_body_many':
    'Siguen compartidos como antes. Puedes actualizarlos más tarde desde la lista de vehículos.',
  'success.skipped_body_other':
    'Siguen compartidos como antes. Puedes actualizarlos más tarde desde la lista de vehículos.',
  // Sharing account documents
  'docs.title': '{{appName}} quiere acceder a tus documentos',
  'docs.allow': 'Permitir acceso',
  'docs.error.title': 'No se pudieron compartir tus documentos',
  'docs.error.body': 'No se compartió nada. Revisa tu conexión e inténtalo de nuevo.',
  'success.docs_title': 'Documentos compartidos con {{appName}}',
  'success.docs_body':
    '{{appName}} puede ver tus documentos de conductor hasta el {{date}}.',
  'success.docs_body_no_end':
    '{{appName}} puede ver tus documentos de conductor hasta que dejes de compartirlos.',
  // Transactions and message signing
  'tx.title': 'Aprobar una transacción',
  'tx.warning_title': 'Aprueba solo si confías en {{appName}}',
  'tx.warning_body':
    '{{host}} te pide firmar una transacción no estándar desde tu cuenta DIMO.',
  'tx.function': 'Función',
  'tx.parameters': 'Parámetros',
  'tx.none': 'Ninguno',
  'tx.address': 'Contrato',
  'tx.value': 'Valor',
  'tx.approve': 'Aprobar',
  'tx.approving': 'Aprobando…',
  'tx.reject': 'Rechazar',
  'tx.error': 'No se pudo completar la transacción. Inténtalo de nuevo.',
  'tx.done_title': 'Transacción completada',
  'tx.done_body': 'Se realizó correctamente y {{appName}} tiene los detalles.',
  'tx.view': 'Ver transacción',
  'tx.missing.title': 'Transacción no completada',
  'tx.missing.body':
    'No hay ninguna transacción para mostrar. Es posible que no se haya realizado.',
  'sign.title': 'Firmar un mensaje',
  'sign.warning_title': 'Firma solo si confías en {{appName}}',
  'sign.warning_body':
    '{{host}} te pide firmar un mensaje. La firma demuestra que controlas esta cuenta DIMO.',
  'sign.message': 'Mensaje',
  'sign.hash': 'Hash',
  'sign.show_full': 'Mostrar el mensaje completo',
  'sign.show_less': 'Mostrar menos',
  'sign.sign': 'Firmar',
  'sign.signing': 'Firmando…',
  'sign.error': 'No se pudo firmar el mensaje. Inténtalo de nuevo.',
  'sign.done_title': 'Mensaje firmado',
  'sign.done_body': '{{appName}} ya tiene la firma.',
  'sign.copy': 'Copiar firma',
  'sign.copied': 'Copiado',
  'sign.missing.title': 'Mensaje no firmado',
  'sign.missing.body':
    'No hay ninguna firma para mostrar. Es posible que el mensaje no se haya firmado.',
  'cancelled.title': 'Solicitud cancelada',
  'cancelled.body': 'No se compartió ni se firmó nada.',

  // Developer license setup
  'license.title': 'Licencia de desarrollador',
  'license.subtitle': 'Configurando el acceso a la API para {{appName}}',
  'license.step.mint': 'Acuñar la licencia de desarrollador',
  'license.step.register': 'Registrar la clave de API y la URI de redirección',
  'license.status.starting': 'Configurando tu licencia de desarrollador…',
  'license.status.minting': 'Paso 1 de 2: acuñando tu licencia de desarrollador…',
  'license.status.registering':
    'Paso 2 de 2: registrando la clave de API y la URI de redirección…',
  'license.status.generating': 'Generando tu clave de API…',
  'license.status.done': 'Listo',
  'license.existing.subtitle': 'Ya tienes una licencia de desarrollador',
  'license.existing.body':
    '{{host}} solicita acceso a la API. Tu cuenta ya tiene una licencia de desarrollador ({{clientId}}). ¿Tienes una clave de API para ella?',
  'license.existing.redirect':
    'En cualquier caso, {{uri}} se agrega como dirección de redirección.',
  'license.confirm.subtitle': '{{host}} solicita acceso a la API',
  'license.confirm.key':
    'Si continúas, se creará una licencia de desarrollador en tu cuenta y {{host}} recibirá una clave de API para ella.',
  'license.confirm.new_key':
    'Si continúas, {{host}} recibirá una nueva clave de API para tu licencia {{license}}.',
  'license.confirm.redirect':
    'También se agregará {{uri}} como dirección de redirección.',
  'license.confirm.warning':
    'Una clave de API permite que {{host}} actúe en nombre de esta licencia, lo que incluye leer lo que otras personas comparten con ella. Continúa solo si confías en {{host}}.',
  'license.not_owner': 'Esta licencia de desarrollador no está en tu cuenta.',
  'license.no_redirect_uri': 'La app no indicó adónde enviar la clave de API.',
  'license.existing.has_key': 'Sí, tengo mi clave de API',
  'license.existing.new_key': 'No, generar una nueva clave de API',
  'license.error': 'No se pudo terminar de configurar la licencia de desarrollador.',

  // Adding a vehicle
  'add.title': 'Agregar un vehículo',
  'add.tabs_label': 'Buscar el vehículo por',
  'add.tab.make_model': 'Marca, modelo, año',
  'add.tab.vin': 'VIN',
  'add.make_model': 'Marca y modelo',
  'add.make_model_placeholder': 'Ford Bronco',
  'add.year': 'Año del modelo',
  'add.country': 'País donde está el vehículo',
  'add.vin': 'VIN (número de identificación del vehículo)',
  'add.vin_placeholder': '1N6AD0EVXCC459517',
  'add.check': 'Verificar compatibilidad',
  'compat.checking': 'Verificando compatibilidad…',
  'compat.supported': 'Tu {{vehicle}} es compatible',
  'compat.unsupported': 'Tu {{vehicle}} no es compatible',
  'compat.unsupported_generic': 'Este vehículo no es compatible',
  'compat.supported_body': 'Ahora conéctalo y luego compártelo con {{appName}}.',
  'compat.unsupported_body':
    'DIMO todavía no puede conectar este vehículo. Prueba con otro.',
  'compat.add': 'Agregar este vehículo',
  'compat.try_another': 'Probar con otro vehículo',
  'device.title': 'Conecta tu {{vehicle}}',
  'device.body':
    'Este vehículo necesita un adaptador DIMO para conectarse a {{appName}}. Los adaptadores se configuran en la app móvil de DIMO.',
  'device.image_alt': 'Adaptador DIMO',
  'device.open_app': 'Abrir la app DIMO',
  'device.shop': 'Comprar adaptadores',
  'device.later': 'Más tarde',
  'mint.creating': 'Creando tu vehículo…',
  'mint.failed.title': 'No se pudo agregar tu vehículo',
  'mint.failed.body':
    'Inténtalo de nuevo desde tu lista de vehículos o agrégalo en la app DIMO.',
  'mint.failed.cta': 'Volver a tus vehículos',

  // Connecting a Tesla
  'tesla.authorize.title': 'Autoriza tu cuenta de Tesla',
  'tesla.needs_access':
    '{{appName}} necesita acceder a los datos de tu Tesla para prestar su servicio.',
  'tesla.perm.info': 'Información del vehículo',
  'tesla.perm.location': 'Ubicación del vehículo',
  'tesla.perm.profile': 'Perfil',
  'tesla.perm.commands': 'Comandos del vehículo',
  'tesla.perm.charging': 'Gestión de carga',
  'tesla.required': 'Obligatorio',
  'tesla.recommended': 'Recomendado',
  'tesla.authorize.cta': 'Ir a Tesla',
  'tesla.key.title': 'Agrega la llave virtual',
  'tesla.key.body':
    'La llave virtual cifra los datos de extremo a extremo, envía actualizaciones con más frecuencia y te permite enviar comandos desde tu teléfono.',
  'tesla.key.remove':
    'Puedes quitarla en cualquier momento en la app de Tesla. <learn>Más información</learn>',
  'tesla.key.vin': 'VIN {{vin}}',
  'tesla.key.cta': 'Configurar la llave virtual',
  'tesla.waiting.title': 'Esperando la llave virtual',
  'tesla.waiting.body':
    'Termina de agregar la llave en la app de Tesla y luego vuelve aquí.',
  'tesla.waiting.cta': 'Ya agregué la llave virtual',
  'tesla.done.title': 'Configuración completa',
  'tesla.done.body':
    'Tu Tesla está conectado. {{appName}} ya puede usar sus datos y comandos.',
  'tesla.done.cta': 'Listo',
  'tesla.checking': 'Verificando los permisos de Tesla…',
  'tesla.finalizing': 'Terminando la configuración…',

  'app.powered_by': 'Powered by DIMO',

  // The sharing contract, as summarized before signing. Display only: the
  // signed document is produced by the transactions SDK.
  'contract.intro':
    'Este contrato otorga permiso para funciones específicas de acceso a datos y de control en la plataforma DIMO.',
  'contract.agreeing': 'Esto es lo que aceptas:',
  'contract.summary': 'Resumen del contrato:',
  'contract.grantor': '- Otorgante: {{email}} (la entidad que otorga el permiso).',
  'contract.grantee': '- Beneficiario: {{appName}} (la entidad que recibe el permiso).',
  'contract.permissions': 'Permisos otorgados: {{permissions}}',
  'contract.files': 'Archivos solicitados: {{files}}',
  'contract.files_none': 'NINGUNO',
  'contract.effective': 'Fecha de entrada en vigor: {{date}}',
  'contract.expiration': 'Fecha de vencimiento: {{date}}.',
  'contract.details': 'Detalles:',
  'contract.details_access':
    '- Esta concesión da al beneficiario acceso a datos específicos del vehículo y a funciones de control, según se indica arriba.',
  'contract.details_template':
    '- Creado por la plataforma DIMO, versión 1.0 de esta plantilla de contrato.',
  'contract.outro':
    'Al firmar, ambas partes aceptan estas condiciones y el alcance de acceso especificado.',
  'contract.attachment': 'Anexo de la política',
  'contract.courtesy': 'Esta es una traducción de cortesía del texto en inglés.',
  'contract.original_note': 'Este es el original en inglés.',
  'contract.view_original': 'Ver en inglés',
  'contract.view_translation': 'Ver traducción',
  'contract.permission.GetNonLocationHistory':
    'NONLOCATION_TELEMETRY: datos del vehículo sin ubicación, como el nivel de combustible y el odómetro.',
  'contract.permission.ExecuteCommands':
    'COMMANDS: capacidad de enviar comandos al vehículo, como bloquear y desbloquear.',
  'contract.permission.GetCurrentLocation':
    'CURRENT_LOCATION: acceso a la ubicación actual del vehículo.',
  'contract.permission.GetLocationHistory':
    'ALLTIME_LOCATION: acceso al historial completo de ubicaciones del vehículo.',
  'contract.permission.GetVINCredential':
    'CREDENTIALS: acceso a credenciales y certificaciones guardadas, como registros de seguro y de servicio.',
  'contract.permission.GetLiveData': 'STREAMS: acceso a flujos de datos en tiempo real.',
  'contract.permission.GetRawData': 'RAW_DATA: acceso a los datos sin procesar.',
  'contract.permission.GetApproximateLocation':
    'APPROXIMATE_LOCATION: acceso a la ubicación aproximada del vehículo.',
};

export default es;
