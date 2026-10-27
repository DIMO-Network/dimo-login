import React, { useState } from 'react';
import { captureException } from '@sentry/react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { useUIManager } from '../../context/UIManagerContext';
import { signArbitraryMessage } from '../../services/turnkeyService';
import { sendSignatureResponseToParent } from '../../utils/txnUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { UiStates } from '../../enums';
import { useT } from '../../i18n';
import { ActionBar, Button, ErrorBox, Notice, Screen, ScreenHeader } from '../ui';
import { useAppName } from '../../hooks/useAppName';

const PREVIEW_LIMIT = 280;

/** A message (or 32-byte hash) the app wants signed, shown before signing. */
export const SignMessage: React.FC = () => {
  const t = useT();
  const { redirectUri, utm, messageData } = useDevCredentials();
  const appName = useAppName();
  const { setUiState, setComponentData, setBusy } = useUIManager();
  const { jwt, validateSession } = useAuthContext();
  const [showFull, setShowFull] = useState(false);
  const [signing, setSigning] = useState(false);
  const [failed, setFailed] = useState(false);

  const message = messageData?.message ?? '';
  const isHex = Boolean(messageData?.isHex);
  const tooLong = message.length > PREVIEW_LIMIT;
  const preview = !showFull && tooLong ? `${message.slice(0, PREVIEW_LIMIT)}…` : message;

  const onApprove = async () => {
    setFailed(false);
    setSigning(true);
    setBusy(true);
    try {
      const validSession = await validateSession();
      if (!validSession) return;

      const { signature, signer } = await signArbitraryMessage(message, isHex);

      sendSignatureResponseToParent(signature, signer, jwt!, redirectUri, () => {
        setComponentData({ signature, signer, flowKind: 'signature' });
        setUiState(UiStates.TRANSACTION_SUCCESS);
      });
    } catch (e) {
      console.log(e);
      captureException(e);
      setFailed(true);
    } finally {
      setSigning(false);
      setBusy(false);
    }
  };

  const onReject = async () => {
    sendErrorToParent(
      'User Rejected the Signature Request',
      redirectUri,
      utm,
      setUiState,
    );
  };

  const host = getRedirectHost(redirectUri);
  const actions = (
    <ActionBar>
      <Button variant="secondary" onClick={onReject} disabled={signing}>
        {t('tx.reject')}
      </Button>
      <Button onClick={onApprove} loading={signing} loadingLabel={t('sign.signing')}>
        {failed ? t('common.try_again') : t('sign.sign')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <ScreenHeader title={t('sign.title')} host={host} />
      <Notice tone="warning" title={t('sign.warning_title', { appName })}>
        {t('sign.warning_body', { host: host || appName })}
      </Notice>
      {failed && <ErrorBox title={t('sign.error')} />}
      <section className="flex flex-col gap-2">
        <h2 className="text-label text-muted">
          {isHex ? t('sign.hash') : t('sign.message')}
        </h2>
        {/* The app's own text, shown verbatim: never translated or formatted. */}
        <pre className="whitespace-pre-wrap break-all rounded-control bg-card p-3 font-mono text-code text-fg">
          {preview}
        </pre>
        {tooLong && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setShowFull((v) => !v)}
          >
            {showFull ? t('sign.show_less') : t('sign.show_full')}
          </Button>
        )}
      </section>
    </Screen>
  );
};

export default SignMessage;
