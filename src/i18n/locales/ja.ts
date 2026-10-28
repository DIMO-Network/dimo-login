import type { LocaleResources } from '../types';

/**
 * Japanese copy. Terms follow DIMO Driver's Japanese (権限, 共有, 共有を停止,
 * 有効期限, 無期限, 位置情報). App names, brand names, vehicle names and email
 * addresses stay as they are. Japanese has a single plural form, so only the
 * `_other` keys exist.
 */
const ja: LocaleResources = {
  'app.document_title': 'DIMOでログイン',
  'app.document_title_brand': '{{name}}でサインイン',
  'app.logo_alt': '{{name}}のロゴ',
  'app.language': '言語',

  'common.back': '戻る',
  'common.cancel': 'キャンセル',
  'common.continue': '続行',
  'common.close': '閉じる',
  'common.clear': 'クリア',
  'common.try_again': '再試行',
  'common.log_out': 'ログアウト',
  'common.back_to_app': '{{appName}}に戻る',
  'common.select_placeholder': '選択してください',
  'common.search_placeholder': '入力して検索…',
  'common.app_developer_fallback': 'アプリの開発者',
  'common.error_detail': '詳細：{{detail}}',

  'loading.waiting_for_credentials': '準備しています…',
  'loading.still_working': '処理中です…',
  'loading.almost_there': 'もう少しで完了します',

  'signin.title_brand': '{{brandName}}でサインイン',
  'signin.title_default': 'DIMOでサインイン',
  'signin.title_alt': 'DIMOで{{appName}}にログイン',

  'email.invalid': '有効なメールアドレスを入力してください',

  'legal.notice_brand':
    '続行すると、{{brandName}}の<privacy>プライバシーポリシー</privacy>と<terms>利用規約</terms>に同意したものとみなされます',
  'legal.notice':
    '続行すると、<privacy>プライバシーポリシー</privacy>と<terms>利用規約</terms>に同意したものとみなされます',

  'error.missing_client_id.title': 'クライアントIDがありません',
  'error.missing_client_id.message':
    'アプリからクライアントIDが送信されていません。アプリの開発者にお問い合わせください。',
  'error.missing_redirect_uri.title': 'リダイレクトURIがありません',
  'error.missing_redirect_uri.message':
    'アプリからリダイレクトURIが送信されていません。有効なリダイレクトURIを設定するよう{{appName}}に依頼してください。',
  'error.untrusted_return.title': 'ここではこのサインインを完了できません',
  'error.untrusted_return.message':
    'このウィンドウで開始されたサインインではありません。アプリに戻って、そこからサインインしてください。',
  'error.untrusted_caller.title': 'このページからはこのサインインを開けません',
  'error.untrusted_caller.message':
    '開けるのは{{appName}}のサイトだけです。{{appName}}から始めてください。',
  'error.invalid_credentials.title': 'このアプリは正しく設定されていません',
  'error.invalid_credentials.message':
    'このアプリのDIMO認証情報を確認できなかったため、ここからサインインや共有はできません。アプリのサポート窓口にお問い合わせください。',
  'error.missing_transaction_data.title': 'トランザクションデータがありません',
  'error.missing_transaction_data.message':
    'アプリから署名するトランザクションが送信されていません。設定を確認して再読み込みしてください。',
  'error.missing_message_data.title': 'メッセージデータがありません',
  'error.missing_message_data.message':
    'アプリから署名するメッセージが送信されていません。設定を確認して再読み込みしてください。',
  'error.invalid_message.title': '無効なメッセージ',
  'error.invalid_message.message':
    '署名するメッセージは空でない文字列である必要があります。',
  'error.invalid_hash.title': '無効なハッシュ',
  'error.invalid_hash.message':
    '16進数のメッセージは、0xで始まる32バイトのハッシュである必要があります。',
  'error.missing_permissions.title': '権限が指定されていません',
  'error.missing_permissions.message': 'アプリが必要な権限を指定していません。',
  'error.invalid_permissions_format.title': '権限の形式が無効です',
  'error.invalid_permissions_format.message':
    '権限は0と1からなる最大{{max}}文字の文字列で指定してください。',

  'grant_unreadable.retry':
    '{{vehicle}}の現在の共有条件を読み取れませんでした。もう一度お試しください。',
  'grant_unreadable.unknown_permissions':
    '{{vehicle}}の現在の共有条件を読み取れませんでした。このバージョンのDIMOでは引き継げない権限が使われています。',
  'grant_unreadable.unverified_storage':
    '{{vehicle}}の現在の共有条件を読み取れませんでした。DIMOが検証できない場所に保存されています。',
  'grant_unreadable.other_app':
    '{{vehicle}}の現在の共有条件を読み取れませんでした。このアプリとの共有条件と一致しません。',
  'vehicle.fallback_name': '車両{{tokenId}}',

  'permission.GetNonLocationHistory.label': '車両データ',
  'permission.GetNonLocationHistory.description':
    '走行距離、燃料、バッテリーなどの情報。位置情報は含みません。',
  'permission.ExecuteCommands.label': 'ロックとロック解除',
  'permission.ExecuteCommands.description': '車両を遠隔でロック・ロック解除できます。',
  'permission.ExecuteCommands.caution': '車両を操作できます',
  'permission.GetCurrentLocation.label': '現在地',
  'permission.GetCurrentLocation.description': '車両がいまどこにあるか。',
  'permission.GetLocationHistory.label': '位置情報の履歴',
  'permission.GetLocationHistory.description': '過去の走行を含む、これまでの位置。',
  'permission.GetVINCredential.label': '証明情報',
  'permission.GetVINCredential.description':
    'VIN（車台番号）など、車両に関する検証済みの記録。',
  'permission.GetLiveData.label': 'リアルタイムデータ',
  'permission.GetLiveData.description': '発生と同時に届く車両のデータ。',
  'permission.GetRawData.label': '生データ',
  'permission.GetRawData.description': '車両から届く未加工のデータ。',
  'permission.GetApproximateLocation.label': 'おおよその位置',
  'permission.GetApproximateLocation.description':
    '正確な位置ではなく、車両があるおおよそのエリア。',
  'permission.unknown.label': '権限{{id}}',

  'document.vehicle': '車両の書類',
  'document.vehicle.description': '共有する車両の車検証や保険証券などの書類。',
  'document.driver': '運転者の書類',
  'document.driver.description': 'DIMOに追加した運転免許証などの書類。',
  'document.raw_vehicle': '車両書類の元ファイル',
  'document.raw_vehicle.description': '車両の書類としてアップロードした写真やPDF。',
  'document.raw_driver': '運転者書類の元ファイル',
  'document.raw_driver.description': '運転者の書類としてアップロードした写真やPDF。',
  'document.other': 'その他のファイル',

  'share_end.until': '{{date}}まで',
  'share_end.no_end': '無期限',

  'signin.subtitle': '{{appName}}に移動します',
  'signin.returning_title': 'おかえりなさい',
  'signin.returning_desc': 'このデバイスでサインインしたことがあります',
  'signin.email_label': 'メールアドレス',
  'signin.email_placeholder': 'you@example.com',
  'signin.continue': '続行',
  'signin.continue_as': '{{email}}で続行',
  'signin.other_account': '別のアカウントを使用',
  'signin.or': 'または',
  'signin.google': 'Googleで続行',
  'signin.apple': 'Appleで続行',
  'signin.signing_in': 'サインインしています…',
  'signin.error.details':
    'アカウント情報を取得できませんでした。もう一度お試しください。',
  'signin.error.oauth':
    'GoogleまたはAppleでのサインインを完了できませんでした。もう一度お試しください。',
  'signin.error.storage':
    'このブラウザはサイトデータの保存をブロックしています。この手順には保存が必要です。許可してから、もう一度お試しください。',
  'signin.error.no_email':
    'このアカウントはDIMOにメールアドレスを共有していません。別の方法でサインインしてください。',

  'passkey.title': '本人確認',
  'passkey.body':
    '{{email}}のパスキー（指紋、顔認証、または端末のPIN）を使って確認します。',
  'passkey.waiting': 'パスキーを待っています…',
  'passkey.cta': 'パスキーを使用',
  'passkey.email_code': '代わりにメールでコードを受け取る',
  'passkey.cancelled': 'パスキーの確認が閉じられたか、時間切れになりました。',
  'passkey.error':
    'パスキーでサインインできませんでした。もう一度試すか、メールのコードを使ってください。',
  'otp.title': 'メールで届いたコードを入力',
  'otp.body':
    '{{email}}に6桁のコードを送信しました。有効期限は5分です。届かない場合は迷惑メールフォルダもご確認ください。',
  'otp.label': '確認コード',
  'otp.digit_label': '6桁中{{index}}桁目',
  'otp.verify': '確認',
  'otp.verifying': '確認しています…',
  'otp.resend': 'コードを再送信',
  'otp.resent': '新しいコードを送信しました。',
  'otp.error.send': 'コードを送信できませんでした。もう一度お試しください。',
  'otp.error.verify': 'コードが正しくありません。確認して、もう一度お試しください。',
  'create.title': 'パスキーを作成',
  'create.body': 'DIMOアカウントには、パスワードの代わりにパスキーでサインインします。',
  'create.benefit_biometric': '指紋、顔認証、または端末のPINでサインイン',
  'create.benefit_nothing_to_remember': '覚えることも入力することもありません',
  'create.benefit_phishing':
    'フィッシングされず、他のサイトで使い回されることもありません',
  'create.cta': 'パスキーを作成',
  'create.creating': 'アカウントを作成しています。少し時間がかかることがあります。',
  'create.error': 'アカウントを作成できませんでした。もう一度お試しください。',

  'login_done.title': 'サインインしました',
  'login_done.body': '{{email}}でサインインしています。',
  'logout.signing_out': 'サインアウトしています…',

  'email.item': 'メールアドレス',
  'request.about_you': 'あなたについて',
  'request.about_vehicles': '車両について',
  'consent.title': '{{appName}}に進む',
  'consent.optional':
    '{{appName}}がメールアドレスの共有を求めています。共有しなくても続行できます。',
  'consent.required': '{{appName}}を利用するにはメールアドレスの共有が必要です。',
  'consent.share_and_continue': '共有して続行',
  'email.share_title': 'メールアドレスを{{appName}}と共有',
  'email.required': '必須',

  'share.title': '{{appName}}が車両へのアクセスを求めています',
  'share.access_label': '要求されているアクセス',
  'share.also_asks': '新たに「{{list}}」を求めています',
  'share.details': '詳細',
  'share.details_label': '内容と利用条件を確認',
  'share.vehicles_heading': 'あなたの車両',
  'share.select_all': 'すべて選択',
  'share.select_page': 'このページを選択',
  'share.deselect_all': '選択を解除',
  'share.group.ready': '共有できる車両',
  'share.group.shared': '共有中',
  'share.group.unsupported': '共有できない車両',
  'share.add_vehicle': '車両を追加',
  'share.unsupported.vehicles': '{{appName}}は特定の車両のみを求めています。',
  'share.unsupported.makes': '{{appName}}は{{makes}}の車両のみに対応しています。',
  'share.unsupported.powertrains': '{{appName}}は{{powertrains}}のみに対応しています。',
  'share.unsupported.makes_powertrains':
    '{{appName}}は{{makes}}の{{powertrains}}のみに対応しています。',
  'share.cta.select': '車両を選択',
  'share.cta.share_other': '{{count}}台を共有',
  'share.cta.update_other': '{{count}}台を更新',
  'share.cta.mixed': '{{share}}台を共有・{{update}}台を更新',
  'share.hint.select': '共有する車両を1台以上選んでください。',
  'share.sharing': '共有しています…',
  'share.keep_open':
    '共有が完了するまで、このウィンドウを閉じないでください。車両1台につき数秒かかります。',
  'share.error.title': '車両を共有できませんでした',
  'share.error.body': '何も共有されていません。接続を確認して、もう一度お試しください。',
  'share.load_error.title': '車両を読み込めませんでした',
  'share.load_error.body': '接続を確認して、もう一度お試しください。',
  'share.empty.title': '接続済みの車両はまだありません',
  'share.empty.body': 'DIMOアプリで車両を接続してから、もう一度共有してください。',
  'share.all_shared.title': 'すべての車両を共有済みです',
  'share.all_shared.body': '新たに共有する車両はありません。各車両は下から管理できます。',
  'store.app_store': 'App Store',
  'store.google_play': 'Google Play',
  'pager.page': '{{page}}ページ目',
  'pager.previous': '前へ',
  'pager.next': '次へ',

  'powertrain.BEV': '電気自動車',
  'powertrain.PHEV': 'プラグインハイブリッド車',
  'powertrain.HEV': 'ハイブリッド車',
  'powertrain.ICE': 'ガソリン車',
  'powertrain.FCEV': '燃料電池車',

  'vehicle.name': '{{year}} {{make}} {{model}}',
  'vehicle.id': 'ID {{id}}',
  'vehicle.not_shared': '未共有',
  'vehicle.shared': '共有中',
  'vehicle.shared_until': '{{date}}まで共有',
  'vehicle.shared_no_end': '無期限で共有中',
  'vehicle.needs_update': '更新が必要',
  'vehicle.adds': '{{list}}を追加',
  'vehicle.unsupported': 'このアプリでは利用できません',
  'vehicle.checking': '共有条件を確認中…',
  'vehicle.manage': '管理',
  'vehicle.manage_label': '{{vehicle}}の共有を管理',
  'chip.new': '新規',
  'chip.updated': '更新済み',
  'chip.stopped': '停止済み',
  'chip.not_updated': '未更新',

  'terms.title': '共有される内容',
  'terms.access': 'アクセス',
  'terms.duration': '共有期間',
  'terms.duration_until':
    '{{date}}にアクセスが終了します。それより前でも、いつでも共有を停止できます。',
  'terms.duration_no_end':
    'アクセスに期限はありません。DIMOアプリからいつでも共有を停止できます。',
  'terms.full': '利用条件の全文',

  'manage.status': '{{appName}}と共有中',
  'manage.until': '{{date}}まで',
  'manage.no_end': '無期限',
  'manage.access_heading': '{{appName}}がアクセスできる情報',
  'manage.update_title': '{{appName}}が追加のアクセスを求めています',
  'manage.update_body':
    '更新すると「{{list}}」が追加されます。その他の内容は変わりません。',
  'manage.update_note': '更新後は{{date}}まで共有が続きます。',
  'manage.update_note_no_end': '更新後も無期限で共有が続きます。',
  'manage.extend_note': '延長すると、{{date}}まで共有が続きます。',
  'manage.no_end_note': '無期限で共有しています。いつでも共有を停止できます。',
  'manage.extend': '1年延長',
  'manage.update': '権限を更新',
  'manage.stop': '共有を停止',
  'manage.busy.revoke': '停止しています…',
  'manage.busy.extend': '延長しています…',
  'manage.busy.update': '更新しています…',
  'manage.error.title': '共有内容を変更できませんでした',
  'manage.error.body': '何も変更されていません。接続を確認して、もう一度お試しください。',
  'stop.title': 'この車両の共有を停止しますか？',
  'stop.body':
    '{{appName}}は{{vehicle}}にアクセスできなくなります。いつでも再び共有できます。',
  'stop.confirm': '共有を停止',
  'stop.keep': '共有を続ける',

  'success.shared_title_other': '{{count}}台の車両を{{appName}}と共有しました',
  'success.shared_body_other': '{{appName}}は{{date}}までアクセスできます。',
  'success.shared_body_no_end_other':
    '共有を停止するまで、{{appName}}はアクセスできます。',
  'success.updated_title_other': '{{count}}台の共有内容を更新しました',
  'success.updated_body': '{{appName}}は求めていたアクセスを利用できるようになりました。',
  'success.extended_title': '共有を延長しました',
  'success.extended_body': '{{vehicle}}は{{date}}まで{{appName}}と共有されます。',
  'success.stopped_title': '共有を停止しました',
  'success.stopped_body': '{{appName}}は{{vehicle}}にアクセスできなくなりました。',
  'success.skipped_title_other': '{{count}}台は更新されませんでした',
  'success.skipped_body_other':
    '以前の内容のまま共有されています。後から車両の一覧で更新できます。',
  'docs.title': '{{appName}}が書類へのアクセスを求めています',
  'docs.allow': 'アクセスを許可',
  'docs.error.title': '書類を共有できませんでした',
  'docs.error.body': '何も共有されていません。接続を確認して、もう一度お試しください。',
  'success.docs_title': '書類を{{appName}}と共有しました',
  'success.docs_body': '{{appName}}は{{date}}まで運転者の書類を確認できます。',
  'success.docs_body_no_end':
    '共有を停止するまで、{{appName}}は運転者の書類を確認できます。',
  'tx.title': 'トランザクションの承認',
  'tx.warning_title': '{{appName}}を信頼できる場合のみ承認してください',
  'tx.warning_body':
    '{{host}}が、DIMOアカウントで標準外のトランザクションに署名するよう求めています。',
  'tx.function': '関数',
  'tx.parameters': 'パラメーター',
  'tx.none': 'なし',
  'tx.address': 'コントラクト',
  'tx.value': '値',
  'tx.approve': '承認',
  'tx.approving': '承認しています…',
  'tx.reject': '拒否',
  'tx.error': 'トランザクションを完了できませんでした。もう一度お試しください。',
  'tx.done_title': 'トランザクションが完了しました',
  'tx.done_body': '処理が完了し、{{appName}}に詳細が送信されました。',
  'tx.view': 'トランザクションを表示',
  'tx.missing.title': 'トランザクションは完了していません',
  'tx.missing.body':
    '表示するトランザクションがありません。処理されなかった可能性があります。',
  'sign.title': 'メッセージへの署名',
  'sign.warning_title': '{{appName}}を信頼できる場合のみ署名してください',
  'sign.warning_body':
    '{{host}}がメッセージへの署名を求めています。署名は、このDIMOアカウントの所有者であることの証明になります。',
  'sign.message': 'メッセージ',
  'sign.hash': 'ハッシュ',
  'sign.show_full': 'メッセージ全体を表示',
  'sign.show_less': '折りたたむ',
  'sign.sign': '署名',
  'sign.signing': '署名しています…',
  'sign.error': 'メッセージに署名できませんでした。もう一度お試しください。',
  'sign.done_title': 'メッセージに署名しました',
  'sign.done_body': '{{appName}}に署名が送信されました。',
  'sign.copy': '署名をコピー',
  'sign.copied': 'コピーしました',
  'sign.missing.title': 'メッセージは署名されていません',
  'sign.missing.body': '表示する署名がありません。署名されなかった可能性があります。',
  'cancelled.title': 'リクエストをキャンセルしました',
  'cancelled.body': '何も共有・署名されていません。',

  'license.title': '開発者ライセンス',
  'license.subtitle': '{{appName}}のAPIアクセスを設定しています',
  'license.step.mint': '開発者ライセンスの発行',
  'license.step.register': 'APIキーとリダイレクトURIの登録',
  'license.status.starting': '開発者ライセンスを設定しています…',
  'license.status.minting': 'ステップ1/2：開発者ライセンスを発行しています…',
  'license.status.registering': 'ステップ2/2：APIキーとリダイレクトURIを登録しています…',
  'license.status.generating': 'APIキーを生成しています…',
  'license.status.done': '完了',
  'license.existing.subtitle': 'すでに開発者ライセンスをお持ちです',
  'license.existing.body':
    '{{host}}がAPIアクセスを求めています。このアカウントにはすでに開発者ライセンス（{{clientId}}）があります。そのAPIキーをお持ちですか？',
  'license.existing.redirect':
    'どちらを選んでも、{{uri}}がリダイレクト先として追加されます。',
  'license.confirm.subtitle': '{{host}}がAPIアクセスを求めています',
  'license.confirm.key':
    '続行すると、このアカウントに開発者ライセンスが作成され、{{host}}がそのAPIキーを受け取ります。',
  'license.confirm.new_key':
    '続行すると、{{host}}がライセンス「{{license}}」の新しいAPIキーを受け取ります。',
  'license.confirm.redirect': 'あわせて{{uri}}がリダイレクト先として追加されます。',
  'license.confirm.warning':
    'APIキーがあると、{{host}}はこのライセンスとして動作でき、共有されたデータも読み取れます。{{host}}を信頼できる場合のみ続行してください。',
  'license.not_owner': 'この開発者ライセンスはあなたのアカウントのものではありません。',
  'license.no_redirect_uri': 'APIキーの送信先がアプリから指定されていません。',
  'license.existing.has_key': 'はい、APIキーを持っています',
  'license.existing.new_key': 'いいえ、新しいAPIキーを生成します',
  'license.error': '開発者ライセンスの設定を完了できませんでした。',

  'add.title': '車両を追加',
  'add.tabs_label': '車両の指定方法',
  'add.tab.make_model': 'メーカー・車種・年式',
  'add.tab.vin': 'VIN',
  'add.make_model': 'メーカーと車種',
  'add.make_model_placeholder': 'Toyota Prius',
  'add.year': '年式',
  'add.country': '車両がある国',
  'add.vin': 'VIN（車台番号）',
  'add.vin_placeholder': '1N6AD0EVXCC459517',
  'add.check': '対応状況を確認',
  'compat.checking': '対応状況を確認しています…',
  'compat.supported': '{{vehicle}}は対応しています',
  'compat.unsupported': '{{vehicle}}は対応していません',
  'compat.unsupported_generic': 'この車両は対応していません',
  'compat.supported_body': '次に車両を接続すると、{{appName}}と共有できます。',
  'compat.unsupported_body':
    'DIMOはまだこの車両に接続できません。別の車両をお試しください。',
  'compat.add': 'この車両を追加',
  'compat.try_another': '別の車両を試す',
  'device.title': '{{vehicle}}を接続',
  'device.body':
    'この車両を{{appName}}に接続するには、DIMOアダプターが必要です。アダプターの設定はDIMOモバイルアプリで行います。',
  'device.image_alt': 'DIMOアダプター',
  'device.open_app': 'DIMOアプリを開く',
  'device.shop': 'アダプターを購入',
  'device.later': 'あとで',
  'mint.creating': '車両を作成しています…',
  'mint.failed.title': '車両を追加できませんでした',
  'mint.failed.body':
    '車両の一覧からもう一度お試しいただくか、DIMOアプリで追加してください。',
  'mint.failed.cta': '車両の一覧に戻る',

  'tesla.authorize.title': 'Teslaアカウントを認証',
  'tesla.needs_access':
    '{{appName}}がサービスを提供するには、Teslaの車両データへのアクセスが必要です。',
  'tesla.perm.info': '車両情報',
  'tesla.perm.location': '車両の位置情報',
  'tesla.perm.profile': 'プロフィール',
  'tesla.perm.commands': '車両コマンド',
  'tesla.perm.charging': '充電の管理',
  'tesla.required': '必須',
  'tesla.recommended': '推奨',
  'tesla.authorize.cta': 'Teslaに進む',
  'tesla.key.title': 'バーチャルキーを追加',
  'tesla.key.body':
    'バーチャルキーを使うと、データがエンドツーエンドで暗号化され、更新の頻度が上がり、スマートフォンからコマンドを送れるようになります。',
  'tesla.key.remove': 'Teslaアプリからいつでも削除できます。<learn>詳しく見る</learn>',
  'tesla.key.vin': 'VIN {{vin}}',
  'tesla.key.cta': 'バーチャルキーを設定',
  'tesla.waiting.title': 'バーチャルキーを待っています',
  'tesla.waiting.body':
    'Teslaアプリでキーの追加を完了してから、この画面に戻ってください。',
  'tesla.waiting.cta': 'バーチャルキーを追加しました',
  'tesla.done.title': '設定が完了しました',
  'tesla.done.body':
    'Teslaが接続されました。{{appName}}で車両のデータとコマンドを利用できます。',
  'tesla.done.cta': '完了',
  'tesla.checking': 'Teslaの権限を確認しています…',
  'tesla.finalizing': '設定を完了しています…',

  'done.next': '共有内容の変更や停止は、DIMOアプリからいつでもできます。',
  'app.powered_by': 'Powered by DIMO',

  'contract.intro':
    'この契約は、DIMOプラットフォーム上の特定のデータへのアクセスと操作機能を許可するものです。',
  'contract.agreeing': '同意する内容は次のとおりです。',
  'contract.summary': '契約の概要：',
  'contract.grantor': '- 付与者：{{email}}（権限を与える側）',
  'contract.grantee': '- 被付与者：{{appName}}（権限を受け取る側）',
  'contract.permissions': '付与される権限：{{permissions}}',
  'contract.files': '要求されるファイル：{{files}}',
  'contract.files_none': 'なし',
  'contract.effective': '発効日：{{date}}',
  'contract.expiration': '有効期限：{{date}}',
  'contract.details': '詳細：',
  'contract.details_access':
    '- この許可により、被付与者は上記で指定された車両データと操作機能にアクセスできます。',
  'contract.details_template':
    '- DIMOプラットフォームが作成した契約テンプレート（バージョン1.0）です。',
  'contract.outro':
    '署名することで、両当事者はこれらの条件と指定されたアクセス範囲に同意します。',
  'contract.attachment': 'ポリシーの添付資料',
  'contract.courtesy': 'これは英語の原文の参考訳です。',
  'contract.original_note': 'これは英語の原文です。',
  'contract.view_original': '英語で表示',
  'contract.view_translation': '日本語で表示',
  'contract.permission.GetNonLocationHistory':
    '車両データ：燃料残量や走行距離など、位置情報以外の車両データ。',
  'contract.permission.ExecuteCommands':
    'コマンド：ロックやロック解除など、車両にコマンドを送信する機能。',
  'contract.permission.GetCurrentLocation': '現在地：車両の現在の位置へのアクセス。',
  'contract.permission.GetLocationHistory':
    '位置情報の履歴：車両のすべての位置情報の履歴へのアクセス。',
  'contract.permission.GetVINCredential':
    '証明情報：保険や整備記録など、保存されている証明情報や証明書へのアクセス。',
  'contract.permission.GetLiveData':
    'ストリーム：リアルタイムのデータストリームへのアクセス。',
  'contract.permission.GetRawData': '生データ：未加工のペイロードデータへのアクセス。',
  'contract.permission.GetApproximateLocation':
    'おおよその位置：車両のおおよその位置へのアクセス。',
};

export default ja;
