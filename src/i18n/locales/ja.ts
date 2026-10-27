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
  'common.try_again': '再試行',
  'common.log_out': 'ログアウト',
  'common.back_to_app': '{{appName}}に戻る',
  'common.select_placeholder': '選択してください',
  'common.search_placeholder': '入力して検索…',
  'common.app_developer_fallback': 'アプリの開発者',
  'common.error_detail': '詳細：{{detail}}',

  'loading.waiting_for_credentials': '認証情報を待っています…',
  'loading.still_working': '処理中です…',
  'loading.almost_there': 'もう少しで完了します',

  'signin.title_brand': '{{brandName}}でサインイン',
  'signin.title_default': '{{appName}}はDIMOを使ってあなたの車と接続します',
  'signin.title_alt': 'DIMOで{{appName}}にログイン',

  'email.invalid': '有効なメールアドレスを入力してください',
  'email.sharing_required':
    '続行するにはメールアドレスの共有が必要です。チェックボックスをオンにしてください。',
  'email.share_with_app': 'メールアドレスを{{appName}}と共有することに同意します',

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
  'error.invalid_credentials.title': 'アプリの認証情報が無効です',
  'error.invalid_credentials.message':
    'このアプリの認証情報に問題があります。設定や登録が正しくない可能性があります。アプリのサポート窓口にお問い合わせください。',
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
  'contract.courtesy': 'これは参考訳です。署名されるのは英語版の条件です。',
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
